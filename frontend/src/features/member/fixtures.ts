import {
  CheckInError,
  type GrantInput,
  type LedgerEntry,
  type MemberDataSource,
  type MemberProfile,
  type MemberSearchResult,
  type MutationResult,
  type Perk,
  type PointsSummary,
  type Role,
  type ScanRecord,
  type Voucher,
} from './types';

/**
 * LOCAL FIXTURE MODE - sample data only.
 * Enable with `VITE_MEMBER_FIXTURES=true` (e.g. `VITE_MEMBER_FIXTURES=true npm run dev`),
 * or in a dev build by opening any page once with `?fixtures=1` (remembered in
 * sessionStorage; `?fixtures=0` clears it). Nothing here talks to a server.
 */
export function isFixtureMode(): boolean {
  if (import.meta.env.VITE_MEMBER_FIXTURES === 'true') return true;
  if (!import.meta.env.DEV) return false;
  try {
    const q = new URLSearchParams(window.location.search).get('fixtures');
    if (q === '1') sessionStorage.setItem('astra.fixtures', '1');
    if (q === '0') sessionStorage.removeItem('astra.fixtures');
    return sessionStorage.getItem('astra.fixtures') === '1';
  } catch {
    return false;
  }
}

export const FIXTURE_CHECKIN_CODE = 'ASTRA-DEMO';

export const sampleMembers: MemberSearchResult[] = [
  { studentId: '2024-00001', name: 'Jane Doe', program: 'BS Computer Science' },
  { studentId: '2024-00002', name: 'Sample Member Two', program: 'BS Information Technology' },
  {
    studentId: '2023-00003',
    name: 'Sample Member With A Very Long Surname-Hyphenated Dela Cruz',
    program: 'BS Computer Science (Data Science Specialization Track)',
  },
];

const perks: Perk[] = [
  {
    id: 'perk-workshops',
    partner: 'Sample Partner',
    title: '10% Off All Tech Workshops & Merchandise',
    category: 'Discounts',
    cost: 100,
    featured: true,
    terms: [
      'Sample term: one voucher per member.',
      'Sample term: not combinable with other offers.',
      'Sample term: present the code to partner staff.',
    ],
  },
  {
    id: 'perk-sticker',
    partner: 'Sample Partner',
    title: 'ASTRA Sticker Pack',
    category: 'Merch',
    cost: 40,
    terms: ['Sample term: while supplies last.', 'Sample term: claim at an ASTRA booth.', 'Sample term: no cash value.'],
  },
  {
    id: 'perk-bootcamp',
    partner: 'Sample Partner',
    title: 'Intro Bootcamp Seat',
    category: 'Partner Workshops',
    cost: 450,
    terms: ['Sample term: subject to seat availability.', 'Sample term: non-transferable.', 'Sample term: schedule set by the partner.'],
  },
  {
    id: 'perk-mug',
    partner: 'Sample Partner',
    title: 'ASTRA Mug',
    category: 'Merch',
    cost: 800,
    terms: ['Sample term: while supplies last.', 'Sample term: no cash value.', 'Sample term: claim at an ASTRA booth.'],
  },
];

function seedLedger(): LedgerEntry[] {
  return [
    { id: 'l1', date: '2026-10-03', activity: 'Intro to Cloud (sample event)', type: 'Check-in', points: 50, status: 'Verified' },
    { id: 'l2', date: '2026-09-20', activity: 'Project contribution (sample)', type: 'Grant', points: 200, status: 'Verified' },
    { id: 'l3', date: '2026-09-05', activity: 'Partner Discount Pass', type: 'Redemption', points: -100, status: 'Verified' },
    { id: 'l4', date: '2026-08-28', activity: 'Orientation (sample event)', type: 'Check-in', points: 50, status: 'Pending' },
    { id: 'l5', date: '2026-08-14', activity: 'Workshop attendance (sample)', type: 'Check-in', points: 250, status: 'Verified' },
  ];
}

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

export interface FixtureControls {
  duesPaid: boolean;
  role: Role;
}

