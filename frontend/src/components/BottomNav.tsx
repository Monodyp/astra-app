import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { BadgeCheck, Gift, Home, MoreHorizontal, ScanLine, Star, X } from 'lucide-react';

type Item = { path: string; label: string; icon: React.ElementType; match?: (p: string) => boolean };

export const NAV_ITEMS: Item[] = [
  { path: '/id', label: 'Digital ID', icon: BadgeCheck, match: (p) => p === '/id' || p === '/not-valid' },
  { path: '/points', label: 'Points', icon: Star },
  { path: '/member', label: 'Home', icon: Home },
  { path: '/marketplace', label: 'Perks', icon: Gift, match: (p) => p === '/marketplace' || p.startsWith('/vouchers') },
  { path: '/checkin', label: 'Check-in', icon: ScanLine },
];

export type MoreLink = { to: string; label: string; note?: string };

const itemCls = (active: boolean) =>
  `relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 font-astra text-[11px] font-medium leading-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-astra-primary-light lg:min-h-11 lg:flex-none lg:flex-row lg:gap-2 lg:px-4 lg:text-sm ${
    active ? 'bg-astra-primary-dark/50 text-astra-primary-light font-bold' : 'text-astra-gray hover:text-astra-white'
  }`;

export const BottomNav: React.FC<{ moreLinks: MoreLink[] }> = ({ moreLinks }) => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const moreActive = pathname.startsWith('/officer') || pathname.startsWith('/opportunities') || pathname === '/vouchers';

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    sheet?.querySelector<HTMLElement>('a,button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
      if (e.key === 'Tab' && sheet) {
        const f = Array.from(sheet.querySelectorAll<HTMLElement>('a,button'));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <nav
        aria-label="Member navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-astra-primary-dark bg-astra-black pb-[env(safe-area-inset-bottom)] lg:static lg:border-0 lg:bg-transparent lg:pb-0"
      >
        <ul className="mx-auto flex max-w-2xl items-stretch lg:max-w-none lg:justify-center lg:gap-1">
          {NAV_ITEMS.map(({ path, label, icon: Icon, match }) => {
            const active = match ? match(pathname) : pathname === path;
            return (
              <li key={path} className="flex flex-1 lg:flex-none">
                <NavLink to={path} end className={() => `${itemCls(active)} w-full`} aria-current={active ? 'page' : undefined}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              </li>
            );
          })}
          <li className="flex flex-1 lg:flex-none">
            <button
              ref={toggleRef}
              type="button"
              className={`${itemCls(moreActive || open)} w-full`}
              aria-expanded={open}
              aria-haspopup="dialog"
              aria-controls="more-sheet"
              onClick={() => setOpen((o) => !o)}
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 lg:items-start lg:justify-end lg:pt-24 lg:pr-8" onClick={() => setOpen(false)}>
          <div
            id="more-sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="More"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80dvh] w-full max-w-md overflow-y-auto border border-astra-primary-dark bg-astra-black p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:w-80"
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-astra text-lg font-bold text-astra-white">More</h2>
              <button type="button" aria-label="Close more menu" className="inline-flex h-11 w-11 items-center justify-center text-astra-white" onClick={() => { setOpen(false); toggleRef.current?.focus(); }}>
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <ul className="divide-y divide-white/10">
              {moreLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="flex min-h-12 flex-col justify-center py-2 font-astra text-base text-astra-white hover:text-astra-primary-light">
                    <span>{l.label}</span>
                    {l.note && <span className="text-xs text-astra-gray">{l.note}</span>}
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
