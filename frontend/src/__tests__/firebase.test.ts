import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  firebaseApp,
  auth,
  googleProvider,
  getIdToken,
  signOutFirebase,
  onAuthChange,
  isFirebaseConfigured,
} from '../lib/firebase.js';

describe('Firebase Auth Library (FT-14)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports valid firebaseApp and auth instances', () => {
    expect(firebaseApp).toBeDefined();
    expect(auth).toBeDefined();
    expect(googleProvider).toBeDefined();
    expect(typeof isFirebaseConfigured).toBe('boolean');
  });

  it('getIdToken returns null when currentUser is not authenticated', async () => {
    // In test environment, auth.currentUser is initially null
    const token = await getIdToken();
    expect(token).toBeNull();
  });

  it('getIdToken calls currentUser.getIdToken when a user exists', async () => {
    const mockUser = {
      getIdToken: vi.fn().mockResolvedValue('mock-firebase-id-token'),
    };
    Object.defineProperty(auth, 'currentUser', {
      value: mockUser,
      configurable: true,
    });

    const token = await getIdToken(true);
    expect(token).toBe('mock-firebase-id-token');
    expect(mockUser.getIdToken).toHaveBeenCalledWith(true);

    // Reset currentUser to null
    Object.defineProperty(auth, 'currentUser', {
      value: null,
      configurable: true,
    });
  });

  it('provides a functioning onAuthChange subscriber', () => {
    const listener = vi.fn();
    const unsubscribe = onAuthChange(listener);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('signOutFirebase executes without throwing', async () => {
    await expect(signOutFirebase()).resolves.toBeUndefined();
  });
});
