export type Role = 'member' | 'officer';

export interface MemberProfile {
  name: string;
  studentId: string;
  program: string;
  yearLabel: string;
  role: Role;
  duesPaid: boolean;
}

export interface PointsSummary {
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  eventsAttended: number;
  lastEvent: string | null;
}

export type LedgerType = 'Check-in' | 'Grant' | 'Redemption';
export type LedgerStatus = 'Verified' | 'Pending' | 'Reversed';

export interface LedgerEntry {
  id: string;
  date: string; // ISO date
  activity: string;
  type: LedgerType;
  points: number; // negative for redemptions
  status: LedgerStatus;
}

export type PerkCategory = 'Discounts' | 'Merch' | 'Partner Workshops';

export interface Perk {
  id: string;
  partner: string;
  title: string;
  category: PerkCategory;
  cost: number;
  featured?: boolean;
  terms: string[];
}

export type VoucherStatus = 'Active' | 'Expired' | 'Redeemed';

export interface Voucher {
  id: string;
  perkId: string;
  title: string;
  partner: string;
  code: string;
  expiresOn: string; // ISO date
  status: VoucherStatus;
  terms: string[];
}

export interface ScanRecord {
  id: string;
  label: string;
  at: string; // ISO timestamp
  outcome: 'Checked in' | 'Already checked in' | 'Rejected';
}

export interface MemberSearchResult {
  studentId: string;
  name: string;
  program: string;
}

export interface GrantInput {
  studentId: string;
  amount: number;
  reason: string;
  notes: string;
}

/** Result of a write. `simulated` is true when no real service was contacted. */
export interface MutationResult {
  simulated: boolean;
  message: string;
}

export class ServiceUnavailableError extends Error {
  constructor(what = 'This service') {
    super(`${what} is not connected to the member backend yet.`);
    this.name = 'ServiceUnavailableError';
  }
}

export class CheckInError extends Error {
  readonly kind: 'invalid' | 'duplicate';
  constructor(message: string, kind: 'invalid' | 'duplicate') {
    super(message);
    this.name = 'CheckInError';
    this.kind = kind;
  }
}

/**
 * Data boundary for every member screen. A real implementation should call the
 * backend (GET /members/me/id, /points/me, /points/me/history, /perks,
 * POST /perks/:id/redeem, /vouchers/me, /events/:id/checkin ...). Those routes are
 * stubs in this repo today, so only a fixture source and an "unavailable" source exist.
 */
export interface MemberDataSource {
  readonly kind: 'fixture' | 'unavailable';
  getProfile(): Promise<MemberProfile>;
  getPoints(): Promise<PointsSummary>;
  getLedger(): Promise<LedgerEntry[]>;
  getPerks(): Promise<Perk[]>;
  getVouchers(): Promise<Voucher[]>;
  getVoucher(id: string): Promise<Voucher | null>;
  getScans(): Promise<ScanRecord[]>;
  claimPerk(perkId: string): Promise<{ voucher: Voucher } & MutationResult>;
  checkIn(code: string): Promise<MutationResult>;
  searchMembers(query: string): Promise<MemberSearchResult[]>;
  grantPoints(input: GrantInput): Promise<MutationResult>;
}
