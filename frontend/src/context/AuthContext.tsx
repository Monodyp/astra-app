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
  restoreError: string | null;
  signIn: (input: SignInInput) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  retryRestore: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  sessionError: null,
  restoreError: null,
  signIn: () => Promise.reject(new Error('AuthProvider is missing')),
  signOut: () => Promise.resolve(),
  retryRestore: () => Promise.resolve(),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<SessionError>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const runRestore = useCallback(async () => {
    const seq = ++requestSeq.current;
    if (mounted.current) {
      setLoading(true);
      setSessionError(null);
      setRestoreError(null);
    }
    try {
      const session = await portalData.restoreSession();
      if (!mounted.current || seq !== requestSeq.current) return;
      setUser(session?.user ?? null);
      setSessionError(null);
      setRestoreError(null);
    } catch (error) {
      if (!mounted.current || seq !== requestSeq.current) return;
      setUser(null);
      if (isDataError(error)) {
        if (error.code === 'not_found' || error.code === 'forbidden') {
          setSessionError('unlinked');
          setRestoreError(error.message);
        } else if (error.code === 'unavailable') {
          setSessionError('unavailable');
          setRestoreError(error.message);
        } else {
          setSessionError(null);
          setRestoreError(error.message);
        }
      } else {
        setSessionError(null);
        setRestoreError(error instanceof Error ? error.message : 'Authentication failed');
      }
    } finally {
      if (mounted.current && seq === requestSeq.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isFirebaseConfigured) {
      const unsubscribe = onAuthChange(() => {
        void runRestore();
      });
      return unsubscribe;
    }

    void runRestore();
    return undefined;
  }, [runRestore]);

  const signIn = useCallback(async (input: SignInInput) => {
    const seq = ++requestSeq.current;
    const session = await portalData.signIn(input);
    if (mounted.current && seq === requestSeq.current) {
      setUser(session.user);
      setSessionError(null);
      setRestoreError(null);
      setLoading(false);
    }
    return session.user;
  }, []);

  const signOut = useCallback(async () => {
    const seq = ++requestSeq.current;
    await portalData.signOut();
    if (mounted.current && seq === requestSeq.current) {
      setUser(null);
      setSessionError(null);
      setRestoreError(null);
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      sessionError,
      restoreError,
      signIn,
      signOut,
      retryRestore: runRestore,
    }),
    [user, loading, sessionError, restoreError, signIn, signOut, runRestore]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
