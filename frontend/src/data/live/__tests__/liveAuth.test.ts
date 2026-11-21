import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LivePortalDataSource } from '../index.js';
import * as firebase from '../../../lib/firebase.js';
import { apiClient } from '../../../lib/apiClient.js';
import { DataError } from '../../contracts.js';

describe('Live Auth Flow (FT-16)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('performs Google Sign-In, backend verification, and hydrates profile', async () => {
    const liveSource = new LivePortalDataSource();

    vi.spyOn(firebase, 'signInWithGoogle').mockResolvedValueOnce({
      user: {
        email: 'student@g.batstate-u.edu.ph',
        uid: 'fb-user-123',
      } as unknown as import('firebase/auth').User,
      idToken: 'mock-google-id-token',
    });

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      user: { uid: 'fb-user-123', srCode: '24-00001', role: 'member' },
    });

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      member: {
        uid: 'fb-user-123',
        srCode: '24-00001',
        fullName: 'Jane Student',
        controlNumber: 'ASTR1D-0042',
        isPaid: true,
        role: 'member',
      },
    });

    const session = await liveSource.signIn({ method: 'google' });

    expect(firebase.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith('/auth/login', {
      idToken: 'mock-google-id-token',
    });
    expect(getSpy).toHaveBeenCalledWith('/auth/me');

    expect(session.user).toEqual({
      memberId: 'ASTR1D-0042',
      studentId: '24-00001',
      fullName: 'Jane Student',
      displayName: 'Jane Student',
      email: 'student@g.batstate-u.edu.ph',
      role: 'member',
      membershipStatus: 'verified',
    });
  });

  it('handles user closing the Google sign-in popup gracefully', async () => {
    const liveSource = new LivePortalDataSource();

    const popupError = new Error('Popup closed');
    Object.assign(popupError, { code: 'auth/popup-closed-by-user' });
    vi.spyOn(firebase, 'signInWithGoogle').mockRejectedValue(popupError);

    await expect(liveSource.signIn({ method: 'google' })).rejects.toThrow(
      DataError
    );
    await expect(liveSource.signIn({ method: 'google' })).rejects.toThrow(
      'Sign-in popup was closed before completing'
    );
  });

  it('restores live session when valid token exists', async () => {
    const liveSource = new LivePortalDataSource();

    vi.spyOn(firebase, 'getIdToken').mockResolvedValueOnce('valid-token');
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      member: {
        uid: 'fb-user-123',
        srCode: '24-00001',
        fullName: 'Officer John',
        controlNumber: 'ASTR1D-0005',
        isPaid: true,
        role: 'officer',
      },
    });

    const session = await liveSource.restoreSession();
    expect(session).not.toBeNull();
    expect(session?.user.role).toBe('officer');
    expect(session?.user.membershipStatus).toBe('verified');
  });

  it('returns null when no token exists during restoreSession', async () => {
    const liveSource = new LivePortalDataSource();
    vi.spyOn(firebase, 'getIdToken').mockResolvedValueOnce(null);

    const session = await liveSource.restoreSession();
    expect(session).toBeNull();
  });
});
