import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataError, portalData, type ClaimResult } from '../data/index.js';
import { beginClaim, CLAIM_TIMEOUT_MS } from '../features/rewards/claimRequest.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('bounded claim requests', () => {
  it('times out as uncertain and aborts the transport', async () => {
    const send = vi.spyOn(portalData, 'claimPerk').mockImplementation(() => new Promise(() => {}));
    const task = beginClaim('perk', 'same-key');
    const outcome = expect(task.result).rejects.toMatchObject({ code: 'unavailable' });
    await vi.advanceTimersByTimeAsync(CLAIM_TIMEOUT_MS);
    await outcome;
    expect(send.mock.calls[0][1].signal?.aborted).toBe(true);
    expect(send.mock.calls[0][1].idempotencyKey).toBe('same-key');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears its deadline on a definite response', async () => {
    const decline: ClaimResult = { status: 'declined', reason: 'out_of_stock', message: 'Out of stock' };
    vi.spyOn(portalData, 'claimPerk').mockResolvedValue(decline);
    expect(await beginClaim('perk', 'key').result).toEqual(decline);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves definite errors and clears the deadline', async () => {
    const failure = new DataError('forbidden', 'Membership inactive');
    vi.spyOn(portalData, 'claimPerk').mockRejectedValue(failure);
    await expect(beginClaim('perk', 'key').result).rejects.toBe(failure);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels on departure and ignores a late reply', async () => {
    let finish!: (result: ClaimResult) => void;
    const send = vi.spyOn(portalData, 'claimPerk').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const task = beginClaim('perk', 'key');
    const outcome = expect(task.result).rejects.toMatchObject({ code: 'unavailable' });
    task.cancel();
    await outcome;
    finish({ status: 'declined', reason: 'out_of_stock', message: 'Late' });
    await Promise.resolve();
    expect(send.mock.calls[0][1].signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
