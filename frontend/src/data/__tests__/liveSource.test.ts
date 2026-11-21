import { describe, it, expect, vi } from 'vitest';
import {
  createLiveDataSource,
  type LiveAuthClient,
  type LiveAuthUser,
  type LiveRequestFn,
} from '../live/liveSource.js';
import { DataError } from '../contracts.js';
import { ApiError } from '../../lib/apiClient.js';

function createFakeUser(overrides: Partial<LiveAuthUser> = {}): LiveAuthUser {
  return {
    uid: 'firebase-uid-1',
    email: 'member@astra.example',
    displayName: 'Juan Dela Cruz',
    getIdToken: vi.fn(async () => 'token-1'),
    ...overrides,
  };
}

function createFakeAuth(initialUser: LiveAuthUser | null = null): {
  user: LiveAuthUser | null;
  client: LiveAuthClient;
} {
  const state = { user: initialUser };
  return {
    get user() {
      return state.user;
    },
    client: {
      get currentUser() {
        return state.user;
      },
      authStateReady: vi.fn(async () => undefined),
      signInWithGoogle: vi.fn(async () => {
        state.user = createFakeUser();
        return state.user;
      }),
      signInWithEmail: vi.fn(async (email: string) => {
        state.user = createFakeUser({ email });
        return state.user;
      }),
      signOut: vi.fn(async () => {
        state.user = null;
      }),
    },
  };
}

