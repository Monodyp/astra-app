/**
 * FT-15: AuthContext — live session restore, Firebase reactive listener,
 * error state discrimination, and stale-response race protection.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext.js';
import * as portalDataModule from '../data/index.js';
import * as firebaseLib from '../lib/firebase.js';
import { DataError } from '../data/index.js';

// --- helpers ---
function TestConsumer() {
  const { user, loading, sessionError, signIn, signOut } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.fullName ?? 'none'}</span>
      <span data-testid="role">{user?.role ?? 'none'}</span>
      <span data-testid="error">{sessionError ?? 'none'}</span>
      <button onClick={() => void signIn({ method: 'google' })}>sign-in</button>
      <button onClick={() => void signOut()}>sign-out</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

const mockSession = (overrides = {}) => ({
  user: {
    memberId: 'ASTR1D-0042',
    studentId: '24-00001',
    fullName: 'Jane Student',
    displayName: 'Jane Student',
    email: 'student@g.batstate-u.edu.ph',
    role: 'member' as const,
    membershipStatus: 'verified' as const,
    ...overrides,
  },
});

type AuthChangeCallback = (user: import('firebase/auth').User | null) => void;

// Convenience: fires the callback immediately on subscribe (like Firebase does
// when it already has a resolved auth state) and captures it for future calls.
function mockOnAuthChange(calls: AuthChangeCallback[] = []) {
  return vi.spyOn(firebaseLib, 'onAuthChange').mockImplementation((cb) => {
    calls.push(cb);
    // Immediately fire so the useEffect's initial subscribe triggers restoreSession
    cb(null);
    return () => {};
  });
}

describe('AuthContext (FT-15)', () => {
  beforeEach(() => {
    vi.spyOn(firebaseLib, 'isFirebaseConfigured', 'get').mockReturnValue(true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- 1. Happy path: session restore ---
  it('restores an existing session and clears loading', async () => {
    vi.spyOn(portalDataModule.portalData, 'restoreSession').mockResolvedValue(
      mockSession()
    );
    mockOnAuthChange();

    renderProvider();

    expect(screen.getByTestId('loading').textContent).toBe('true');
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );
    expect(screen.getByTestId('user').textContent).toBe('Jane Student');
    expect(screen.getByTestId('error').textContent).toBe('none');
  });

  // --- 2. No session: signed-out state ---
  it('sets user to null when no session exists', async () => {
    vi.spyOn(portalDataModule.portalData, 'restoreSession').mockResolvedValue(null);
    mockOnAuthChange();

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(screen.getByTestId('error').textContent).toBe('none');
  });

  // --- 3. Unlinked account discrimination ---
  it('sets sessionError to "unlinked" on a 404 roster miss', async () => {
    vi.spyOn(portalDataModule.portalData, 'restoreSession').mockRejectedValue(
      new DataError('not_found', 'Member not found')
    );
    mockOnAuthChange();

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe('unlinked')
    );
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('sets sessionError to "unlinked" on a 409 MEMBER_LINK_REQUIRED', async () => {
    vi.spyOn(portalDataModule.portalData, 'restoreSession').mockRejectedValue(
      new DataError('forbidden', 'MEMBER_LINK_REQUIRED')
    );
    mockOnAuthChange();

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe('unlinked')
    );
  });

  // --- 4. Backend outage discrimination ---
  it('sets sessionError to "unavailable" on a backend outage', async () => {
    vi.spyOn(portalDataModule.portalData, 'restoreSession').mockRejectedValue(
      new DataError('unavailable', 'Member source unavailable')
    );
    mockOnAuthChange();

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe('unavailable')
    );
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  // --- 5. Firebase reactive listener ---
  it('re-runs session restore when Firebase auth state changes', async () => {
    const authCallbacks: AuthChangeCallback[] = [];
    mockOnAuthChange(authCallbacks);

    // First call: no session
    const restoreSpy = vi
      .spyOn(portalDataModule.portalData, 'restoreSession')
      .mockResolvedValueOnce(null);

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );
    expect(screen.getByTestId('user').textContent).toBe('none');

    // Firebase fires again (e.g. user just signed in)
    restoreSpy.mockResolvedValueOnce(mockSession());
    await act(async () => {
      authCallbacks[0]?.(null);
    });

    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('Jane Student')
    );
    expect(restoreSpy).toHaveBeenCalledTimes(2);
  });

  // --- 6. Stale response race protection ---
  it('discards the stale restore when sign-in completes first', async () => {
    const authCallbacks: AuthChangeCallback[] = [];
    mockOnAuthChange(authCallbacks);

    let resolveSlowRestore!: (v: null) => void;
    const slowRestore = new Promise<null>((res) => {
      resolveSlowRestore = res;
    });

    vi.spyOn(portalDataModule.portalData, 'restoreSession')
      .mockReturnValueOnce(slowRestore); // first call is slow

    vi.spyOn(portalDataModule.portalData, 'signIn').mockResolvedValue(
      mockSession({ fullName: 'Officer John', role: 'officer' })
    );

    renderProvider();

    // Trigger sign-in before slow restore finishes
    await act(async () => {
      screen.getByRole('button', { name: 'sign-in' }).click();
    });
    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('Officer John')
    );

    // Now let the slow restore resolve — user should NOT be overwritten
    await act(async () => {
      resolveSlowRestore(null);
    });

    expect(screen.getByTestId('user').textContent).toBe('Officer John');
  });

  // --- 7. signOut clears state ---
  it('clears user and sessionError on sign-out', async () => {
    vi.spyOn(portalDataModule.portalData, 'restoreSession').mockResolvedValue(
      mockSession()
    );
    vi.spyOn(portalDataModule.portalData, 'signOut').mockResolvedValue(undefined);
    mockOnAuthChange();

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('Jane Student')
    );

    await act(async () => {
      screen.getByRole('button', { name: 'sign-out' }).click();
    });

    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(screen.getByTestId('error').textContent).toBe('none');
  });

  // --- 8. Demo/offline mode (Firebase not configured) ---
  it('falls back to a single restore when Firebase is not configured', async () => {
    vi.spyOn(firebaseLib, 'isFirebaseConfigured', 'get').mockReturnValue(false);
    const onAuthChangeSpy = vi.spyOn(firebaseLib, 'onAuthChange');

    vi.spyOn(portalDataModule.portalData, 'restoreSession').mockResolvedValue(
      mockSession()
    );

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('Jane Student')
    );
    // onAuthChange should not be subscribed to in demo mode
    expect(onAuthChangeSpy).not.toHaveBeenCalled();
  });
});
