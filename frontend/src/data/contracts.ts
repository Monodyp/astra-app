export type Role = 'member' | 'officer';

export type MembershipStatus = 'verified' | 'unverified';

export interface SessionUser {
  memberId: string;
  studentId: string;
  fullName: string;
  displayName: string;
  email: string;
  role: Role;
  membershipStatus: MembershipStatus;
}

export interface Session {
  user: SessionUser;
}

export interface SignInShortcut {
  id: string;
  label: string;
  description: string;
  identifier: string;
}

export type SignInInput =
  | { method: 'shortcut'; shortcutId: string }
  | { method: 'credentials'; identifier: string; password: string }
  | { method: 'google' };

export type ActivityKind =
  | 'points_granted'
  | 'event_checked_in'
  | 'voucher_claimed';

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  title: string;
  reference: string;
  statusLabel: string;
  pointsDelta: number;
  occurredAt: string;
}

export interface MemberOverview {
  member: {
    fullName: string;
    membershipId: string;
    studentId: string;
    program: string;
    membershipStatus: MembershipStatus;
  };
  points: number;
  eventsAttended: number;
  lastEventName: string | null;
  activeVoucherCount: number;
  activeVoucherHighlight: string | null;
  recentActivity: ActivityEntry[];
  activityCount: number;
}

export interface DigitalId {
  fullName: string;
  studentId: string;
  membershipId: string;
  program: string;
  yearLevel: string;
  roleLabel: string;
  membershipStatus: MembershipStatus;
  qrValue: string;
  statusNote: string;
}

export type PerkCategory = 'discount' | 'merch' | 'workshop' | 'food';

export interface Perk {
  id: string;
  name: string;
  partner: string;
  category: PerkCategory;
  categoryLabel: string;
  eyebrow: string;
  headline: string;
  subline: string;
  description: string;
  cost: number;
  remainingStock: number | null;
  remainingClaims: number;
  featured: boolean;
}

export interface PerkCatalog {
  perks: Perk[];
  balance: number;
}

export type VoucherState = 'ready' | 'redeemed' | 'expired';

export interface Voucher {
  id: string;
  code: string;
  perkId: string;
  perkName: string;
  partner: string;
  category: PerkCategory;
  categoryLabel: string;
  bannerLabel: string;
  title: string;
  state: VoucherState;
  claimedAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  qrValue: string;
  terms: string[];
}

export type ClaimDeclineReason =
  | 'insufficient_points'
  | 'out_of_stock'
  | 'claim_limit'
  | 'membership_inactive';

export type ClaimResult =
  | { status: 'claimed'; voucher: Voucher; balance: number }
  | {
      status: 'declined';
      reason: ClaimDeclineReason;
      message: string;
      balance: number;
    };

export interface CheckInEvent {
  id: string;
  name: string;
  points: number;
}

export interface AttendanceRecord {
  id: string;
  memberName: string;
  studentId: string;
  pointsAwarded: number;
  checkedInAt: string;
}

export interface CheckInStation {
  event: CheckInEvent;
  roster: AttendanceRecord[];
}

export interface ScanSample {
  id: string;
  label: string;
  hint: string;
  credential: string;
}

export type CheckInInput =
  | { eventId: string; method: 'scan'; credential: string }
  | { eventId: string; method: 'manual'; studentId: string };

export type CheckInRejection =
  | 'duplicate'
  | 'membership_inactive'
  | 'unknown_member'
  | 'invalid_credential';

export type CheckInResult =
  | {
      outcome: 'accepted';
      record: AttendanceRecord;
      roster: AttendanceRecord[];
      message: string;
    }
  | {
      outcome: 'rejected';
      reason: CheckInRejection;
      message: string;
      roster: AttendanceRecord[];
    };

export interface MemberSearchResult {
  memberId: string;
  fullName: string;
  studentId: string;
  membershipStatus: MembershipStatus;
  balance: number;
}

export interface GrantPointsInput {
  memberId: string;
  amount: number;
  reason: string;
  note: string;
}

export interface GrantPointsResult {
  entryId: string;
  recipient: MemberSearchResult;
  amount: number;
  reason: string;
  previousBalance: number;
  newBalance: number;
}

export const GRANT_REASONS = [
  'Workshop Attendance',
  'Project Contribution',
  'Event Volunteer',
  'Community Recognition',
] as const;

export type DataErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'invalid_input'
  | 'invalid_credentials'
  | 'unsupported'
  | 'unavailable';

export class DataError extends Error {
  readonly code: DataErrorCode;

  constructor(code: DataErrorCode, message: string) {
    super(message);
    this.name = 'DataError';
    this.code = code;
  }
}

export function isDataError(value: unknown): value is DataError {
  return value instanceof DataError;
}

export interface PortalDataSource {
  restoreSession(): Promise<Session | null>;
  listSignInShortcuts(): Promise<SignInShortcut[]>;
  signIn(input: SignInInput): Promise<Session>;
  signOut(): Promise<void>;

  getOverview(): Promise<MemberOverview>;
  getDigitalId(): Promise<DigitalId>;

  listPerks(): Promise<PerkCatalog>;
  claimPerk(perkId: string): Promise<ClaimResult>;
  listVouchers(): Promise<Voucher[]>;
  getVoucher(voucherId: string): Promise<Voucher>;

  getCheckInStation(): Promise<CheckInStation>;
  listScanSamples(): Promise<ScanSample[]>;
  checkIn(input: CheckInInput): Promise<CheckInResult>;

  searchMembers(query: string): Promise<MemberSearchResult[]>;
  grantPoints(input: GrantPointsInput): Promise<GrantPointsResult>;
}