describe('liveDataSource', () => {
  it('signs in with Google, verifies token at /auth/login, and hydrates /auth/me', async () => {
    const auth = createFakeAuth();
    const request: LiveRequestFn = vi.fn(async (endpoint) => {
      if (endpoint === '/auth/login') {
        return {
          status: 200,
          data: { user: { uid: 'firebase-uid-1', srCode: '24-12345', role: 'member' } },
        };
      }
      if (endpoint === '/auth/me') {
        return {
          status: 200,
          data: {
            member: {
              uid: 'firebase-uid-1',
              srCode: '24-12345',
              fullName: 'Juan Dela Cruz',
              isPaid: true,
              role: 'member',
            },
          },
        };
      }
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    }) as LiveRequestFn;

    const live = createLiveDataSource({ auth: auth.client, request });
    const session = await live.signIn({ method: 'google' });

    expect(session.user).toEqual({
      memberId: '24-12345',
      studentId: '24-12345',
      fullName: 'Juan Dela Cruz',
      displayName: 'Juan',
      email: 'member@astra.example',
      role: 'member',
      membershipStatus: 'verified',
    });
    expect(request).toHaveBeenCalledWith(
      '/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ idToken: 'token-1' }),
      })
    );
    expect(request).toHaveBeenCalledWith('/auth/me', {
      method: 'GET',
      token: 'token-1',
    });
  });

  it('requires an email address for email/password sign-in', async () => {
    const auth = createFakeAuth();
    const live = createLiveDataSource({
      auth: auth.client,
      request: vi.fn() as LiveRequestFn,
    });

    await expect(
      live.signIn({
        method: 'credentials',
        identifier: '24-12345',
        password: 'secret',
      })
    ).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('signs in with email/password through Firebase Auth', async () => {
    const auth = createFakeAuth();
    const request: LiveRequestFn = vi.fn(async (endpoint) => {
      if (endpoint === '/auth/login') {
        return { status: 200, data: { user: { uid: 'u1', srCode: '24-11111', role: 'officer' } } };
      }
      return {
        status: 200,
        data: {
          member: {
            uid: 'u1',
            srCode: '24-11111',
            fullName: 'Officer One',
            isPaid: true,
            role: 'officer',
          },
        },
      };
    }) as LiveRequestFn;

    const live = createLiveDataSource({ auth: auth.client, request });
    const session = await live.signIn({
      method: 'credentials',
      identifier: 'officer@astra.example',
      password: 'password123',
    });

    expect(session.user.role).toBe('officer');
    expect(session.user.email).toBe('officer@astra.example');
    expect(auth.client.signInWithEmail).toHaveBeenCalledWith(
      'officer@astra.example',
      'password123'
    );
  });

  it('signs out Firebase and surfaces a clear error when /auth/me returns 404 on sign-in', async () => {
    const auth = createFakeAuth();
    const request: LiveRequestFn = vi.fn(async (endpoint) => {
      if (endpoint === '/auth/login') {
        return { status: 200, data: { user: { uid: 'u1', srCode: 'u1', role: 'member' } } };
      }
      throw new ApiError(404, 'Member not found');
    }) as LiveRequestFn;

    const live = createLiveDataSource({ auth: auth.client, request });

    await expect(live.signIn({ method: 'google' })).rejects.toMatchObject({
      code: 'not_found',
    });
    expect(auth.client.signOut).toHaveBeenCalledTimes(1);
  });

  it('returns null on restoreSession when no Firebase user is active', async () => {
    const auth = createFakeAuth(null);
    const live = createLiveDataSource({
      auth: auth.client,
      request: vi.fn() as LiveRequestFn,
    });

    await expect(live.restoreSession()).resolves.toBeNull();
  });

  it('retries once with a forced refreshed token after 401 on restoreSession', async () => {
    const getIdToken = vi
      .fn<LiveAuthUser['getIdToken']>()
      .mockResolvedValueOnce('stale-token')
      .mockResolvedValueOnce('fresh-token');
    const auth = createFakeAuth(createFakeUser({ getIdToken }));
    const request: LiveRequestFn = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(401, 'Expired'))
      .mockResolvedValueOnce({
        status: 200,
        data: {
          member: {
            uid: 'firebase-uid-1',
            srCode: '24-12345',
            fullName: 'Juan Dela Cruz',
            isPaid: false,
            role: 'member',
          },
        },
      }) as LiveRequestFn;

    const live = createLiveDataSource({ auth: auth.client, request });
    const session = await live.restoreSession();

    expect(getIdToken).toHaveBeenNthCalledWith(1, false);
    expect(getIdToken).toHaveBeenNthCalledWith(2, true);
    expect(session?.user.membershipStatus).toBe('unverified');
  });

  it('hides demo shortcuts and scan samples in live mode', async () => {
    const auth = createFakeAuth();
    const live = createLiveDataSource({
      auth: auth.client,
      request: vi.fn() as LiveRequestFn,
    });

    await expect(live.listSignInShortcuts()).resolves.toEqual([]);
    await expect(live.listScanSamples()).resolves.toEqual([]);
    await expect(
      live.signIn({ method: 'shortcut', shortcutId: 'verified-member' })
    ).rejects.toBeInstanceOf(DataError);
  });

  it('maps claimPerk 201, 200 replay, and 422 key reuse semantics', async () => {
    const auth = createFakeAuth(createFakeUser());
    const voucher = {
      id: 'v-1',
      code: 'ASTRA-1234',
      status: 'active' as const,
      partnerName: 'Partner Cafe',
      reward: 'Free Coffee',
      createdAt: '2026-11-20T10:00:00Z',
    };
    const request: LiveRequestFn = vi
      .fn()
      .mockResolvedValueOnce({ status: 201, data: { voucher } })
      .mockResolvedValueOnce({ status: 200, data: { voucher } })
      .mockRejectedValueOnce(new ApiError(422, 'Idempotency key already used')) as LiveRequestFn;

    const live = createLiveDataSource({ auth: auth.client, request });

    const created = await live.claimPerk('perk-1', { idempotencyKey: 'key-1' });
    expect(created).toMatchObject({ status: 'claimed', replayed: false });

    const replayed = await live.claimPerk('perk-1', { idempotencyKey: 'key-1' });
    expect(replayed).toMatchObject({ status: 'claimed', replayed: true });

    await expect(
      live.claimPerk('perk-2', { idempotencyKey: 'key-1' })
    ).rejects.toMatchObject({ code: 'key_reused' });
  });
});
