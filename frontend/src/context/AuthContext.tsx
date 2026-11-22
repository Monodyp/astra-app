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

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  restoreError: string | null;
  signIn: (input: SignInInput) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  retryRestore: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
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
      setRestoreError(null);
    }
    try {
      const session = await portalData.restoreSession();
      if (!mounted.current || seq !== requestSeq.current) return;
      setUser(session?.user ?? null);
      setRestoreError(null);
    } catch (error) {
      if (!mounted.current || seq !== requestSeq.current) return;
      setUser(null);
      setRestoreError(
        isDataError(error) &&
          (error.code === 'not_found' || error.code === 'unavailable')
          ? error.message
          : null
      );
    } finally {
      if (mounted.current && seq === requestSeq.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void runRestore();
  }, [runRestore]);

  const signIn = useCallback(async (input: SignInInput) => {
    const seq = ++requestSeq.current;
    const session = await portalData.signIn(input);
    if (mounted.current && seq === requestSeq.current) {
      setUser(session.user);
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
      setRestoreError(null);
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      restoreError,
      signIn,
      signOut,
      retryRestore: runRestore,
    }),
    [user, loading, restoreError, signIn, signOut, runRestore]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
