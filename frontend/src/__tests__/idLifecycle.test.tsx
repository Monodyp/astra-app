import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDigitalId } from '../features/member/useDigitalId.js';
import { portalData, type DigitalId } from '../data/index.js';

const start = Date.parse('2026-11-28T00:00:00Z');
const credential = (seconds = 300): DigitalId => ({
  fullName: 'Member',
  membershipId: 'ASTR1D-0042',
  studentId: '24-90001',
  program: 'BSCS',
  yearLevel: '3',
  roleLabel: 'Member',
  membershipStatus: 'verified',
  qrValue: `signed-${seconds}`,
  qrExpiresAt: new Date(start + seconds * 1000).toISOString(),
  qrStatus: 'ready',
  statusNote: 'Paid',
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(start);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('ID credential lifecycle', () => {
  it('renews before expiry and accepts the new credential', async () => {
    const load = vi
      .spyOn(portalData, 'getDigitalId')
      .mockResolvedValueOnce(credential())
      .mockResolvedValueOnce(credential(600));
    const { result } = renderHook(() => useDigitalId('member'));
    await act(async () => {});
    expect(result.current.qrReady).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(270_000);
    });
    expect(load).toHaveBeenCalledTimes(2);
    expect(result.current.data?.qrValue).toBe('signed-600');
  });

  it('hides an expired token after renewal fails, without looping, and supports manual recovery', async () => {
    const load = vi
      .spyOn(portalData, 'getDigitalId')
      .mockResolvedValueOnce(credential())
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce(credential(900));
    const { result } = renderHook(() => useDigitalId('member'));
    await act(async () => {});
    await act(async () => {
      await vi.advanceTimersByTimeAsync(301_000);
    });
    expect(result.current.qrReady).toBe(false);
    expect(load).toHaveBeenCalledTimes(2);
    await act(async () => result.current.reload());
    expect(result.current.qrReady).toBe(true);
  });

  it('keeps provisioned membership separate from readiness and refreshes on focus', async () => {
    const load = vi
      .spyOn(portalData, 'getDigitalId')
      .mockResolvedValueOnce({
        ...credential(),
        qrValue: '',
        qrExpiresAt: null,
        qrStatus: 'provisioning_required',
      })
      .mockResolvedValueOnce(credential(600));
    const { result } = renderHook(() => useDigitalId('member'));
    await act(async () => {});
    expect(result.current.qrReady).toBe(false);
    expect(result.current.data?.membershipStatus).toBe('verified');
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(load).toHaveBeenCalledTimes(2);
    expect(result.current.qrReady).toBe(true);
  });

  it('ignores an old session response and avoids concurrent refresh requests', async () => {
    const resolves: ((id: DigitalId) => void)[] = [];
    const load = vi
      .spyOn(portalData, 'getDigitalId')
      .mockImplementation(
        () => new Promise((resolve) => resolves.push(resolve))
      );
    const { result, rerender } = renderHook(
      ({ owner }) => useDigitalId(owner),
      { initialProps: { owner: 'first' } }
    );
    act(() => {
      result.current.reload();
      window.dispatchEvent(new Event('focus'));
    });
    expect(load).toHaveBeenCalledTimes(1);
    rerender({ owner: 'second' });
    await act(async () =>
      resolves[1]({ ...credential(), fullName: 'Second member' })
    );
    await act(async () =>
      resolves[0]({ ...credential(), fullName: 'First member' })
    );
    expect(result.current.data?.fullName).toBe('Second member');
  });
});
