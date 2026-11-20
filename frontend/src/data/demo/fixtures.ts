import type { PerkCategory, Role } from '../contracts.js';

export interface DemoMember {
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

export const DEMO_RECORDS_VERSION = 3;

export const SYSTEM_ACTOR = 'system';

export type DemoLedgerType =
  | 'attendance'
  | 'grant'
  | 'redemption'
  | 'adjustment';

export interface DemoLedgerEntry {
  id: string;
  memberId: string;
  amount: number;
  type: DemoLedgerType;
  reason: string;
  referenceId: string;
  createdBy: string;
  createdAt: string;
  idempotencyKey?: string;
}

export interface DemoPerk {
  id: string;
  title: string;
  partnerName: string;
  pointsCost: number;
  stock: number | null;
  validityDays: number;
  category: PerkCategory;
  eyebrow: string;
  headline: string;
  subline: string;
  description: string;
  bannerLabel: string;
  claimLimit: number;
  featured: boolean;
  terms: string[];
}

export type DemoVoucherStatus = 'active' | 'used' | 'expired';

export interface DemoVoucher {
  id: string;
  code: string;
  memberId: string;
  perkId: string;
  status: DemoVoucherStatus;
  createdAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  qrToken: string;
  reward: string | null;
  partnerName: string | null;
  instructions: string | null;
  idempotencyKey?: string;
}

export type DemoVoucherSnapshot = Pick<
  DemoVoucher,
  'reward' | 'partnerName' | 'instructions'
>;

export function perkSnapshot(perk: DemoPerk): DemoVoucherSnapshot {
  return {
    reward: perk.title,
    partnerName: perk.partnerName,
    instructions: perk.terms.join('\n'),
  };
}

export interface DemoEvent {
  id: string;
  name: string;
  points: number;
}

export interface DemoAttendance {
  id: string;
  eventId: string;
  memberId: string;
  pointsAwarded: number;
  checkedInAt: string;
}

export interface DemoRecords {
  version: typeof DEMO_RECORDS_VERSION;
  sequence: number;
  currentEventId: string;
  members: DemoMember[];
  ledger: DemoLedgerEntry[];
  perks: DemoPerk[];
  vouchers: DemoVoucher[];
  events: DemoEvent[];
  attendance: DemoAttendance[];
}

export const DEMO_SHORTCUTS = [
  {
    id: 'verified-member',
    memberId: 'ASTR1D-0001',
    label: 'Verified member',
    description: 'Verified Doe · annual dues paid',
  },
  {
    id: 'unverified-member',
    memberId: 'ASTR1D-0002',
    label: 'Unverified member',
    description: 'Unverified Doe · dues not yet paid',
  },
  {
    id: 'officer',
    memberId: 'ASTR1D-0003',
    label: 'Officer',
    description: 'Officer Doe · check-in and points tools',
  },
] as const;

export const DEMO_SCAN_SAMPLES = [
  {
    id: 'scan-verified',
    label: 'Verified Doe',
    hint: 'Sample verified member ID',
    credential: 'demo-qr.v1.7f3a9c41e2b8',
  },
  {
    id: 'scan-iris',
    label: 'Iris Cruz',
    hint: 'Sample verified member ID',
    credential: 'demo-qr.v1.c58e0d17a6f2',
  },
  {
    id: 'scan-unverified',
    label: 'Unverified Doe',
    hint: 'Sample unverified member ID',
    credential: 'demo-qr.v1.2b6d84f09c3e',
  },
  {
    id: 'scan-unknown',
    label: 'Unrecognized code',
    hint: 'A QR that no member owns',
    credential: 'demo-qr.v1.000000000000',
  },
] as const;

const STANDARD_TERMS = [
  'Valid for one redemption by an active member.',
  'Show your digital ID together with this voucher.',
  'Cannot be combined with other partner offers.',
];

function member(
  values: Omit<DemoMember, 'email'> & { emailName: string }
): DemoMember {
  const { emailName, ...rest } = values;
  return { ...rest, email: `${emailName}@astra.example` };
}

export function createSeedRecords(): DemoRecords {
  const perks: DemoPerk[] = [
    {
      id: 'perk-workshop-discount',
      title: '10% Off All Tech Workshops & Merchandise',
      partnerName: 'Partner Exclusive',
      category: 'discount',
      eyebrow: 'Partner exclusive',
      headline: '10%',
      subline: 'Off your next build',
      description: 'A little boost for your next big idea.',
      bannerLabel: '10% OFF',
      pointsCost: 100,
      stock: null,
      claimLimit: 2,
      featured: true,
      validityDays: 280,
      terms: STANDARD_TERMS,
    },
    {
      id: 'perk-sticker-pack',
      title: 'ASTRA Official Dev Sticker Pack',
      partnerName: 'ASTRA Originals',
      category: 'merch',
      eyebrow: 'ASTRA originals',
      headline: 'ASTRA Developers',
      subline: 'Build. Learn. Ship.',
      description: 'Make your setup unmistakably yours.',
      bannerLabel: 'ASTRA ORIGINALS',
      pointsCost: 50,
      stock: 25,
      claimLimit: 3,
      featured: false,
      validityDays: 280,
      terms: [
        'Valid for one sticker pack per voucher.',
        'Claim at the ASTRA booth during office hours.',
        'Show your digital ID together with this voucher.',
      ],
    },
    {
      id: 'perk-cafe-beverage',
      title: 'Campus Cafe Free Beverage',
      partnerName: 'Campus Cafe',
      category: 'food',
      eyebrow: 'Campus cafe',
      headline: 'One on us.',
      subline: 'Fuel your next idea',
      description: 'A well-earned break between builds.',
      bannerLabel: 'COFFEE BREAK',
      pointsCost: 50,
      stock: 30,
      claimLimit: 5,
      featured: false,
      validityDays: 90,
      terms: STANDARD_TERMS,
    },
    {
      id: 'perk-cloud-lab',
      title: 'Cloud Lab Seat Reservation',
      partnerName: 'Partner Workshops',
      category: 'workshop',
      eyebrow: 'Partner workshop',
      headline: 'Cloud Lab',
      subline: 'Reserved seat',
      description: 'Hands-on cloud deployment session with a partner team.',
      bannerLabel: 'CLOUD LAB',
      pointsCost: 150,
      stock: 12,
      claimLimit: 1,
      featured: false,
      validityDays: 60,
      terms: [
        'Valid for one seat in the next scheduled Cloud Lab.',
        'Show your digital ID at the lab entrance.',
        'Seats not claimed 10 minutes after start are released.',
      ],
    },
    {
      id: 'perk-hoodie',
      title: 'ASTRA Mission Hoodie',
      partnerName: 'ASTRA Originals',
      category: 'merch',
      eyebrow: 'ASTRA originals',
      headline: 'Mission Hoodie',
      subline: 'Limited run',
      description: 'Heavyweight hoodie from the ASTRA mission collection.',
      bannerLabel: 'ASTRA ORIGINALS',
      pointsCost: 1200,
      stock: 8,
      claimLimit: 1,
      featured: false,
      validityDays: 120,
      terms: [
        'Valid for one hoodie while stock lasts.',
        'Sizes are subject to availability at pickup.',
        'Show your digital ID together with this voucher.',
      ],
    },
    {
      id: 'perk-mentor-session',
      title: 'Mentor Code Review Session',
      partnerName: 'Partner Workshops',
      category: 'workshop',
      eyebrow: 'Partner workshop',
      headline: '1:1 Review',
      subline: 'With an industry mentor',
      description: 'Thirty minutes of feedback on a project of your choice.',
      bannerLabel: 'MENTOR 1:1',
      pointsCost: 200,
      stock: 0,
      claimLimit: 1,
      featured: false,
      validityDays: 60,
      terms: STANDARD_TERMS,
    },
    {
      id: 'perk-bookstore',
      title: '15% Off at the Campus Bookstore',
      partnerName: 'Campus Bookstore',
      category: 'discount',
      eyebrow: 'Partner exclusive',
      headline: '15%',
      subline: 'Off reference books',
      description: 'Stock up on the books behind your next build.',
      bannerLabel: '15% OFF',
      pointsCost: 80,
      stock: 20,
      claimLimit: 1,
      featured: false,
      validityDays: 180,
      terms: STANDARD_TERMS,
    },
  ];
  const snapshotOf = (perkId: string) =>
    perkSnapshot(perks.find((perk) => perk.id === perkId)!);
  return {
    version: DEMO_RECORDS_VERSION,
    sequence: 100,
    currentEventId: 'EVT-WEB-2026',
    members: [
      member({
        memberId: 'ASTR1D-0001',
        studentId: '24-90001',
        fullName: 'Verified Doe',
        displayName: 'Verified',
        emailName: 'verified.doe',
        role: 'member',
        duesPaid: true,
        program: 'BS Computer Science',
        yearLevel: '3rd year',
        qrToken: 'demo-qr.v1.7f3a9c41e2b8',
      }),
      member({
        memberId: 'ASTR1D-0002',
        studentId: '24-90010',
        fullName: 'Unverified Doe',
        displayName: 'Unverified',
        emailName: 'unverified.doe',
        role: 'member',
        duesPaid: false,
        program: 'BS Information Technology',
        yearLevel: '2nd year',
        qrToken: 'demo-qr.v1.2b6d84f09c3e',
      }),
      member({
        memberId: 'ASTR1D-0003',
        studentId: '23-90003',
        fullName: 'Officer Doe',
        displayName: 'Officer',
        emailName: 'officer.doe',
        role: 'officer',
        duesPaid: true,
        program: 'BS Computer Engineering',
        yearLevel: '4th year',
        qrToken: 'demo-qr.v1.9e1f53b7d204',
      }),
      member({
        memberId: 'ASTR1D-0004',
        studentId: '24-90004',
        fullName: 'Iris Cruz',
        displayName: 'Iris',
        emailName: 'iris.cruz',
        role: 'member',
        duesPaid: true,
        program: 'BS Computer Science',
        yearLevel: '2nd year',
        qrToken: 'demo-qr.v1.c58e0d17a6f2',
      }),
      member({
        memberId: 'ASTR1D-0005',
        studentId: '25-90005',
        fullName: 'Paolo Lim',
        displayName: 'Paolo',
        emailName: 'paolo.lim',
        role: 'member',
        duesPaid: true,
        program: 'BS Information Technology',
        yearLevel: '1st year',
        qrToken: 'demo-qr.v1.41a7e9d3c0b6',
      }),
      member({
        memberId: 'ASTR1D-0006',
        studentId: '23-90006',
        fullName: 'Nina Garcia',
        displayName: 'Nina',
        emailName: 'nina.garcia',
        role: 'member',
        duesPaid: true,
        program: 'BS Computer Science',
        yearLevel: '4th year',
        qrToken: 'demo-qr.v1.f0c2b85e7a19',
      }),
    ],
    ledger: [
      ledger(
        'L-001',
        '24-90001',
        200,
        'grant',
        'Welcome Bonus',
        'Membership activated',
        SYSTEM_ACTOR,
        '2026-08-18T09:00:00+08:00'
      ),
      ledger(
        'L-002',
        '24-90001',
        100,
        'attendance',
        'Intro to Cloud',
        'EVT-CLOUD-2026',
        'ASTR1D-0003',
        '2026-09-12T15:00:00+08:00'
      ),
      ledger(
        'L-003',
        '24-90001',
        100,
        'grant',
        'Project Contribution',
        'L-003',
        'ASTR1D-0003',
        '2026-10-03T11:30:00+08:00'
      ),
      ledger(
        'L-004',
        '24-90001',
        100,
        'attendance',
        'Git Essentials',
        'EVT-GIT-2026',
        'ASTR1D-0003',
        '2026-10-21T14:42:00+08:00'
      ),
      ledger(
        'L-005',
        '24-90001',
        -50,
        'redemption',
        'Campus Cafe Free Beverage',
        'ASTR-PRK-50412',
        '24-90001',
        '2026-02-10T10:15:00+08:00'
      ),
      ledger(
        'L-006',
        '24-90010',
        50,
        'grant',
        'Welcome Bonus',
        'Profile created',
        SYSTEM_ACTOR,
        '2026-09-01T09:00:00+08:00'
      ),
      ledger(
        'L-007',
        '23-90003',
        300,
        'grant',
        'Officer Onboarding',
        'Membership activated',
        SYSTEM_ACTOR,
        '2026-08-01T09:00:00+08:00'
      ),
      ledger(
        'L-008',
        '24-90004',
        250,
        'grant',
        'Welcome Bonus',
        'Membership activated',
        SYSTEM_ACTOR,
        '2026-08-20T09:00:00+08:00'
      ),
      ledger(
        'L-009',
        '24-90004',
        100,
        'attendance',
        'Web Foundations Workshop',
        'EVT-WEB-2026',
        'ASTR1D-0003',
        '2026-11-18T14:31:00+08:00'
      ),
      ledger(
        'L-010',
        '25-90005',
        150,
        'grant',
        'Welcome Bonus',
        'Membership activated',
        SYSTEM_ACTOR,
        '2026-09-02T09:00:00+08:00'
      ),
      ledger(
        'L-011',
        '25-90005',
        100,
        'attendance',
        'Web Foundations Workshop',
        'EVT-WEB-2026',
        'ASTR1D-0003',
        '2026-11-18T14:36:00+08:00'
      ),
      ledger(
        'L-012',
        '23-90006',
        400,
        'grant',
        'Welcome Bonus',
        'Membership activated',
        SYSTEM_ACTOR,
        '2026-08-15T09:00:00+08:00'
      ),
    ],
    perks,
    vouchers: [
      {
        id: 'V-98214',
        code: 'ASTR-PRK-98214',
        memberId: '24-90001',
        perkId: 'perk-bookstore',
        status: 'active',
        createdAt: '2026-09-15T10:00:00+08:00',
        expiresAt: '2027-08-31T23:59:59+08:00',
        redeemedAt: null,
        qrToken: 'demo-voucher.v1.98214',
        ...snapshotOf('perk-bookstore'),
      },
      {
        id: 'V-66319',
        code: 'ASTR-PRK-66319',
        memberId: '24-90001',
        perkId: 'perk-sticker-pack',
        status: 'used',
        createdAt: '2026-02-01T10:00:00+08:00',
        expiresAt: '2027-08-31T23:59:59+08:00',
        redeemedAt: '2026-03-08T13:20:00+08:00',
        qrToken: 'demo-voucher.v1.66319',
        ...snapshotOf('perk-sticker-pack'),
      },
      {
        id: 'V-50412',
        code: 'ASTR-PRK-50412',
        memberId: '24-90001',
        perkId: 'perk-cafe-beverage',
        status: 'expired',
        createdAt: '2026-02-10T10:15:00+08:00',
        expiresAt: '2026-02-28T23:59:59+08:00',
        redeemedAt: null,
        qrToken: 'demo-voucher.v1.50412',
        ...snapshotOf('perk-cafe-beverage'),
      },
    ],
    events: [
      { id: 'EVT-CLOUD-2026', name: 'Intro to Cloud', points: 100 },
      { id: 'EVT-GIT-2026', name: 'Git Essentials', points: 100 },
      { id: 'EVT-WEB-2026', name: 'Web Foundations Workshop', points: 100 },
    ],
    attendance: [
      attendance(
        'A-001',
        'EVT-CLOUD-2026',
        'ASTR1D-0001',
        '2026-09-12T15:00:00+08:00'
      ),
      attendance(
        'A-002',
        'EVT-GIT-2026',
        'ASTR1D-0001',
        '2026-10-21T14:42:00+08:00'
      ),
      attendance(
        'A-003',
        'EVT-WEB-2026',
        'ASTR1D-0004',
        '2026-11-18T14:31:00+08:00'
      ),
      attendance(
        'A-004',
        'EVT-WEB-2026',
        'ASTR1D-0005',
        '2026-11-18T14:36:00+08:00'
      ),
    ],
  };
}

function ledger(
  id: string,
  memberId: string,
  amount: number,
  type: DemoLedgerType,
  reason: string,
  referenceId: string,
  createdBy: string,
  createdAt: string
): DemoLedgerEntry {
  return {
    id,
    memberId,
    amount,
    type,
    reason,
    referenceId,
    createdBy,
    createdAt,
  };
}

function attendance(
  id: string,
  eventId: string,
  memberId: string,
  checkedInAt: string
): DemoAttendance {
  return { id, eventId, memberId, pointsAwarded: 100, checkedInAt };
}
