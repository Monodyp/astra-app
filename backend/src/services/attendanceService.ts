import { env } from '../config/env.js';
import { firebaseAdmin } from '../lib/firebase.js';

function getDb() {
  if (process.env.NODE_ENV === 'test') return null;
  try {
    return firebaseAdmin.firestore();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckInResult {
  awarded: boolean;
  points?: number;
  newBalance?: number;
  reason?: 'already_checked_in' | 'invalid_member' | 'points_error';
}

export interface AttendanceRecord {
  id: string;
  srCode: string;
  fullName: string;
  checkedInAt: string;
}

// ---------------------------------------------------------------------------
// In-memory store
// Used in tests and development when Firebase Data Connect is not available.
// Replace with real Data Connect SDK calls once the emulator is set up and
// `npx firebase dataconnect:sdk:generate` has been run.
// ---------------------------------------------------------------------------

interface AttendanceRow {
  id: string;
  srCode: string;
  fullName: string;
  eventId: string;
  checkedInAt: string;
}

interface MemberRow {
  srCode: string;
  fullName: string;
  points: number;
}

// Exported so tests can seed / inspect state
export const _store = {
  members: new Map<string, MemberRow>(),
  attendance: new Map<string, AttendanceRow>(), // key: `${srCode}::${eventId}`
  pointsLedger: [] as Array<{ srCode: string; amount: number; reason: string }>,
};

/** Seed default sample members and attendance into store for live dev testing. */
export function _seedDefaultData(): void {
  _store.members.set('MEM_001', {
    srCode: 'MEM_001',
    fullName: 'Sample Member (mem_001)',
    points: 10,
  });
  _store.members.set('MEM_002', {
    srCode: 'MEM_002',
    fullName: 'Second Member (mem_002)',
    points: 0,
  });
  _store.members.set('S1001', {
    srCode: 'S1001',
    fullName: 'Jane Smith',
    points: 0,
  });
  _store.members.set('24-08957', {
    srCode: '24-08957',
    fullName: 'Bryan (24-08957)',
    points: 0,
  });

  // Seed the existing attendance from Firestore screenshot
  const initialAttKey = 'MEM_001::event_001';
  _store.attendance.set(initialAttKey, {
    id: 'att_001',
    srCode: 'MEM_001',
    fullName: 'Sample Member (mem_001)',
    eventId: 'event_001',
    checkedInAt: new Date().toISOString(),
  });
}

// Initialize default seed data for server startup
_seedDefaultData();

/** Seed a member into the in-memory store (used by tests). */
export function _seedMember(srCode: string, fullName = 'Test Member'): void {
  _store.members.set(srCode.toUpperCase(), {
    srCode: srCode.toUpperCase(),
    fullName,
    points: 0,
  });
}

/** Reset store between tests. */
export function _resetStore(): void {
  _store.members.clear();
  _store.attendance.clear();
  _store.pointsLedger.length = 0;
}

// ---------------------------------------------------------------------------
// Identity resolution
// ---------------------------------------------------------------------------

/**
 * Normalize an SR code / student ID.
 *
 * TODO: integrate with qrService.verifyQrToken() for QR-based identification.
 * Currently trims whitespace and uppercases the code.
 */
export async function resolveCheckInIdentity(input: {
  srCode: string;
}): Promise<string> {
  return input.srCode.trim().toUpperCase();
}

// ---------------------------------------------------------------------------
// Core service functions
// ---------------------------------------------------------------------------

/**
 * Check in a member to an event and award attendance points.
 *
 * Business rules (HTTP 200 on all business failures):
 * - `already_checked_in`: member already attended this event
 * - `invalid_member`: srCode does not match any known member
 * - `points_error`: points write failed; attendance row is NOT saved
 *
 * TODO: replace in-memory store with real Data Connect mutations:
 *   1. `GetAttendanceByMemberEvent` query to check duplicates
 *   2. `RecordAttendance` mutation to insert row
 *   3. `grantPoints` service to insert PointsLedger entry
 */
export async function checkInMember(
  srCode: string,
  eventId: string,
  points?: number
): Promise<CheckInResult> {
  const normalizedCode = srCode.trim().toUpperCase();
  const rawCode = srCode.trim();
  const attendancePoints = points ?? parseInt(env.ATTENDANCE_POINTS, 10);
  const db = getDb();

  let memberFullName = '';
  let currentPoints = 0;
  let memberDocRef: FirebaseFirestore.DocumentReference | null = null;

  // 1. Validate member exists (check live Firestore first if connected)
  if (db) {
    try {
      let doc = await db.collection('members').doc(rawCode).get();
      if (!doc.exists && rawCode !== normalizedCode) {
        doc = await db.collection('members').doc(normalizedCode).get();
      }
      if (!doc.exists) {
        const bySr = await db
          .collection('members')
          .where('srCode', '==', rawCode)
          .limit(1)
          .get();
        if (!bySr.empty) doc = bySr.docs[0];
      }
      if (!doc.exists) {
        const byMem = await db
          .collection('members')
          .where('memberId', '==', rawCode)
          .limit(1)
          .get();
        if (!byMem.empty) doc = byMem.docs[0];
      }

      if (doc.exists) {
        const data = doc.data() || {};
        memberFullName = data.fullName || rawCode;
        currentPoints = Number(data.points || 0);
        memberDocRef = doc.ref;
      }
    } catch (err) {
      console.warn('Firestore member check error:', err);
    }
  }

  // Fallback to in-memory store
  if (!memberFullName) {
    const mem =
      _store.members.get(normalizedCode) || _store.members.get(rawCode);
    if (mem) {
      memberFullName = mem.fullName;
      currentPoints = mem.points;
    }
  }

  if (!memberFullName) {
    return { awarded: false, reason: 'invalid_member' };
  }

  // 2. Check for duplicate attendance
  if (db) {
    try {
      const existing = await db
        .collection('attendances')
        .where('eventId', '==', eventId)
        .where('memberId', 'in', [rawCode, normalizedCode])
        .limit(1)
        .get();
      if (!existing.empty) {
        return { awarded: false, reason: 'already_checked_in' };
      }
    } catch (err) {
      console.warn('Firestore duplicate check error:', err);
    }
  }

  const attendanceKey = `${normalizedCode}::${eventId}`;
  if (_store.attendance.has(attendanceKey)) {
    return { awarded: false, reason: 'already_checked_in' };
  }

  // 3. Record attendance in Firestore (if connected)
  const attendanceId = `att_${Date.now()}`;
  if (db) {
    try {
      await db.collection('attendances').add({
        attendanceId,
        eventId,
        memberId: rawCode,
        pointsEarned: attendancePoints,
        checkedInAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      });

      if (memberDocRef) {
        await memberDocRef.update({
          points:
            firebaseAdmin.firestore.FieldValue.increment(attendancePoints),
        });
      }

      await db.collection('pointsLedger').add({
        memberId: rawCode,
        amount: attendancePoints,
        reason: `Event attendance: ${eventId}`,
        createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('Firestore write error:', err);
      return { awarded: false, reason: 'points_error' };
    }
  }

  // Record attendance in in-memory store
  const attendanceRow: AttendanceRow = {
    id: attendanceId,
    srCode: rawCode,
    fullName: memberFullName,
    eventId,
    checkedInAt: new Date().toISOString(),
  };
  _store.attendance.set(attendanceKey, attendanceRow);

  const mem =
    _store.members.get(normalizedCode) || _store.members.get(rawCode);
  if (mem) {
    mem.points += attendancePoints;
    _store.pointsLedger.push({
      srCode: rawCode,
      amount: attendancePoints,
      reason: `Event attendance: ${eventId}`,
    });
  }

  return {
    awarded: true,
    points: attendancePoints,
    newBalance: currentPoints + attendancePoints,
  };
}

/**
 * Retrieve all attendance records for a given event.
 */
export async function getEventAttendance(
  eventId: string
): Promise<AttendanceRecord[]> {
  const db = getDb();
  if (db) {
    try {
      const snap = await db
        .collection('attendances')
        .where('eventId', '==', eventId)
        .get();
      if (!snap.empty) {
        return snap.docs.map((d) => {
          const data = d.data();
          const timestamp = data.checkedInAt?.toDate
            ? data.checkedInAt.toDate().toISOString()
            : new Date().toISOString();
          return {
            id: data.attendanceId || d.id,
            srCode: data.memberId || data.srCode || '',
            fullName: data.fullName || data.memberId || 'Member',
            checkedInAt: timestamp,
          };
        });
      }
    } catch (err) {
      console.warn('Firestore getEventAttendance error:', err);
    }
  }

  const records: AttendanceRecord[] = [];
  const normalizedEventId = eventId.trim().toLowerCase();
  for (const row of _store.attendance.values()) {
    if (
      row.eventId === eventId ||
      row.eventId.trim().toLowerCase() === normalizedEventId
    ) {
      records.push({
        id: row.id,
        srCode: row.srCode,
        fullName: row.fullName,
        checkedInAt: row.checkedInAt,
      });
    }
  }
  return records;
}
