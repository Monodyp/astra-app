import { describe, expect, it, vi } from 'vitest';
import {
  createLiveDataSource,
  type LiveRequestFn,
} from '../live/liveSource.js';

function liveWith(bodies: Record<string, unknown>) {
  const user = {
    uid: 'fixture',
    displayName: 'Member',
    email: 'member@example.com',
    getIdToken: async () => 'fixture-token',
  };
  const request = vi.fn(async (endpoint: string) => {
    if (!(endpoint in bodies))
      throw new Error(`Unexpected endpoint ${endpoint}`);
    return { status: 200, data: bodies[endpoint] };
  }) as LiveRequestFn;
  return {
    request,
    live: createLiveDataSource({
      request,
      auth: {
        currentUser: user,
        authStateReady: async () => {},
        signInWithEmail: async () => user,
        signInWithGoogle: async () => user,
        signOut: async () => {},
      },
    }),
  };
}

describe('live portal contract repairs', () => {
  it('counts historical attendance and keeps its balance and ledger filter type', async () => {
    const { live } = liveWith({
      '/auth/me': {
        member: {
          srCode: '24-90001',
          fullName: 'Member',
          isPaid: true,
          role: 'member',
        },
      },
      '/points/me': { points: 10 },
      '/vouchers/me': { vouchers: [] },
      '/points/me/history': {
        history: [
          {
            id: 'att-1',
            memberId: '24-90001',
            type: 'event_attendance',
            amount: 10,
            reason: 'Event attendance',
            referenceId: 'event-1',
            createdAt: '2026-11-28T00:00:00Z',
          },
        ],
      },
    });
    expect(await live.getOverview()).toMatchObject({
      points: 10,
      eventsAttended: 1,
      recentActivity: [{ kind: 'event_checked_in', statusLabel: 'Checked in' }],
    });
    expect((await live.getPoints()).entries[0]).toMatchObject({
      id: 'att-1',
      type: 'attendance',
      amount: 10,
    });
  });

  it('uses the search endpoint and preserves paid status from the backend', async () => {
    const { live, request } = liveWith({
      '/members/search': {
        members: [
          {
            id: '24-90001',
            srCode: '24-90001',
            membershipId: 'ASTR1D-0042',
            fullName: 'Paid Member',
            membershipStatus: 'verified',
            currentPoints: 0,
          },
          {
            id: '24-90002',
            srCode: '24-90002',
            fullName: null,
            membershipStatus: 'unverified',
            currentPoints: 100,
          },
        ],
      },
    });
    expect(await live.searchMembers('x')).toEqual([]);
    expect(request).not.toHaveBeenCalled();
    expect(await live.searchMembers(' ASTR1D ')).toEqual([
      {
        memberId: 'ASTR1D-0042',
        studentId: '24-90001',
        fullName: 'Paid Member',
        membershipStatus: 'verified',
        balance: 0,
      },
      {
        memberId: '24-90002',
        studentId: '24-90002',
        fullName: '24-90002',
        membershipStatus: 'unverified',
        balance: 100,
      },
    ]);
    expect(request).toHaveBeenCalledWith(
      '/members/search',
      expect.objectContaining({ params: { q: 'ASTR1D' } })
    );
  });

  it('does not turn a missing expiration into the claim date', async () => {
    const { live } = liveWith({
      '/vouchers/legacy': {
        voucher: {
          id: 'legacy',
          code: 'CODE',
          status: 'used',
          createdAt: '2026-11-28T00:00:00Z',
        },
      },
    });
    expect(await live.getVoucher('legacy')).toMatchObject({
      expiresAt: null,
      state: 'redeemed',
    });
  });

  it('separates paid membership from credential provisioning', async () => {
    const { live } = liveWith({
      '/members/me/id': {
        card: {
          studentId: '24-90001',
          isPaid: true,
          qrToken: '',
          qrExpiresAt: null,
          qrStatus: 'provisioning_required',
        },
      },
    });
    expect(await live.getDigitalId()).toMatchObject({
      membershipStatus: 'verified',
      qrValue: '',
      qrExpiresAt: null,
      qrStatus: 'provisioning_required',
    });
  });
});
