import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import wordmark from '../assets/astra-home/wordmark.png';
import { useAuth } from '../context/AuthContext.js';
import { PortalBackdrop } from './portal/PortalBackdrop.js';
import { destinationsFor } from './portal/navigation.js';
import { BottomNav } from './BottomNav.js';

const frame = 'mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-[112px]';

export const AppShell: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const isOfficer = user?.role === 'officer';
  const verified = user?.membershipStatus === 'verified';
  const destinations = user ? destinationsFor(user.role) : [];

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-astra-black font-astra text-astra-white">
      <PortalBackdrop />
      <a
        href="#portal-main"
        className="fixed left-4 top-3 z-50 -translate-y-[200%] bg-astra-primary-light px-4 py-2 text-sm font-bold text-astra-black focus:translate-y-0"
      >
        Skip to content
      </a>

      <header className="relative z-10 border-b border-astra-primary-dark/60 bg-astra-black/40">
        <div
          className={`${frame} grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3 py-3 sm:py-4 lg:flex lg:gap-0 lg:py-6`}
        >
          {/* Logo */}
          <Link
            to={user ? '/home' : '/'}
            aria-label="ASTRA Developers portal"
            className="col-start-1 row-start-1 justify-self-start lg:mr-7"
          >
            <img
              src={wordmark}
              alt="ASTRA Developers"
              className="w-32 sm:w-[180px] lg:w-[220px]"
            />
          </Link>

          {/* Row 2 on mobile/tablet, flattened into the main row on lg+ */}
          {user && (
            <div className="col-span-2 row-start-2 flex min-w-0 items-center justify-between gap-3 border-t border-astra-primary-dark/40 pt-3 lg:contents">
              <div className="flex min-w-0 items-center gap-3 lg:gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm text-astra-white sm:text-base">
                    <span className="sm:hidden">Hi, </span>
                    <span className="hidden sm:inline">Welcome back, </span>
                    {user.displayName}
                  </p>
                  <p className="hidden truncate text-[10px] font-medium uppercase tracking-wide text-astra-gray sm:block">
                    ASTRA Developers / {isOfficer ? 'Officer' : 'Member'} Portal
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide sm:px-5 sm:py-1.5 ${verified
                      ? 'bg-[#0f2a3a] text-astra-primary-light'
                      : 'bg-astra-white/15 text-astra-white'
                    }`}
                >
                  {isOfficer ? 'Officer' : verified ? 'Member' : 'Unverified'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="inline-flex min-h-11 shrink-0 items-center text-sm text-astra-gray transition-colors hover:text-astra-white disabled:opacity-60 sm:text-base lg:ml-auto lg:mr-6 lg:min-h-0"
              >
                {signingOut ? 'Signing out…' : 'Logout'}
              </button>
            </div>
          )}

          {/* CTA */}
          <Link
            to="/astrascend"
            className={`col-start-2 row-start-1 inline-flex items-center justify-self-end whitespace-nowrap rounded-full bg-astra-primary-light px-4 py-2 text-sm font-bold text-astra-black transition-transform hover:scale-105 sm:px-8 sm:py-3 sm:text-lg ${user ? 'lg:ml-0' : 'lg:ml-auto'
              }`}
          >
            ASTRAscend
          </Link>
        </div>
      </header>

      {destinations.length > 0 && (
        <nav
          aria-label="Portal"
          className="relative z-10 border-b border-astra-primary-dark/60 bg-astra-black/20 hidden lg:block"
        >
          <ul className={`${frame} flex gap-2 overflow-x-auto`}>
            {destinations.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `block border-b-2 px-2 py-5 text-sm font-bold transition-colors mx-2 whitespace-nowrap ${isActive
                      ? 'border-astra-primary-light text-astra-primary-light'
                      : 'border-transparent text-astra-gray hover:text-astra-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <main
        id="portal-main"
        tabIndex={-1}
        className={`${frame} relative z-20 flex-1 py-8 focus:outline-none`}
      >
        <Outlet />
      </main>

      {destinations.length > 0 && (
        <div className="lg:hidden">
          <BottomNav destinations={destinations} />
        </div>
      )}

      <footer
        className={`relative z-10 border-t border-astra-primary-dark/60 bg-astra-black/80 ${destinations.length > 0
            ? 'pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0'
            : ''
          }`}
      >
        <div
          className={`${frame} flex flex-col gap-2 py-6 text-[10px] font-medium uppercase tracking-wide text-astra-gray sm:flex-row sm:items-center sm:justify-between lg:py-9`}
        >
          <span>ASTRA Developers / AY 2026-2027</span>
          <span>
            {isOfficer
              ? 'Officer console · Secure session'
              : 'Member console · Connected'}
          </span>
        </div>
      </footer>
    </div>
  );
};