export function createFixtureSource(controls: () => FixtureControls): MemberDataSource {
  const ledger = seedLedger();
  const vouchers: Voucher[] = [
    {
      id: 'v-98214',
      perkId: 'perk-workshops',
      title: 'Partner Discount Pass',
      partner: 'Sample Partner',
      code: 'ASTR-PRK-98214',
      expiresOn: '2027-06-30',
      status: 'Active',
      terms: perks[0].terms,
    },
    {
      id: 'v-00001',
      perkId: 'perk-sticker',
      title: 'ASTRA Sticker Pack (expired sample)',
      partner: 'Sample Partner',
      code: 'ASTR-PRK-00001',
      expiresOn: '2026-01-31',
      status: 'Expired',
      terms: perks[1].terms,
    },
  ];
  const scans: ScanRecord[] = [];
  const checkedIn = new Set<string>();
  let balance = 450;
  let nextVoucher = 98215;

  const profile = (): MemberProfile => ({
    name: 'Jane Doe',
    studentId: '2024-XXXXX',
    program: 'BS Computer Science',
    yearLabel: 'BSCS 3rd Year',
    role: controls().role,
    duesPaid: controls().duesPaid,
  });

  const record = (label: string, outcome: ScanRecord['outcome']) =>
    scans.unshift({ id: `s${scans.length}`, label, at: new Date().toISOString(), outcome });

  return {
    kind: 'fixture',
    async getProfile() {
      await delay();
      return profile();
    },
    async getPoints(): Promise<PointsSummary> {
      await delay();
      return {
        balance,
        lifetimeEarned: ledger.filter((l) => l.points > 0).reduce((a, l) => a + l.points, 0),
        lifetimeRedeemed: -ledger.filter((l) => l.points < 0).reduce((a, l) => a + l.points, 0),
        eventsAttended: 6,
        lastEvent: 'Intro to Cloud',
      };
    },
    async getLedger() {
      await delay();
      return [...ledger];
    },
    async getPerks() {
      await delay();
      return perks;
    },
    async getVouchers() {
      await delay();
      return [...vouchers];
    },
    async getVoucher(id) {
      await delay(80);
      return vouchers.find((v) => v.id === id) ?? null;
    },
    async getScans() {
      await delay(80);
      return [...scans];
    },
    async claimPerk(perkId) {
      await delay(300);
      const perk = perks.find((p) => p.id === perkId);
      if (!perk) throw new Error('Perk not found.');
      if (perk.cost > balance) throw new Error('Not enough points for this perk.');
      balance -= perk.cost;
      const voucher: Voucher = {
        id: `v-${nextVoucher}`,
        perkId,
        title: perk.title,
        partner: perk.partner,
        code: `ASTR-PRK-${nextVoucher++}`,
        expiresOn: '2027-06-30',
        status: 'Active',
        terms: perk.terms,
      };
      vouchers.unshift(voucher);
      ledger.unshift({
        id: `l${ledger.length + 1}`,
        date: new Date().toISOString().slice(0, 10),
        activity: perk.title,
        type: 'Redemption',
        points: -perk.cost,
        status: 'Verified',
      });
      return { voucher, simulated: true, message: 'Simulated claim: no real voucher was issued and no real points were spent.' };
    },
    async checkIn(code): Promise<MutationResult> {
      await delay(300);
      const clean = code.trim().toUpperCase();
      if (clean !== FIXTURE_CHECKIN_CODE) {
        record(clean, 'Rejected');
        throw new CheckInError('That event code was not recognized. Check the code and try again.', 'invalid');
      }
      if (checkedIn.has(clean)) {
        record(clean, 'Already checked in');
        throw new CheckInError('You are already checked in to this event.', 'duplicate');
      }
      checkedIn.add(clean);
      record(clean, 'Checked in');
      return { simulated: true, message: 'Simulated check-in: no attendance was recorded.' };
    },
    async searchMembers(query) {
      await delay(120);
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return sampleMembers.filter((m) => m.name.toLowerCase().includes(q) || m.studentId.includes(q));
    },
    async grantPoints(_input: GrantInput) {
      await delay(300);
      return { simulated: true, message: 'Simulated grant: no points were granted.' };
    },
  };
}
