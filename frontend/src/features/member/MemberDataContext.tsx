import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createFixtureSource, isFixtureMode } from './fixtures';
import { unavailableSource } from './unavailableSource';
import type { MemberDataSource, Role } from './types';

interface Ctx {
  source: MemberDataSource;
  fixture: boolean;
  duesPaid: boolean;
  role: Role;
  setDuesPaid: (v: boolean) => void;
  setRole: (v: Role) => void;
  /** changes whenever fixture controls change so screens refetch */
  version: number;
}

const MemberDataContext = createContext<Ctx | null>(null);

export const MemberDataProvider: React.FC<{
  children: React.ReactNode;
  /** tests may inject a source */
  source?: MemberDataSource;
}> = ({ children, source: injected }) => {
  const fixture = !injected && isFixtureMode();
  const [duesPaid, setDuesPaid] = useState(true);
  const [role, setRole] = useState<Role>('member');
  const controls = useRef({ duesPaid, role });
  controls.current = { duesPaid, role };

  const source = useMemo<MemberDataSource>(
    () => injected ?? (fixture ? createFixtureSource(() => controls.current) : unavailableSource),
    [injected, fixture],
  );
  const value = useMemo<Ctx>(
    () => ({
      source,
      fixture: source.kind === 'fixture',
      duesPaid,
      role,
      setDuesPaid,
      setRole,
      version: Number(duesPaid) * 2 + Number(role === 'officer'),
    }),
    [source, duesPaid, role],
  );
  return <MemberDataContext.Provider value={value}>{children}</MemberDataContext.Provider>;
};

export function useMemberData(): Ctx {
  const ctx = useContext(MemberDataContext);
  if (!ctx) throw new Error('useMemberData must be used inside MemberDataProvider');
  return ctx;
}

/** Returns the member data context if available, or null — safe to call outside MemberDataProvider. */
export function useMemberDataOrNull(): Ctx | null {
  return useContext(MemberDataContext);
}

export interface AsyncState<T> {
  status: 'loading' | 'ready' | 'error';
  data: T | null;
  error: Error | null;
  reload: () => void;
}

/** Loads data from the member source with loading/error handling. */
export function useMemberQuery<T>(
  load: (s: MemberDataSource) => Promise<T>,
  deps: unknown[] = [],
): AsyncState<T> {
  const { source, version } = useMemberData();
  const [state, setState] = useState<Omit<AsyncState<T>, 'reload'>>({
    status: 'loading',
    data: null,
    error: null,
  });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    load(source).then(
      (data) => live && setState({ status: 'ready', data, error: null }),
      (error: Error) => live && setState({ status: 'error', data: null, error }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, version, tick, ...deps]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}
