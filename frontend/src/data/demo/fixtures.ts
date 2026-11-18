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

export interface DemoLedgerEntry {
  id: string;
  memberId: string;
  delta: number;
  kind: 'points_granted' | 'event_checked_in' | 'voucher_claimed';
  title: string;
  reference: string;
  occurredAt: string;
}

export interface DemoPerk {
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

export interface DemoVoucher {
  id: string;
  code: string;
  memberId: string;
  perkId: string;
  claimedAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  qrToken: string;
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
  version: 1;
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
  return {
    version: 1,
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
        'ASTR1D-0001',
        200,
        'points_granted',
        'Welcome Bonus',
        'Membership activated',
        '2026-08-18T09:00:00+08:00'
      ),
      ledger(
        'L-002',
        'ASTR1D-0001',
        100,
        'event_checked_in',
        'Intro to Cloud',
        'EVT-CLOUD-2026',
        '2026-09-12T15:00:00+08:00'
      ),
      ledger(
        'L-003',
        'ASTR1D-0001',
        100,
        'points_granted',
        'Project Contribution',
        'Granted by Officer Doe',
        '2026-10-03T11:30:00+08:00'
      ),
      ledger(
        'L-004',
        'ASTR1D-0001',
        100,
        'event_checked_in',
        'Git Essentials',
        'EVT-GIT-2026',
        '2026-10-21T14:42:00+08:00'
      ),
      ledger(
        'L-005',
        'ASTR1D-0001',
        -50,
        'voucher_claimed',
        'Campus Cafe Free Beverage',
        'ASTR-PRK-50412',
        '2026-02-10T10:15:00+08:00'
      ),
      ledger(
        'L-006',
        'ASTR1D-0002',
        50,
        'points_granted',
        'Welcome Bonus',
        'Profile created',
        '2026-09-01T09:00:00+08:00'
      ),
      ledger(
        'L-007',
        'ASTR1D-0003',
        300,
        'points_granted',
        'Officer Onboarding',
        'Membership activated',
        '2026-08-01T09:00:00+08:00'
      ),
      ledger(
        'L-008',
        'ASTR1D-0004',
        250,
        'points_granted',
        'Welcome Bonus',
        'Membership activated',
        '2026-08-20T09:00:00+08:00'
      ),
      ledger(
        'L-009',
        'ASTR1D-0004',
        100,
        'event_checked_in',
        'Web Foundations Workshop',
        'EVT-WEB-2026',
        '2026-11-18T14:31:00+08:00'
      ),
      ledger(
        'L-010',
        'ASTR1D-0005',
        150,
        'points_granted',
        'Welcome Bonus',
        'Membership activated',
        '2026-09-02T09:00:00+08:00'
      ),
      ledger(
        'L-011',
        'ASTR1D-0005',
        100,
        'event_checked_in',
        'Web Foundations Workshop',
        'EVT-WEB-2026',
        '2026-11-18T14:36:00+08:00'
      ),
      ledger(
        'L-012',
        'ASTR1D-0006',
        400,
        'points_granted',
        'Welcome Bonus',
        'Membership activated',
        '2026-08-15T09:00:00+08:00'
      ),
    ],
    perks: [
      {
        id: 'perk-workshop-discount',
        name: '10% Off All Tech Workshops & Merchandise',
        partner: 'Partner Exclusive',
        category: 'discount',
        eyebrow: 'Partner exclusive',
        headline: '10%',
        subline: 'Off your next build',
        description: 'A little boost for your next big idea.',
        bannerLabel: '10% OFF',
        cost: 100,
        stock: 40,
        claimLimit: 2,
        featured: true,
        validDays: 280,
        terms: STANDARD_TERMS,
      },
      {
        id: 'perk-sticker-pack',
        name: 'ASTRA Official Dev Sticker Pack',
        partner: 'ASTRA Originals',
        category: 'merch',
        eyebrow: 'ASTRA originals',
        headline: 'ASTRA Developers',
        subline: 'Build. Learn. Ship.',
        description: 'Make your setup unmistakably yours.',
        bannerLabel: 'ASTRA ORIGINALS',
        cost: 50,
        stock: 25,
        claimLimit: 3,
        featured: false,
        validDays: 280,
        terms: [
          'Valid for one sticker pack per voucher.',
          'Claim at the ASTRA booth during office hours.',
          'Show your digital ID together with this voucher.',
        ],
      },
      {
        id: 'perk-cafe-beverage',
        name: 'Campus Cafe Free Beverage',
        partner: 'Campus Cafe',
        category: 'food',
        eyebrow: 'Campus cafe',
        headline: 'One on us.',
        subline: 'Fuel your next idea',
        description: 'A well-earned break between builds.',
        bannerLabel: 'COFFEE BREAK',
        cost: 50,
        stock: 30,
        claimLimit: 5,
        featured: false,
        validDays: 90,
        terms: STANDARD_TERMS,
      },
      {
        id: 'perk-cloud-lab',
        name: 'Cloud Lab Seat Reservation',
        partner: 'Partner Workshops',
        category: 'workshop',
        eyebrow: 'Partner workshop',
        headline: 'Cloud Lab',
        subline: 'Reserved seat',
        description: 'Hands-on cloud deployment session with a partner team.',
        bannerLabel: 'CLOUD LAB',
        cost: 150,
        stock: 12,
        claimLimit: 1,
        featured: false,
        validDays: 60,
        terms: [
          'Valid for one seat in the next scheduled Cloud Lab.',
          'Show your digital ID at the lab entrance.',
          'Seats not claimed 10 minutes after start are released.',
        ],
      },
      {
        id: 'perk-hoodie',
        name: 'ASTRA Mission Hoodie',
        partner: 'ASTRA Originals',
        category: 'merch',
        eyebrow: 'ASTRA originals',
        headline: 'Mission Hoodie',
        subline: 'Limited run',
        description: 'Heavyweight hoodie from the ASTRA mission collection.',
        bannerLabel: 'ASTRA ORIGINALS',
        cost: 1200,
        stock: 8,
        claimLimit: 1,
        featured: false,
        validDays: 120,
        terms: [
          'Valid for one hoodie while stock lasts.',
          'Sizes are subject to availability at pickup.',
          'Show your digital ID together with this voucher.',
        ],
      },
      {
        id: 'perk-mentor-session',
        name: 'Mentor Code Review Session',
        partner: 'Partner Workshops',
        category: 'workshop',
        eyebrow: 'Partner workshop',
        headline: '1:1 Review',
        subline: 'With an industry mentor',
        description: 'Thirty minutes of feedback on a project of your choice.',
        bannerLabel: 'MENTOR 1:1',
        cost: 200,
        stock: 0,
        claimLimit: 1,
        featured: false,
        validDays: 60,
        terms: STANDARD_TERMS,
      },
      {
        id: 'perk-bookstore',
        name: '15% Off at the Campus Bookstore',
        partner: 'Campus Bookstore',
        category: 'discount',
        eyebrow: 'Partner exclusive',
        headline: '15%',
        subline: 'Off reference books',
        description: 'Stock up on the books behind your next build.',
        bannerLabel: '15% OFF',
        cost: 80,
        stock: 20,
        claimLimit: 1,
        featured: false,
        validDays: 180,
        terms: STANDARD_TERMS,
      },
    ],
    vouchers: [
      {
        id: 'V-98214',
        code: 'ASTR-PRK-98214',
        memberId: 'ASTR1D-0001',
        perkId: 'perk-bookstore',
        claimedAt: '2026-09-15T10:00:00+08:00',
        expiresAt: '2027-08-31T23:59:59+08:00',
        redeemedAt: null,
        qrToken: 'demo-voucher.v1.98214',
      },
      {
        id: 'V-66319',
        code: 'ASTR-PRK-66319',
        memberId: 'ASTR1D-0001',
        perkId: 'perk-sticker-pack',
        claimedAt: '2026-02-01T10:00:00+08:00',
        expiresAt: '2027-08-31T23:59:59+08:00',
        redeemedAt: '2026-03-08T13:20:00+08:00',
        qrToken: 'demo-voucher.v1.66319',
      },
      {
        id: 'V-50412',
        code: 'ASTR-PRK-50412',
        memberId: 'ASTR1D-0001',
        perkId: 'perk-cafe-beverage',
        claimedAt: '2026-02-10T10:15:00+08:00',
        expiresAt: '2026-02-28T23:59:59+08:00',
        redeemedAt: null,
        qrToken: 'demo-voucher.v1.50412',
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
  delta: number,
  kind: DemoLedgerEntry['kind'],
  title: string,
  reference: string,
  occurredAt: string
): DemoLedgerEntry {
  return { id, memberId, delta, kind, title, reference, occurredAt };
}

function attendance(
  id: string,
  eventId: string,
  memberId: string,
  checkedInAt: string
): DemoAttendance {
  return { id, eventId, memberId, pointsAwarded: 100, checkedInAt };
}
