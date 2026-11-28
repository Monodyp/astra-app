import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { FirestoreVoucherRepository } from '../repositories/voucherRepository.js';

function repository(records: Record<string, unknown>[]) {
  const docs = records.map((data, index) => ({ id: String(index), exists: true, data: () => data }));
  const query = { get: async () => ({ docs, empty: docs.length === 0 }), limit: () => query };
  const collection = { doc: () => ({ get: async () => docs[0] }), where: () => query };
  return new FirestoreVoucherRepository(collection as unknown as FirebaseFirestore.CollectionReference);
}

const record = { code: 'ISSUED-CODE', status: 'used', partnerName: 'Partner', reward: 'Reward', memberId: '24-90001' };

describe('Firestore voucher dates', () => {
  it('keeps issued, expiration and redemption dates after a Firestore reload', async () => {
    const createdAt = Timestamp.fromDate(new Date('2026-11-01T00:00:00Z'));
    const expiresAt = Timestamp.fromDate(new Date('2026-12-01T00:00:00Z'));
    const redeemedAt = Timestamp.fromDate(new Date('2026-11-02T00:00:00Z'));
    const repo = repository([{ ...record, createdAt, expiresAt, redeemedAt }]);
    const loaded = await repo.getById('0');
    const byCode = await repo.getByCode(record.code);
    expect(JSON.parse(JSON.stringify(loaded))).toMatchObject({
      createdAt: '2026-11-01T00:00:00.000Z', expiresAt: '2026-12-01T00:00:00.000Z', redeemedAt: '2026-11-02T00:00:00.000Z',
    });
    expect(byCode).toEqual(loaded);
  });

  it('sorts wallet records using real timestamp dates and keeps missing optional dates absent', async () => {
    const repo = repository([
      { ...record, createdAt: Timestamp.fromMillis(1), expiresAt: null },
      { ...record, createdAt: Timestamp.fromMillis(2000) },
    ]);
    const wallet = await repo.listByMember('24-90001');
    expect(wallet.map(item => item.id)).toEqual(['1', '0']);
    expect(wallet[1].expiresAt).toBeUndefined();
    expect(wallet[1].redeemedAt).toBeUndefined();
  });

  it.each([new Date('2026-11-01T00:00:00Z'), '2026-11-01T00:00:00Z'])('accepts existing serialized and Date records', async createdAt => {
    expect((await repository([{ ...record, createdAt }]).getById('0'))?.createdAt.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it.each([null, 'not-a-date'])('rejects malformed required dates instead of returning null JSON dates', async createdAt => {
    await expect(repository([{ ...record, createdAt }]).getById('0')).rejects.toBeInstanceOf(TypeError);
  });
});
