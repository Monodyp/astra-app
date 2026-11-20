import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Award,
  BadgeCheck,
  Gift,
  Home,
  MoreHorizontal,
  ScanLine,
  Ticket,
  X,
} from 'lucide-react';
import { isActivePath, type PortalDestination } from './portal/navigation.js';

const ICONS: Record<string, React.ElementType> = {
  '/home': Home,
  '/id': BadgeCheck,
  '/officer/grant-points': Award,
  '/marketplace': Gift,
  '/checkin': ScanLine,
  '/vouchers': Ticket,
};

export interface MoreLink {
  to: string;
  label: string;
}

const itemClass = (active: boolean) =>
  `relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-0.5 py-1 font-astra text-[10px] font-medium leading-tight tracking-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-astra-primary-light ${
    active
      ? 'bg-astra-primary-dark/50 font-bold text-astra-primary-light'
      : 'text-astra-gray hover:text-astra-white'
  }`;

export const BottomNav: React.FC<{
  destinations: PortalDestination[];
  moreLinks: MoreLink[];
}> = ({ destinations, moreLinks }) => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const moreActive = moreLinks.some(
    (link) => link.to !== '/' && isActivePath(pathname, link.to)
  );

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    sheet?.querySelector<HTMLElement>('a,button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
      if (event.key === 'Tab' && sheet) {
        const items = Array.from(
          sheet.querySelectorAll<HTMLElement>('a,button')
        );
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <nav
        aria-label="Member navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-astra-primary-dark bg-astra-black pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto flex max-w-2xl items-stretch">
          {destinations.map((item) => {
            const Icon = ICONS[item.path] ?? Home;
            const active = isActivePath(pathname, item.path);
            return (
              <li key={item.path} className="flex min-w-0 flex-auto">
                <Link
                  to={item.path}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={itemClass(active)}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="max-w-full truncate">{item.shortLabel}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex min-w-0 flex-auto">
            <button
              ref={toggleRef}
              type="button"
              className={itemClass(moreActive || open)}
              aria-expanded={open}
              aria-haspopup="dialog"
              aria-controls="more-sheet"
              onClick={() => setOpen((value) => !value)}
            >
              <MoreHorizontal className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            id="more-sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="More"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[80dvh] w-full max-w-md overflow-y-auto border border-astra-primary-dark bg-astra-black p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-astra text-lg font-bold text-astra-white">
                More
              </h2>
              <button
                type="button"
                aria-label="Close more menu"
                className="inline-flex h-11 w-11 items-center justify-center text-astra-white"
                onClick={() => {
                  setOpen(false);
                  toggleRef.current?.focus();
                }}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <ul className="divide-y divide-white/10">
              {moreLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    aria-current={
                      link.to !== '/' && isActivePath(pathname, link.to)
                        ? 'page'
                        : undefined
                    }
                    className="flex min-h-12 items-center py-2 font-astra text-base text-astra-white hover:text-astra-primary-light"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
};
