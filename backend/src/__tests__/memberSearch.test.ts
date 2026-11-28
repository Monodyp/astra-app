import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createMemberService, type Member } from '../services/members.js';
import * as config from '../config/members.js';
import { searchMembersHandler } from '../controllers/pointsController.js';
import { ledgerRepository } from '../repositories/ledgerRepository.js';

const roster: Member[] = Array.from({ length: 25 }, (_, index) => ({
  srCode: `24-${90000 + index}`,
  fullName: 'Member ASTR1D-0042',
  controlNumber: index === 24 ? 'ASTR1D-0042' : `ASTR1D-${String(index + 100).padStart(4, '0')}`,
}));

function fixture(members = roster) {
  const read = vi.fn(async () => ({ members, paidSrCodes: [' 24-90024 '] }));
  const service = createMemberService({ read });
  vi.spyOn(config, 'getConfiguredMemberService').mockReturnValue(service);
  return { service, read };
}

async function search(q = 'member') {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const next = vi.fn();
  await searchMembersHandler({ query: { q } } as unknown as Request, { status } as unknown as Response, next as NextFunction);
  return { json, status, next, body: json.mock.calls[0]?.[0] };
}

afterEach(() => vi.restoreAllMocks());

describe('bounded officer search', () => {
  it('ranks an exact identifier first and derives capped membership from one snapshot', async () => {
    const { service, read } = fixture();
    const page = await service.searchMemberSummaries(' astr1d-0042 ');
    expect(read).toHaveBeenCalledTimes(1);
    expect(page).toMatchObject({ limit: 20, hasMore: true });
    expect(page.members).toHaveLength(20);
    expect(page.members[0]).toMatchObject({ srCode: '24-90024', membershipStatus: 'verified' });
    expect(page.members[1]).toMatchObject({ srCode: '24-90000', membershipStatus: 'unverified' });
  });

  it('does not truncate an exact-sized result set or reuse an earlier snapshot', async () => {
    const { service, read } = fixture(roster.slice(0, 20));
    expect((await service.searchMemberSummaries('member')).hasMore).toBe(false);
    expect((await service.searchMemberSummaries('missing')).members).toEqual([]);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('reads only returned balances with at most four queries in flight', async () => {
    const { read } = fixture();
    let active = 0, peak = 0;
    const balances = vi.spyOn(ledgerRepository, 'getBalance').mockImplementation(async () => {
      peak = Math.max(peak, ++active);
      await new Promise(resolve => setTimeout(resolve, 1));
      active--;
      return 77;
    });
    const result = await search('ASTR1D-0042');
    expect(result.next).not.toHaveBeenCalled();
    expect(result.status).toHaveBeenCalledWith(200);
    expect(read).toHaveBeenCalledTimes(1);
    expect(balances).toHaveBeenCalledTimes(20);
    expect(peak).toBe(4);
    expect(result.body).toMatchObject({ hasMore: true, limit: 20 });
    expect(result.body.members[0]).toMatchObject({ srCode: '24-90024', currentPoints: 77, membershipStatus: 'verified' });
    expect(balances).not.toHaveBeenCalledWith('24-90023');
  });

  it('does not read balances when there are no matches', async () => {
    fixture();
    const balances = vi.spyOn(ledgerRepository, 'getBalance');
    const result = await search('missing');
    expect(result.body).toEqual({ members: [], limit: 20, hasMore: false });
    expect(balances).not.toHaveBeenCalled();
  });

  it.each(['x', 'x'.repeat(101)])('rejects an invalid query before reading the roster', async query => {
    const { read } = fixture();
    const result = await search(query);
    expect(result.status).toHaveBeenCalledWith(400);
    expect(read).not.toHaveBeenCalled();
  });

  it('forwards a roster failure without a partial response', async () => {
    const { read } = fixture();
    const error = new Error('Roster unavailable');
    read.mockRejectedValueOnce(error);
    const result = await search();
    expect(result.next).toHaveBeenCalledWith(error);
    expect(result.json).not.toHaveBeenCalled();
  });

  it('forwards a balance failure without a partial response', async () => {
    fixture();
    const error = new Error('Ledger unavailable');
    vi.spyOn(ledgerRepository, 'getBalance').mockRejectedValue(error);
    const result = await search();
    expect(result.next).toHaveBeenCalledWith(error);
    expect(result.json).not.toHaveBeenCalled();
  });
});
