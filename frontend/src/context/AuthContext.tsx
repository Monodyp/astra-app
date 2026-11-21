import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  isDataError,
  portalData,
  type SessionUser,
  type SignInInput,
} from '../data/index.js';
import { onAuthChange, isFirebaseConfigured } from '../lib/firebase.js';

// Distinguishes why user is null:
// - 'unauthenticated': no Firebase session, normal signed-out state
// - 'unlinked': Firebase account exists but not on the member roster (409/404)
// - 'unavailable': backend/roster temporarily unreachable (503)
export type SessionError = 'unlinked' | 'unavailable' | null;

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  sessionError: SessionError;
  signIn: (input: SignInInput) => Promise<SessionUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  sessionError: null,
  signIn: () => Promise.reject(new Error('AuthProvider is missing')),
  signOut: () => Promise.resolve(),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<SessionError>(null);
  // Session epoch: incremented on account change to discard stale async results
  const epochRef = useRef(0);

  // Core restore logic: called on mount and whenever Firebase auth state changes
  const restoreFromSession = useCallback(async (epoch: number) => {
    setLoading(true);
    setSessionError(null);
    try {
      const session = await portalData.restoreSession();
      if (epochRef.current !== epoch) return; // stale — a newer session took over
      setUser(session?.user ?? null);
    } catch (err) {
      if (epochRef.current !== epoch) return;
      setUser(null);
      // Distinguish roster miss (unlinked account) from temporary outage
      if (isDataError(err)) {
        if (err.code === 'not_found' || err.code === 'forbidden') {
          setSessionError('unlinked');
        } else if (err.code === 'unavailable') {
          setSessionError('unavailable');
        } else {
          setSessionError(null);
        }
      }
    } finally {
      if (epochRef.current === epoch) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // If Firebase is configured, subscribe to auth state changes so that
    // sign-in/sign-out in another tab, token expiry, or account switches
    // are reflected without a full page reload.
    if (isFirebaseConfigured) {
      const unsubscribe = onAuthChange(() => {
        const epoch = ++epochRef.current;
        void restoreFromSession(epoch);
      });
      return unsubscribe;
    }

    // Demo / offline mode: do a single restore on mount
    const epoch = ++epochRef.current;
    void restoreFromSession(epoch);
    return undefined;
  }, [restoreFromSession]);

  const signIn = useCallback(async (input: SignInInput) => {
    const session = await portalData.signIn(input);
    epochRef.current++; // discard any in-flight restore from the Firebase listener
    setSessionError(null);
    setUser(session.user);
    return session.user;
  }, []);

  const signOut = useCallback(async () => {
    await portalData.signOut();
    epochRef.current++;
    setUser(null);
    setSessionError(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, sessionError, signIn, signOut }),
    [user, loading, sessionError, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
