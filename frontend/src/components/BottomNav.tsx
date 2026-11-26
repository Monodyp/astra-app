import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Award,
  BadgeCheck,
  Gift,
  Home,
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

const itemClass = (active: boolean) =>
  `relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-0.5 py-1 font-astra text-[10px] font-medium leading-tight tracking-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-astra-primary-light ${
    active
      ? 'bg-astra-primary-dark/50 font-bold text-astra-primary-light'
      : 'text-astra-gray hover:text-astra-white'
  }`;

export const BottomNav: React.FC<{
  destinations: PortalDestination[];
}> = ({ destinations }) => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

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
        </ul>
      </nav>
    </>
  );
};
