import { describe, it, expect, beforeEach } from 'vitest';
import type { PortalDataSource } from '../contracts.js';
import { createDemoDataSource } from '../demo/demoSource.js';
import type { DemoRecords } from '../demo/fixtures.js';
import {
  RECORDS_KEY,
  SESSION_KEY,
  createMemoryStorage,
  type KeyValueStorage,
} from '../demo/store.js';

const NOW = new Date('2026-11-18T14:45:00+08:00');

function storedRecords(storage: KeyValueStorage): DemoRecords {
  return JSON.parse(storage.getItem(RECORDS_KEY)!) as DemoRecords;
}

const V1_RECORDS = {
  version: 1,
  sequence: 200,
  currentEventId: 'EVT-WEB-2026',
  members: [
    {
      memberId: 'ASTR1D-0001',
      studentId: '24-90001',
      fullName: 'Verified Doe',
      displayName: 'Verified',
      email: 'verified.doe@astra.example',
      role: 'member',
      duesPaid: true,
      program: 'BS Computer Science',
      yearLevel: '3rd year',
      qrToken: 'demo-qr.v1.7f3a9c41e2b8',
    },
    {
      memberId: 'ASTR1D-0003',
      studentId: '23-90003',
      fullName: 'Officer Doe',
      displayName: 'Officer',
      email: 'officer.doe@astra.example',
      role: 'officer',
      duesPaid: true,
      program: 'BS Information Technology',
      yearLevel: '4th year',
      qrToken: 'demo-qr.v1.a1b2c3d4e5f6',
    },
  ],
  ledger: [
    {
      id: 'L-001',
      memberId: 'ASTR1D-0001',
      delta: 200,
      kind: 'points_granted',
      title: 'Welcome Bonus',
      reference: 'Membership activated',
      occurredAt: '2026-08-18T09:00:00+08:00',
    },
    {
      id: 'L-150',
      memberId: 'ASTR1D-0001',
      delta: 75,
      kind: 'points_granted',
      title: 'Event Volunteer',
      reference: 'Granted by Officer Doe',
      occurredAt: '2026-11-17T09:00:00+08:00',
    },
    {
      id: 'L-151',
      memberId: 'ASTR1D-0001',
      delta: -50,
      kind: 'voucher_claimed',
      title: 'Campus Cafe Free Beverage',
      reference: 'ASTR-PRK-70151',
      occurredAt: '2026-11-17T10:00:00+08:00',
    },
  ],
  perks: [
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
      stock: 29,
      claimLimit: 5,
      featured: false,
      validDays: 90,
      terms: ['Valid for one redemption by an active member.'],
    },
  ],
  vouchers: [
    {
      id: 'V-151',
      code: 'ASTR-PRK-70151',
      memberId: 'ASTR1D-0001',
      perkId: 'perk-cafe-beverage',
      claimedAt: '2026-11-17T10:00:00+08:00',
      expiresAt: '2027-02-15T10:00:00+08:00',
      redeemedAt: null,
      qrToken: 'demo-voucher.v1.70151',
    },
    {
      id: 'V-120',
      code: 'ASTR-PRK-70120',
      memberId: 'ASTR1D-0001',
      perkId: 'perk-cafe-beverage',
      claimedAt: '2026-10-01T10:00:00+08:00',
      expiresAt: '2027-01-01T10:00:00+08:00',
      redeemedAt: '2026-10-02T10:00:00+08:00',
      qrToken: 'demo-voucher.v1.70120',
    },
  ],
  events: [
    { id: 'EVT-WEB-2026', name: 'Web Foundations Workshop', points: 100 },
  ],
  attendance: [],
};

