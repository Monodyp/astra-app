import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { FirestoreLedgerRepository, InMemoryLedgerRepository } from '../repositories/ledgerRepository.js';

describe('attendance ledger compatibility', () => {
  it('reads legacy Firestore attendance without changing its identity or balance', async () => {
    const records = [
      { memberId: '24-90001', type: 'event_attendance', amount: 10, createdAt: Timestamp.fromMillis(1000) },
      { memberId: '24-90001', type: 'attendance', amount: 20, createdAt: Timestamp.fromMillis(2000) },
    ];
    const repo = Object.create(FirestoreLedgerRepository.prototype) as FirestoreLedgerRepository;
    Object.assign(repo, { collection: { where: () => ({ get: async () => ({ docs: records.map((data, i) => ({ id: `entry-${i}`, data: () => data })) }) }) } });
    expect((await repo.listByMember('24-90001')).map(entry => [entry.id, entry.type])).toEqual([
      ['entry-1', 'attendance'], ['entry-0', 'attendance'],
    ]);
    expect(await repo.getBalance('24-90001')).toBe(30);
  });

  it('normalizes legacy input once and preserves duplicate detection', async () => {
    const repo = new InMemoryLedgerRepository();
    const input = { id: 'attendance-1', memberId: '24-90001', type: 'event_attendance' as const, amount: 10, reason: 'Attendance', referenceId: 'event-1', officerId: 'officer', createdBy: 'officer' };
    expect((await repo.create(input)).type).toBe('attendance');
    await expect(repo.create(input)).rejects.toThrow();
    expect(await repo.getBalance(input.memberId)).toBe(10);
  });
});
