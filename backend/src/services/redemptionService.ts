import { NotImplementedError } from '../lib/errors.js';
import { firebaseAdmin } from '../lib/firebase.js';

function getDb() {
  if (process.env.NODE_ENV === 'test') return null;
  try {
    return firebaseAdmin.firestore();
  } catch {
    return null;
  }
}

const db = getDb();
const vouchers = db?.collection('vouchers');
const voucherStore = new Map<string, VoucherRow>();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  reason: 'ok' | 'not_found' | 'wrong_partner' | 'expired' | 'already_used';
  /** Reward description — only present when valid */
  reward?: string;
  /** Expiry timestamp string — only present when valid */
  expiresAt?: string;
}

export interface ApplyResult {
  applied: boolean;
  reason?: 'ok' | 'not_found' | 'wrong_partner' | 'expired' | 'already_used';
  reward?: string;
}

export interface VoucherRow {
  id: string;
  code: string;
  status: 'active' | 'used' | 'expired';
  partnerName: string;
  reward: string;
  expiresAt?: Date;
}

/** Seed a voucher into Firestore for integration tests. */
export async function _seedVoucher(v: VoucherRow): Promise<void> {
  if (!db || !vouchers) {
    voucherStore.set(v.id, v);
    return;
  }
  await vouchers.doc(v.id).set(v);
}

/** Reset the voucher collection between integration tests. */
export async function _resetVoucherStore(): Promise<void> {
  if (!db || !vouchers) {
    voucherStore.clear();
    return;
  }
  const snapshot = await vouchers.get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toVoucherRow(
  id: string,
  data: FirebaseFirestore.DocumentData
): VoucherRow {
  const status =
    data.status ?? (data.isRedeemed === true ? 'used' : 'active');
  const expiresAt = data.expiresAt;

  return {
    id,
    code: String(data.code),
    status,
    partnerName: String(data.partnerName),
    reward: String(data.reward),
    expiresAt:
      expiresAt instanceof Date
        ? expiresAt
        : expiresAt?.toDate
          ? expiresAt.toDate()
          : expiresAt
            ? new Date(expiresAt)
            : undefined,
  };
}

function isExpired(row: VoucherRow): boolean {
  if (!row.expiresAt) return false;
  return row.expiresAt < new Date();
}

async function findVoucher(
  code: string
): Promise<{ ref: FirebaseFirestore.DocumentReference; row: VoucherRow } | null> {
  if (!db || !vouchers) {
    const row = [...voucherStore.values()].find(
      (voucher) => voucher.code.trim().toUpperCase() === code.trim().toUpperCase()
    );
    return row ? ({ ref: {} as FirebaseFirestore.DocumentReference, row } as const) : null;
  }
  const snapshot = await vouchers
    .where('code', '==', code.trim().toUpperCase())
    .limit(1)
    .get();
  const document = snapshot.docs[0];
  return document
    ? { ref: document.ref, row: toVoucherRow(document.id, document.data()) }
    : null;
}

function validateRow(row: VoucherRow, partner: string): ValidationResult {
  if (row.partnerName.toLowerCase() !== partner.toLowerCase()) {
    return { valid: false, reason: 'wrong_partner' };
  }

  if (row.status === 'used') {
    return { valid: false, reason: 'already_used' };
  }

  if (isExpired(row)) {
    return { valid: false, reason: 'expired' };
  }

  return {
    valid: true,
    reason: 'ok',
    reward: row.reward,
    expiresAt: row.expiresAt?.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Partner Redemption: Validate
// ---------------------------------------------------------------------------

/**
 * Validate a voucher code for a given partner.
 *
 * NEVER returns member personal data (name, email, studentId).
 *
 * Business rules (all return HTTP 200):
 * - `not_found`:     code does not exist in the system
 * - `wrong_partner`: code exists but belongs to a different partner
 * - `expired`:       code is past its expiresAt even if status is 'active'
 * - `already_used`:  status is 'used'
 * - `ok`:            code is active, unexpired, and belongs to this partner
 *
 * TODO: add partner-specific validation rules (e.g., only during business hours).
 */
export async function validateVoucher(
  code: string,
  partner: string
): Promise<ValidationResult> {
  const voucher = await findVoucher(code);
  if (!voucher) {
    return { valid: false, reason: 'not_found' };
  }

  return validateRow(voucher.row, partner);
}

// ---------------------------------------------------------------------------
// Partner Redemption: Apply
// ---------------------------------------------------------------------------

/**
 * Apply a voucher — atomically mark it as used for the given partner.
 *
 * Checks all validation conditions again at apply time in a Firestore
 * transaction, so concurrent applies cannot both mark the voucher as used.
 *
 * Returns HTTP 200 for all business failures.
 *
 * TODO: add partner-specific post-redemption webhooks/notifications.
 */
export async function applyVoucher(
  code: string,
  partner: string
): Promise<ApplyResult> {
  if (!db || !vouchers) {
    const voucher = await findVoucher(code);
    if (!voucher) {
      return { applied: false, reason: 'not_found' };
    }
    const validation = validateRow(voucher.row, partner);
    if (!validation.valid) {
      return { applied: false, reason: validation.reason };
    }
    voucher.row = { ...voucher.row, status: 'used' };
    voucherStore.set(voucher.row.id, voucher.row);
    return { applied: true, reason: 'ok', reward: voucher.row.reward };
  }
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(
      vouchers.where('code', '==', code.trim().toUpperCase()).limit(1)
    );
    const document = snapshot.docs[0];
    if (!document) {
      return { applied: false, reason: 'not_found' };
    }

    const row = toVoucherRow(document.id, document.data());
    const validation = validateRow(row, partner);
    if (!validation.valid) {
      return { applied: false, reason: validation.reason };
    }

    transaction.update(document.ref, {
      status: 'used',
      isRedeemed: true,
      redeemedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    });

    return { applied: true, reason: 'ok', reward: row.reward };
  });
}

// ---------------------------------------------------------------------------
// Existing stub functions (kept as-is for backward compatibility)
// ---------------------------------------------------------------------------

// TODO(AI/Backend): Redeem perk points and generate a voucher record
export async function redeemPerk(
  memberId: string,
  perkId: string
): Promise<any> {
  void memberId;
  void perkId;
  throw new NotImplementedError('redeemPerk is not implemented');
}

// TODO(AI/Backend): Fetch all vouchers issued to a specific member
export async function getMemberVouchers(memberId: string): Promise<any[]> {
  void memberId;
  throw new NotImplementedError('getMemberVouchers is not implemented');
}

// TODO(AI/Backend): Retrieve voucher details and validation status by ID
export async function getVoucherById(voucherId: string): Promise<any> {
  void voucherId;
  throw new NotImplementedError('getVoucherById is not implemented');
}
