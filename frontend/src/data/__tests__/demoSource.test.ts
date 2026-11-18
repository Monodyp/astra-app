import { describe, it, expect, beforeEach } from 'vitest';
import { DataError, type PortalDataSource } from '../contracts.js';
import { createDemoDataSource } from '../demo/demoSource.js';
import { createSeedRecords } from '../demo/fixtures.js';
import {
  RECORDS_KEY,
  createMemoryStorage,
  type KeyValueStorage,
} from '../demo/store.js';

const NOW = new Date('2026-11-18T14:45:00+08:00');

function sourceFor(storage: KeyValueStorage): PortalDataSource {
  return createDemoDataSource({ storage, now: () => NOW });
}

async function expectDataError(
  promise: Promise<unknown>,
  code: DataError['code']
) {
  await expect(promise).rejects.toBeInstanceOf(DataError);
  await promise.catch((error: DataError) => expect(error.code).toBe(code));
}

describe('demo data source', () => {
  let storage: KeyValueStorage;
  let data: PortalDataSource;

  beforeEach(() => {
    storage = createMemoryStorage();
    data = sourceFor(storage);
  });

  it('offers the three fictional accounts', async () => {
    const shortcuts = await data.listSignInShortcuts();
    expect(shortcuts.map((item) => item.id)).toEqual([
      'verified-member',
      'unverified-member',
      'officer',
    ]);
  });

  it('restores the session from the same tab storage', async () => {
    expect(await data.restoreSession()).toBeNull();
    await data.signIn({ method: 'shortcut', shortcutId: 'officer' });
    const restored = await sourceFor(storage).restoreSession();
    expect(restored?.user.role).toBe('officer');
  });

  it('signs in with a student ID and stores no password', async () => {
    const session = await data.signIn({
      method: 'credentials',
      identifier: ' 24-90001 ',
      password: 'secret-value',
    });
    expect(session.user.fullName).toBe('Verified Doe');
    const stored = [
      storage.getItem('astra-demo:session'),
      storage.getItem('astra-demo:records'),
    ].join('');
    expect(stored).not.toContain('secret-value');
  });

  it('rejects unknown credentials and Google sign-in', async () => {
    await expectDataError(
      data.signIn({
        method: 'credentials',
        identifier: '99-99999',
        password: 'x',
      }),
      'invalid_credentials'
    );
    await expectDataError(data.signIn({ method: 'google' }), 'unsupported');
  });

  it('requires a session for member operations', async () => {
    await expectDataError(data.getOverview(), 'unauthenticated');
  });

  it('rejects officer operations for a member', async () => {
    await data.signIn({ method: 'shortcut', shortcutId: 'verified-member' });
    await expectDataError(data.getCheckInStation(), 'forbidden');
    await expectDataError(data.searchMembers('Verified Doe'), 'forbidden');
    await expectDataError(
      data.grantPoints({
        memberId: 'ASTR1D-0001',
        amount: 100,
        reason: 'Workshop Attendance',
        note: '',
      }),
      'forbidden'
    );
  });

  it('keeps records but clears the session on sign-out', async () => {
    await data.signIn({ method: 'shortcut', shortcutId: 'officer' });
    await data.grantPoints({
      memberId: 'ASTR1D-0001',
      amount: 120,
      reason: 'Project Contribution',
      note: '',
    });
    await data.signOut();
    expect(await data.restoreSession()).toBeNull();

    await data.signIn({ method: 'shortcut', shortcutId: 'verified-member' });
    const overview = await data.getOverview();
    expect(overview.points).toBe(570);
    expect(overview.recentActivity[0]).toMatchObject({
      title: 'Project Contribution',
      pointsDelta: 120,
      reference: 'Granted by Officer Doe',
    });
  });

  it('reports the unverified state from the current record', async () => {
    await data.signIn({ method: 'shortcut', shortcutId: 'unverified-member' });
    const id = await data.getDigitalId();
    expect(id.membershipStatus).toBe('unverified');
    expect(id.qrValue).toBeTruthy();
  });

  it('claims a perk and updates balance, wallet, and activity together', async () => {
    await data.signIn({ method: 'shortcut', shortcutId: 'verified-member' });
    const before = await data.getOverview();
    const result = await data.claimPerk('perk-cafe-beverage');
    expect(result.status).toBe('claimed');
    if (result.status !== 'claimed') return;

    const after = await data.getOverview();
    expect(after.points).toBe(before.points - 50);
    expect(after.activeVoucherCount).toBe(before.activeVoucherCount + 1);
    expect(after.recentActivity[0].reference).toBe(result.voucher.code);
    expect(await data.getVoucher(result.voucher.id)).toEqual(result.voucher);
  });

  it('declines a claim without changing anything', async () => {
    await data.signIn({ method: 'shortcut', shortcutId: 'verified-member' });
    const before = await data.getOverview();
    const vouchersBefore = await data.listVouchers();

    const tooExpensive = await data.claimPerk('perk-hoodie');
    expect(tooExpensive).toMatchObject({
      status: 'declined',
      reason: 'insufficient_points',
    });
    const soldOut = await data.claimPerk('perk-mentor-session');
    expect(soldOut).toMatchObject({
      status: 'declined',
      reason: 'out_of_stock',
    });

    expect(await data.getOverview()).toEqual(before);
    expect(await data.listVouchers()).toEqual(vouchersBefore);
  });

  it('declines claims from an unverified member', async () => {
    await data.signIn({ method: 'shortcut', shortcutId: 'unverified-member' });
    expect(await data.claimPerk('perk-cafe-beverage')).toMatchObject({
      status: 'declined',
      reason: 'membership_inactive',
    });
  });

  it('only shows vouchers that belong to the member', async () => {
    await data.signIn({ method: 'shortcut', shortcutId: 'officer' });
    await expectDataError(data.getVoucher('V-98214'), 'not_found');
  });

  describe('check-in', () => {
    beforeEach(async () => {
      await data.signIn({ method: 'shortcut', shortcutId: 'officer' });
    });

    it('accepts a verified member once and awards points', async () => {
      const station = await data.getCheckInStation();
      const [verified] = await data.listScanSamples();
      const accepted = await data.checkIn({
        eventId: station.event.id,
        method: 'scan',
        credential: verified.credential,
      });
      expect(accepted.outcome).toBe('accepted');
      expect(accepted.roster).toHaveLength(station.roster.length + 1);
      expect(accepted.roster[0].memberName).toBe('Verified Doe');

      const duplicate = await data.checkIn({
        eventId: station.event.id,
        method: 'manual',
        studentId: '24-90001',
      });
      expect(duplicate).toMatchObject({
        outcome: 'rejected',
        reason: 'duplicate',
      });
      expect(duplicate.roster).toHaveLength(station.roster.length + 1);

      const [match] = await data.searchMembers('24-90001');
      expect(match.balance).toBe(550);
    });

    it('declines an authentic credential of an unverified member', async () => {
      const station = await data.getCheckInStation();
      const samples = await data.listScanSamples();
      const unverified = samples.find(
        (sample) => sample.label === 'Unverified Doe'
      )!;
      const result = await data.checkIn({
        eventId: station.event.id,
        method: 'scan',
        credential: unverified.credential,
      });
      expect(result).toMatchObject({
        outcome: 'rejected',
        reason: 'membership_inactive',
      });
      expect(result.roster).toEqual(station.roster);
      const [match] = await data.searchMembers('Unverified Doe');
      expect(match.balance).toBe(50);
    });

    it('rejects an unknown credential and unknown student IDs', async () => {
      const station = await data.getCheckInStation();
      expect(
        await data.checkIn({
          eventId: station.event.id,
          method: 'scan',
          credential: 'demo-qr.v1.000000000000',
        })
      ).toMatchObject({ outcome: 'rejected', reason: 'invalid_credential' });
      expect(
        await data.checkIn({
          eventId: station.event.id,
          method: 'manual',
          studentId: '99-99999',
        })
      ).toMatchObject({ outcome: 'rejected', reason: 'unknown_member' });
    });
  });

  describe('member search', () => {
    beforeEach(async () => {
      await data.signIn({ method: 'shortcut', shortcutId: 'officer' });
    });

    async function searchIds(query: string) {
      return (await data.searchMembers(query)).map((item) => item.memberId);
    }

    it('finds a member by ASTRA ID, student ID, or name', async () => {
      expect(await searchIds('ASTR1D-0001')).toEqual(['ASTR1D-0001']);
      expect(await searchIds('24-90001')).toEqual(['ASTR1D-0001']);
      expect(await searchIds('Verified Doe')).toEqual([
        'ASTR1D-0001',
        'ASTR1D-0002',
      ]);
    });

    it('matches trimmed partial input in any case', async () => {
      expect(await searchIds('  uNvErIfIeD  ')).toEqual(['ASTR1D-0002']);
      expect(await searchIds('astr1d-000')).toHaveLength(6);
      expect(await searchIds('-9001')).toEqual(['ASTR1D-0002']);
      expect(await searchIds('officer d')).toEqual(['ASTR1D-0003']);
    });

    it('returns nothing for empty or unmatched input', async () => {
      expect(await searchIds('   ')).toEqual([]);
      expect(await searchIds('Zed Unknown')).toEqual([]);
    });

    it('ranks exact ID matches first and limits the results', async () => {
      const records = createSeedRecords();
      const [mara] = records.members;
      records.members.unshift({
        ...mara,
        memberId: 'ASTR1D-00012',
        studentId: '26-90012',
        fullName: 'Rhea Tan',
        displayName: 'Rhea',
        email: 'rhea.tan@astra.example',
      });
      storage.setItem(RECORDS_KEY, JSON.stringify(records));

      expect(await searchIds('astr1d-0001')).toEqual([
        'ASTR1D-0001',
        'ASTR1D-00012',
      ]);
      expect(await searchIds('ASTR1D')).toHaveLength(6);
    });
  });

  it('validates point grants', async () => {
    await data.signIn({ method: 'shortcut', shortcutId: 'officer' });
    await expectDataError(
      data.grantPoints({
        memberId: 'ASTR1D-0001',
        amount: 0,
        reason: 'Workshop Attendance',
        note: '',
      }),
      'invalid_input'
    );
    const result = await data.grantPoints({
      memberId: 'ASTR1D-0004',
      amount: 75,
      reason: 'Event Volunteer',
      note: 'Registration desk',
    });
    expect(result).toMatchObject({
      previousBalance: 350,
      newBalance: 425,
      amount: 75,
    });
  });
});
