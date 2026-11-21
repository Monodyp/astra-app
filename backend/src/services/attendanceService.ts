import { env } from '../config/env.js';
import { firebaseAdmin } from '../lib/firebase.js';
import { createHash } from 'node:crypto';
import { getConfiguredMemberService } from '../config/members.js';
import { normalizeSrCode } from './members.js';
import {
  matchesMemberQrReference,
  verifyQrToken,
} from './qrService.js';

function getDb() {
  if (process.env.NODE_ENV === 'test') return null;
  return firebaseAdmin.firestore();
}

export class AttendanceServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'AttendanceServiceError';
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckInResult {
  awarded: boolean;
  points?: number;
  newBalance?: number;
  reason?: 'already_checked_in' | 'invalid_member' | 'inactive_member' | 'invalid_event' | 'points_error';
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
  controlNumber?: string | null;
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

/** Seed a member into the in-memory store (used by tests). */
export function _seedMember(
  srCode: string,
  fullName = 'Test Member',
  controlNumber: string | null = null
): void {
  _store.members.set(srCode.toUpperCase(), {
    srCode: srCode.toUpperCase(),
    fullName,
    points: 0,
    controlNumber,
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
  srCode?: string;
  qrToken?: string;
}): Promise<string> {
  if (input.srCode) {
    return normalizeSrCode(input.srCode);
  }

  if (!input.qrToken) {
    throw new TypeError('srCode or qrToken is required');
  }

  const payload = await verifyQrToken(input.qrToken);
  if (process.env.NODE_ENV === 'test') {
    for (const member of _store.members.values()) {
      const controlNumber = member.controlNumber ?? member.srCode;
      if (matchesMemberQrReference(controlNumber, payload.ref)) {
        return member.srCode;
      }
    }
    return '';
  }

  try {
    const member = await getConfiguredMemberService().findByQrReference(
      payload.ref
    );
    return member?.srCode ?? '';
  } catch {
    throw new Error('MEMBER_SOURCE_UNAVAILABLE');
  }
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
  _points?: number,
  actorId = 'system'
): Promise<CheckInResult> {
  const normalizedCode = normalizeSrCode(srCode);
  const attendanceKey = `${normalizedCode}::${eventId}`;
  if (_store.attendance.has(attendanceKey)) {
    return { awarded: false, reason: 'already_checked_in' };
  }

  if (process.env.NODE_ENV !== 'test') {
    let db: FirebaseFirestore.Firestore;
    try {
      db = getDb() as FirebaseFirestore.Firestore;
    } catch {
      throw new AttendanceServiceError('Attendance service unavailable', 503);
    }
    try {
      const memberService = getConfiguredMemberService();
      const member = await memberService.findMember(normalizedCode);
      if (!member) {
        return { awarded: false, reason: 'invalid_member' };
      }
      const membership = await memberService.verifyMembership(normalizedCode);
      if (!membership.isValid) {
        return { awarded: false, reason: 'inactive_member' };
      }

      const attendanceId = createHash('sha256')
        .update(`${normalizedCode}|${eventId.trim()}`)
        .digest('hex');
      const eventRef = db.collection('events').doc(eventId.trim());
      const attendanceRef = db.collection('attendances').doc(attendanceId);
      const memberRef = db.collection('members').doc(normalizedCode);
      const ledgerRef = db.collection('pointsLedger').doc(attendanceId);

      const result = await db.runTransaction(async (transaction) => {
        const [eventSnapshot, attendanceSnapshot, memberSnapshot, ledgerSnapshot] =
          await Promise.all([
            transaction.get(eventRef),
            transaction.get(attendanceRef),
            transaction.get(memberRef),
            transaction.get(
              db.collection('pointsLedger').where('memberId', '==', normalizedCode)
            ),
          ]);

        if (!eventSnapshot.exists) {
          return { awarded: false, reason: 'invalid_event' } as CheckInResult;
        }
        if (attendanceSnapshot.exists) {
          return { awarded: false, reason: 'already_checked_in' } as CheckInResult;
        }

        const eventData = eventSnapshot.data() ?? {};
        const configuredAward = eventData.pointsAward ?? eventData.awardPoints ?? eventData.points;
        const attendancePoints =
          typeof configuredAward === 'number' && Number.isInteger(configuredAward) && configuredAward > 0
            ? configuredAward
            : parseInt(env.ATTENDANCE_POINTS, 10);
        if (!Number.isInteger(attendancePoints) || attendancePoints <= 0) {
          return { awarded: false, reason: 'points_error' } as CheckInResult;
        }

        const ledgerBalance = ledgerSnapshot.docs.reduce(
          (sum, document) => sum + (Number(document.data().amount) || 0),
          0
        );
        const memberData = memberSnapshot.data() ?? {};
        const newBalance = ledgerBalance + attendancePoints;
        const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();

        transaction.create(attendanceRef, {
          attendanceId,
          eventId: eventRef.id,
          memberId: normalizedCode,
          srCode: normalizedCode,
          fullName: member.fullName,
          pointsEarned: attendancePoints,
          checkedInAt: now,
          createdBy: actorId,
        });
        transaction.set(
          ledgerRef,
          {
            memberId: normalizedCode,
            amount: attendancePoints,
            reason: `Event attendance: ${eventRef.id}`,
            type: 'attendance',
            referenceId: attendanceId,
            createdBy: actorId,
            createdAt: now,
          },
          { merge: false }
        );
        transaction.set(
          memberRef,
          {
            srCode: normalizedCode,
            fullName: member.fullName,
            points: newBalance,
            updatedAt: now,
          },
          { merge: true }
        );

        return {
          awarded: true,
          points: attendancePoints,
          newBalance,
        } as CheckInResult;
      });
      return result;
    } catch (error) {
      if (error instanceof AttendanceServiceError) throw error;
      if (error instanceof Error && error.message === 'MEMBER_SOURCE_UNAVAILABLE') {
        throw new AttendanceServiceError('Member source unavailable', 503);
      }
      throw new AttendanceServiceError('Attendance service unavailable', 503);
    }
  }

  const mem = _store.members.get(normalizedCode);
  if (!mem) {
    return { awarded: false, reason: 'invalid_member' };
  }

  if (_store.attendance.has(attendanceKey)) {
    return { awarded: false, reason: 'already_checked_in' };
  }

  const attendancePoints = parseInt(env.ATTENDANCE_POINTS, 10);
  const attendanceId = createHash('sha256')
    .update(`${normalizedCode}|${eventId}`)
    .digest('hex');
  const attendanceRow: AttendanceRow = {
    id: attendanceId,
    srCode: normalizedCode,
    fullName: mem.fullName,
    eventId,
    checkedInAt: new Date().toISOString(),
  };
  _store.attendance.set(attendanceKey, attendanceRow);
  mem.points += attendancePoints;
  _store.pointsLedger.push({
    srCode: normalizedCode,
    amount: attendancePoints,
    reason: `Event attendance: ${eventId}`,
  });

  return {
    awarded: true,
    points: attendancePoints,
    newBalance: mem.points,
  };
}

/**
 * Retrieve all attendance records for a given event.
 */
export async function getEventAttendance(
  eventId: string
): Promise<AttendanceRecord[]> {
  if (process.env.NODE_ENV !== 'test') {
    let db: FirebaseFirestore.Firestore;
    try {
      db = getDb() as FirebaseFirestore.Firestore;
    } catch {
      throw new AttendanceServiceError('Attendance service unavailable', 503);
    }
    try {
      const snap = await db
        .collection('attendances')
        .where('eventId', '==', eventId)
        .get();
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
    } catch {
      throw new AttendanceServiceError('Attendance service unavailable', 503);
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
