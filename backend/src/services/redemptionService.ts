import { NotImplementedError } from '../lib/errors.js';

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

// ---------------------------------------------------------------------------
// In-memory voucher store
// Used in tests and development when Firebase Data Connect is not available.
// Replace with real Data Connect SDK calls once the emulator + SDK generate
// workflow is set up.
// ---------------------------------------------------------------------------

export interface VoucherRow {
  id: string;
  code: string;
  status: 'active' | 'used' | 'expired';
  partnerName: string;
  reward: string;
  expiresAt?: Date;
}

// Exported so tests can seed / inspect state
export const _voucherStore = new Map<string, VoucherRow>();

/** Seed a voucher into the in-memory store (used by tests). */
export function _seedVoucher(v: VoucherRow): void {
  _voucherStore.set(v.code, { ...v });
}

/** Reset voucher store between tests. */
export function _resetVoucherStore(): void {
  _voucherStore.clear();
}

/** Seed default vouchers for live dev testing */
export function _seedDefaultVouchers(): void {
  _seedVoucher({
    id: 'v1',
    code: 'NEXCAFE-001',
    status: 'active',
    partnerName: 'NexCafe',
    reward: 'Free Cold Brew',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });
  _seedVoucher({
    id: 'v2',
    code: 'BEANB-001',
    status: 'active',
    partnerName: 'BeanBrew',
    reward: '20% Off Pastry',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });
  _seedVoucher({
    id: 'v3',
    code: 'USED-001',
    status: 'used',
    partnerName: 'NexCafe',
    reward: 'Free Cold Brew',
  });
  _seedVoucher({
    id: 'v4',
    code: 'EXP-001',
    status: 'expired',
    partnerName: 'NexCafe',
    reward: 'Free Cold Brew',
    expiresAt: new Date(Date.now() - 86400000),
  });
}

// Initialize default vouchers for server startup
_seedDefaultVouchers();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isExpired(row: VoucherRow): boolean {
  if (!row.expiresAt) return false;
  return row.expiresAt < new Date();
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
 * TODO: replace _voucherStore lookup with real Data Connect `GetVoucherByCode` query.
 * TODO: add partner-specific validation rules (e.g., only during business hours).
 */
export async function validateVoucher(
  code: string,
  partner: string
): Promise<ValidationResult> {
  const row = _voucherStore.get(code.toUpperCase());

  if (!row) {
    return { valid: false, reason: 'not_found' };
  }

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
// Partner Redemption: Apply
// ---------------------------------------------------------------------------

/**
 * Apply a voucher — atomically mark it as used for the given partner.
 *
 * Checks all validation conditions again at apply time (validate-then-apply
 * pattern prevents TOCTOU races at the service layer; production PostgreSQL
 * should use `UPDATE ... WHERE status = 'active' RETURNING *` for true
 * atomicity — see TODO below).
 *
 * Returns HTTP 200 for all business failures.
 *
 * TODO: replace in-memory conditional update with a true atomic SQL update:
 *   `UPDATE vouchers SET status='used', redeemed_at=NOW()
 *    WHERE code=$1 AND status='active' RETURNING id`
 *   Then check rowCount === 1 to detect concurrent applies.
 * TODO: add partner-specific post-redemption webhooks/notifications.
 */
export async function applyVoucher(
  code: string,
  partner: string
): Promise<ApplyResult> {
  const row = _voucherStore.get(code.toUpperCase());

  if (!row) {
    return { applied: false, reason: 'not_found' };
  }

  if (row.partnerName.toLowerCase() !== partner.toLowerCase()) {
    return { applied: false, reason: 'wrong_partner' };
  }

  if (row.status === 'used') {
    return { applied: false, reason: 'already_used' };
  }

  if (isExpired(row)) {
    return { applied: false, reason: 'expired' };
  }

  // Conditional update — check status is still 'active' before mutating
  // In a real implementation this check + write would be one atomic SQL statement.
  if (row.status !== 'active') {
    return { applied: false, reason: 'already_used' };
  }

  row.status = 'used';

  return { applied: true, reason: 'ok', reward: row.reward };
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
