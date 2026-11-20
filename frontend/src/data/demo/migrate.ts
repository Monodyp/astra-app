import type { PerkCategory, Role } from '../contracts.js';
import {
  DEMO_RECORDS_VERSION,
  SYSTEM_ACTOR,
  perkSnapshot,
  type DemoLedgerType,
  type DemoMember,
  type DemoRecords,
  type DemoVoucher,
  type DemoVoucherSnapshot,
} from './fixtures.js';

interface V1Member {
  memberId: string;
  studentId: string;
  fullName: string;
  displayName: string;
  email: string;
  role: Role;
  duesPaid: boolean;
  program: string;
  yearLevel: string;
  qrToken: string;
}

interface V1LedgerEntry {
  id: string;
  memberId: string;
  delta: number;
  kind: 'points_granted' | 'event_checked_in' | 'voucher_claimed';
  title: string;
  reference: string;
  occurredAt: string;
}

interface V1Perk {
  id: string;
  name: string;
  partner: string;
  category: PerkCategory;
  eyebrow: string;
  headline: string;
  subline: string;
  description: string;
  bannerLabel: string;
  cost: number;
  stock: number;
  claimLimit: number;
  featured: boolean;
  validDays: number;
  terms: string[];
}

interface V1Voucher {
  id: string;
  code: string;
  memberId: string;
  perkId: string;
  claimedAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  qrToken: string;
}

interface V1Records {
  version: 1;
  sequence: number;
  currentEventId: string;
  members: V1Member[];
  ledger: V1LedgerEntry[];
  perks: V1Perk[];
  vouchers: V1Voucher[];
  events: DemoRecords['events'];
  attendance: DemoRecords['attendance'];
}

type V2Voucher = Omit<DemoVoucher, keyof DemoVoucherSnapshot>;

interface V2Records extends Omit<DemoRecords, 'version' | 'vouchers'> {
  version: 2;
  vouchers: V2Voucher[];
}

const LEDGER_TYPES: Record<V1LedgerEntry['kind'], DemoLedgerType> = {
  points_granted: 'grant',
  event_checked_in: 'attendance',
  voucher_claimed: 'redemption',
};

const GRANTED_BY = 'Granted by ';

function migrateV1(records: V1Records): V2Records {
  const members: DemoMember[] = records.members.map((member) => ({
    ...member,
  }));
  const studentIdOf = (memberId: string) =>
    members.find((member) => member.memberId === memberId)?.studentId ??
    memberId;
  const memberIdByName = (fullName: string) =>
    members.find((member) => member.fullName === fullName)?.memberId;

  return {
    version: 2,
    sequence: records.sequence,
    currentEventId: records.currentEventId,
    members,
    ledger: records.ledger.map((entry) => {
      const grantedBy = entry.reference.startsWith(GRANTED_BY)
        ? memberIdByName(entry.reference.slice(GRANTED_BY.length))
        : undefined;
      const studentId = studentIdOf(entry.memberId);
      return {
        id: entry.id,
        memberId: studentId,
        amount: entry.delta,
        type: LEDGER_TYPES[entry.kind],
        reason: entry.title,
        referenceId: grantedBy ? entry.id : entry.reference,
        createdBy:
          grantedBy ??
          (entry.kind === 'voucher_claimed' ? studentId : SYSTEM_ACTOR),
        createdAt: entry.occurredAt,
      };
    }),
    perks: records.perks.map((perk) => ({
      id: perk.id,
      title: perk.name,
      partnerName: perk.partner,
      pointsCost: perk.cost,
      stock: perk.stock,
      validityDays: perk.validDays,
      category: perk.category,
      eyebrow: perk.eyebrow,
      headline: perk.headline,
      subline: perk.subline,
      description: perk.description,
      bannerLabel: perk.bannerLabel,
      claimLimit: perk.claimLimit,
      featured: perk.featured,
      terms: [...perk.terms],
    })),
    vouchers: records.vouchers.map((voucher) => ({
      id: voucher.id,
      code: voucher.code,
      memberId: studentIdOf(voucher.memberId),
      perkId: voucher.perkId,
      status: voucher.redeemedAt ? 'used' : 'active',
      createdAt: voucher.claimedAt,
      expiresAt: voucher.expiresAt,
      redeemedAt: voucher.redeemedAt,
      qrToken: voucher.qrToken,
    })),
    events: records.events,
    attendance: records.attendance,
  };
}

function migrateV2(records: V2Records): DemoRecords {
  const missing: DemoVoucherSnapshot = {
    reward: null,
    partnerName: null,
    instructions: null,
  };
  return {
    ...records,
    version: DEMO_RECORDS_VERSION,
    vouchers: records.vouchers.map((voucher) => {
      const perk = records.perks.find((item) => item.id === voucher.perkId);
      return { ...voucher, ...(perk ? perkSnapshot(perk) : missing) };
    }),
  };
}

export function migrateRecords(value: unknown): DemoRecords | null {
  if (typeof value !== 'object' || value === null || !('version' in value)) {
    return null;
  }
  if (value.version === DEMO_RECORDS_VERSION) {
    return value as DemoRecords;
  }
  if (value.version === 2) {
    return migrateV2(value as V2Records);
  }
  if (value.version === 1) {
    return migrateV2(migrateV1(value as V1Records));
  }
  return null;
}
