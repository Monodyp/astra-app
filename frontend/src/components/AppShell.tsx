import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import wordmark from '../assets/astra-home/wordmark.png';
import { useAuth } from '../context/AuthContext.js';
import { PortalBackdrop } from './portal/PortalBackdrop.js';
import { destinationsFor } from './portal/navigation.js';
import { BottomNav, type MoreLink } from './BottomNav.js';

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

  const moreLinks: MoreLink[] = [
    { to: '/points', label: 'Points' },
    { to: '/opportunities', label: 'Opportunities' },
    { to: '/partner-instructions', label: 'Partner instructions' },
    { to: '/astrascend', label: 'ASTRAscend services' },
    { to: '/', label: 'Public homepage' },
  ];

  return (
    <div className="relative flex min-h-screen flex-col bg-astra-black font-astra text-astra-white">
      <PortalBackdrop />
      <a
        href="#portal-main"
        className="fixed left-4 top-3 z-50 -translate-y-[200%] bg-astra-primary-light px-4 py-2 text-sm font-bold text-astra-white focus:translate-y-0"
      >
        Skip to content
      </a>

      <header className="relative z-10 border-b border-astra-primary-dark/60 bg-astra-black/40">
        <div
          className={`${frame} flex flex-wrap items-center justify-between gap-y-2 py-4 md:flex-nowrap md:gap-y-0 sm:py-6`}
        >
          <div className="contents md:flex md:items-center md:gap-7">
            <Link
              to={user ? '/home' : '/'}
              aria-label="ASTRA Developers portal"
              className="order-1 md:order-none"
            >
              <img
                src={wordmark}
                alt="ASTRA Developers"
                className="w-36 sm:w-[220px]"
              />
            </Link>
            {user && (
              <div className="order-3 flex w-full items-center justify-between gap-3 border-t border-astra-primary-dark/40 pt-3 md:order-none md:w-auto md:justify-start md:gap-4 md:border-0 md:pt-0">
                <div className="min-w-0">
                  <p className="text-sm sm:text-base text-astra-white">
                    Welcome back, {user.displayName}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-astra-gray">
                    ASTRA Developers / {isOfficer ? 'Officer' : 'Member'} Portal
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 sm:px-5 py-1 sm:py-1.5 text-[10px] font-bold uppercase tracking-wide ${
                    verified
                      ? 'bg-[#0f2a3a] text-astra-primary-light'
                      : 'bg-astra-white/15 text-astra-white'
                  }`}
                >
                  {isOfficer ? 'Officer' : verified ? 'Member' : 'Unverified'}
                </span>
              </div>
            )}
          </div>

          <div className="contents md:flex md:items-center md:gap-6">
            <Link
              to="/astrascend"
              className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-astra-gray transition-colors hover:text-astra-white md:ml-4 md:inline-flex lg:hidden"
            >
              <span>ASTRAscend services</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>

            {user && (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="order-2 inline-flex min-h-11 items-center text-sm sm:text-base md:order-none lg:min-h-0 text-astra-gray transition-colors hover:text-astra-white disabled:opacity-60"
              >
                {signingOut ? 'Signing out…' : 'Logout'}
              </button>
            )}

            <Link
              to="/astrascend"
              className="hidden items-center gap-1 rounded-full bg-astra-primary-light px-8 py-3 text-lg font-bold text-astra-white transition-transform hover:scale-105 lg:inline-flex"
            >
              ASTRAscend
            </Link>
          </div>
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
                    `block border-b-2 px-2 py-5 text-sm font-bold transition-colors mx-2 whitespace-nowrap ${
                      isActive
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
          <BottomNav destinations={destinations} moreLinks={moreLinks} />
        </div>
      )}

      <footer
        className={`relative z-10 border-t border-astra-primary-dark/60 bg-astra-black/80 ${
          destinations.length > 0
            ? 'pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0'
            : ''
        }`}
      >
        <div
          className={`${frame} flex flex-col gap-2 py-6 text-[10px] font-medium uppercase tracking-wide text-astra-gray sm:flex-row sm:items-center sm:justify-between lg:py-9`}
        >
          <span>ASTRA Developers / AY 2026–2027</span>
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
