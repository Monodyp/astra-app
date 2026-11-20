import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { BottomNav, type MoreLink } from './BottomNav.js';
import wordmark from '../assets/astra-home/wordmark.png';
import { useMemberData, useMemberQuery } from '@/features/member/MemberDataContext';

const FixtureBar: React.FC = () => {
  const { duesPaid, role, setDuesPaid, setRole } = useMemberData();
  const chip =
    'inline-flex min-h-11 items-center gap-2 border border-amber-400/60 px-2 font-astra text-xs text-astra-white';
  return (
    <div role="region" aria-label="Fixture mode controls" className="border-b border-amber-400/60 bg-amber-400/10 px-4 py-2">
      <p className="font-astra text-xs font-bold uppercase tracking-wide text-amber-300">
        Fixture mode · sample data · nothing is saved or sent
      </p>
      <div className="mt-1 flex flex-wrap gap-2">
        <label className={chip}>
          <input type="checkbox" checked={duesPaid} onChange={(e) => setDuesPaid(e.target.checked)} className="h-5 w-5" />
          Dues paid
        </label>
        <label className={chip}>
          <input type="checkbox" checked={role === 'officer'} onChange={(e) => setRole(e.target.checked ? 'officer' : 'member')} className="h-5 w-5" />
          Officer role
        </label>
      </div>
    </div>
  );
};

/** Shared member shell: logo, welcome row + role badge, scrolling content, six-item bottom navigation. */
export const AppShell: React.FC = () => {
  const { fixture } = useMemberData();
  const profile = useMemberQuery((s) => s.getProfile());
  const isOfficer = profile.data?.role === 'officer';

  const moreLinks: MoreLink[] = [
    { to: '/vouchers', label: 'Claimed vouchers' },
    ...(isOfficer ? [{ to: '/officer/grant-points', label: 'Grant points (officer)' }] : []),
    { to: '/opportunities', label: 'Opportunities' },
    { to: '/partner-instructions', label: 'Partner instructions' },
    { to: '/astrascend', label: 'ASTRAscend services' },
    { to: '/', label: 'Public homepage' },
  ];

  return (
    <div className="min-h-dvh bg-astra-black font-astra text-astra-white">
      {fixture && <FixtureBar />}
      <header className="border-b border-astra-primary-dark">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <Link to="/member" aria-label="ASTRA Developers member home" className="flex min-h-11 shrink-0 items-center justify-center self-center lg:self-auto">
            <img src={wordmark} alt="ASTRA Developers" className="h-auto w-36" />
          </Link>
          <div className="flex items-center justify-between gap-3 lg:order-3">
            <p className="min-w-0 break-words font-astra text-base text-astra-white lg:whitespace-nowrap">
              <span className="lg:hidden xl:inline">Welcome back, </span>{profile.data ? profile.data.name : 'member'}
            </p>
            <span className="shrink-0 border border-astra-primary-light px-3 py-2 font-astra text-sm font-bold uppercase">
              {isOfficer ? 'Officer' : 'Member'}
            </span>
          </div>
          <div className="hidden lg:order-2 lg:block">
            <BottomNav moreLinks={moreLinks} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 lg:max-w-5xl lg:pb-12">
        <Outlet />
      </main>
      <div className="lg:hidden">
        <BottomNav moreLinks={moreLinks} />
      </div>
    </div>
  );
};