describe('demo records', () => {
  let storage: KeyValueStorage;
  let data: PortalDataSource;

  beforeEach(() => {
    storage = createMemoryStorage();
    data = createDemoDataSource({ storage, now: () => NOW });
  });

  describe('migration from version 1', () => {
    beforeEach(() => {
      storage.setItem(RECORDS_KEY, JSON.stringify(V1_RECORDS));
      storage.setItem(SESSION_KEY, JSON.stringify({ memberId: 'ASTR1D-0001' }));
    });

    it('keeps the signed-in member, balance, activity, and vouchers', async () => {
      expect((await data.restoreSession())?.user.fullName).toBe('Verified Doe');
      const overview = await data.getOverview();
      expect(overview.points).toBe(225);
      expect(overview.recentActivity.map((entry) => entry.reference)).toEqual([
        'ASTR-PRK-70151',
        'Granted by Officer Doe',
        'Membership activated',
      ]);
      const vouchers = await data.listVouchers();
      expect(vouchers.map((voucher) => [voucher.id, voucher.state])).toEqual([
        ['V-151', 'ready'],
        ['V-120', 'redeemed'],
      ]);
    });

    it('stores the migrated records in the backend shapes', async () => {
      await data.getOverview();
      const records = storedRecords(storage);
      expect(records.version).toBe(2);
      expect(records.ledger[1]).toEqual({
        id: 'L-150',
        memberId: '24-90001',
        amount: 75,
        type: 'grant',
        reason: 'Event Volunteer',
        referenceId: 'L-150',
        createdBy: 'ASTR1D-0003',
        createdAt: '2026-11-17T09:00:00+08:00',
      });
      expect(records.perks[0]).toMatchObject({
        title: 'Campus Cafe Free Beverage',
        partnerName: 'Campus Cafe',
        pointsCost: 50,
        stock: 29,
        validityDays: 90,
      });
      expect(
        records.vouchers.map((voucher) => [voucher.memberId, voucher.status])
      ).toEqual([
        ['24-90001', 'active'],
        ['24-90001', 'used'],
      ]);
    });
  });

  it('owns ledger entries and vouchers by student SR code', async () => {
    await data.signIn({ method: 'shortcut', shortcutId: 'verified-member' });
    await data.claimPerk('perk-cafe-beverage', { idempotencyKey: 'claim-1' });
    const records = storedRecords(storage);
    const voucher = records.vouchers[records.vouchers.length - 1];
    const entry = records.ledger[records.ledger.length - 1];
    expect(voucher).toMatchObject({ memberId: '24-90001', status: 'active' });
    expect(entry).toMatchObject({
      memberId: '24-90001',
      amount: -50,
      type: 'redemption',
      referenceId: voucher.code,
    });
  });

  it('never runs out of a perk with unlimited stock', async () => {
    await data.signIn({ method: 'shortcut', shortcutId: 'verified-member' });
    const catalog = await data.listPerks();
    const unlimited = catalog.perks.find(
      (perk) => perk.id === 'perk-workshop-discount'
    )!;
    const cafe = catalog.perks.find(
      (perk) => perk.id === 'perk-cafe-beverage'
    )!;
    expect(unlimited.remainingStock).toBeNull();
    expect(cafe.remainingStock).toBe(30);

    expect(
      (
        await data.claimPerk('perk-workshop-discount', {
          idempotencyKey: 'claim-2',
        })
      ).status
    ).toBe('claimed');
    await data.claimPerk('perk-cafe-beverage', { idempotencyKey: 'claim-3' });
    const after = await data.listPerks();
    expect(
      after.perks.find((perk) => perk.id === 'perk-workshop-discount')!
        .remainingStock
    ).toBeNull();
    expect(
      after.perks.find((perk) => perk.id === 'perk-cafe-beverage')!
        .remainingStock
    ).toBe(29);
    expect(storedRecords(storage).perks[0].stock).toBeNull();
  });

  it('maps stored voucher statuses to wallet states', async () => {
    await data.signIn({ method: 'shortcut', shortcutId: 'verified-member' });
    const states = Object.fromEntries(
      (await data.listVouchers()).map((voucher) => [voucher.id, voucher.state])
    );
    expect(states).toEqual({
      'V-98214': 'ready',
      'V-66319': 'redeemed',
      'V-50412': 'expired',
    });

    const later = createDemoDataSource({
      storage,
      now: () => new Date('2027-09-01T00:00:00+08:00'),
    });
    expect((await later.getVoucher('V-98214')).state).toBe('expired');
    expect(
      storedRecords(storage).vouchers.find((item) => item.id === 'V-98214')!
        .status
    ).toBe('active');
  });

  it('shows an officer grant to the recipient after sign-in', async () => {
    await data.signIn({ method: 'shortcut', shortcutId: 'officer' });
    for (const query of ['ASTR1D-0001', '24-90001', 'Verified Doe']) {
      const [match] = await data.searchMembers(query);
      expect(match.memberId).toBe('ASTR1D-0001');
    }
    const grant = await data.grantPoints({
      studentId: '24-90001',
      amount: 120,
      reason: 'Event Volunteer',
      idempotencyKey: 'grant-1',
    });
    expect(grant.balance).toEqual({ previous: 450, current: 570 });

    await data.signOut();
    await data.signIn({ method: 'shortcut', shortcutId: 'verified-member' });
    const overview = await data.getOverview();
    expect(overview.points).toBe(570);
    expect(overview.recentActivity[0]).toMatchObject({
      kind: 'points_granted',
      title: 'Event Volunteer',
      reference: 'Granted by Officer Doe',
      pointsDelta: 120,
    });
    const entry = storedRecords(storage).ledger.find(
      (item) => item.id === grant.entryId
    );
    expect(entry).toMatchObject({
      memberId: '24-90001',
      type: 'grant',
      createdBy: 'demo-auth-ASTR1D-0003',
    });
  });

  describe('retry keys', () => {
    it('replays a claim that reuses its key', async () => {
      await data.signIn({ method: 'shortcut', shortcutId: 'verified-member' });
      const key = { idempotencyKey: 'retry-1' };
      const first = await data.claimPerk('perk-cafe-beverage', key);
      const retried = await data.claimPerk('perk-cafe-beverage', key);
      expect(first).toMatchObject({ status: 'claimed', replayed: false });
      expect(retried).toMatchObject({ status: 'claimed', replayed: true });
      if (first.status !== 'claimed' || retried.status !== 'claimed') return;
      expect(retried.voucher).toEqual(first.voucher);
      expect((await data.getOverview()).points).toBe(400);
      const records = storedRecords(storage);
      expect(
        records.vouchers.filter((item) => item.idempotencyKey === 'retry-1')
      ).toHaveLength(1);
      expect(
        records.ledger.filter((item) => item.idempotencyKey === 'retry-1')
      ).toHaveLength(1);
    });

    it('rejects a claim key reused for another perk', async () => {
      await data.signIn({ method: 'shortcut', shortcutId: 'verified-member' });
      const key = { idempotencyKey: 'retry-1' };
      await data.claimPerk('perk-cafe-beverage', key);
      await expect(
        data.claimPerk('perk-sticker-pack', key)
      ).rejects.toMatchObject({ code: 'key_reused' });
      expect((await data.getOverview()).points).toBe(400);
    });

    it('gives a new claim with a new key its own voucher', async () => {
      await data.signIn({ method: 'shortcut', shortcutId: 'verified-member' });
      await data.claimPerk('perk-cafe-beverage', { idempotencyKey: 'retry-1' });
      await data.claimPerk('perk-cafe-beverage', { idempotencyKey: 'retry-2' });
      expect((await data.getOverview()).points).toBe(350);
      expect(
        storedRecords(storage).vouchers.filter(
          (item) => item.perkId === 'perk-cafe-beverage'
        )
      ).toHaveLength(3);
    });

    it('keeps claim keys separate for each member', async () => {
      await data.signIn({ method: 'shortcut', shortcutId: 'verified-member' });
      await data.claimPerk('perk-cafe-beverage', { idempotencyKey: 'retry-1' });
      await data.signOut();
      await data.signIn({ method: 'shortcut', shortcutId: 'officer' });
      const result = await data.claimPerk('perk-cafe-beverage', {
        idempotencyKey: 'retry-1',
      });
      expect(result).toMatchObject({ status: 'claimed', replayed: false });
      expect((await data.listVouchers()).map((item) => item.id)).toEqual([
        result.status === 'claimed' ? result.voucher.id : '',
      ]);
    });

    it('records a retried grant once', async () => {
      await data.signIn({ method: 'shortcut', shortcutId: 'officer' });
      const input = {
        studentId: '24-90004',
        amount: 40,
        reason: 'Event Volunteer',
        idempotencyKey: 'retry-1',
      };
      const first = await data.grantPoints(input);
      await expect(data.grantPoints(input)).rejects.toMatchObject({
        code: 'conflict',
      });
      expect(first.balance).toEqual({ previous: 350, current: 390 });
      const entries = storedRecords(storage).ledger.filter(
        (item) => item.idempotencyKey === 'retry-1'
      );
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        memberId: '24-90004',
        referenceId: 'retry-1',
      });
    });
  });
});
