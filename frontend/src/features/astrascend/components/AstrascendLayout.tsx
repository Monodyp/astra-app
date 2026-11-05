import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { RequestStateProvider } from '../forms/RequestState';
import logo from '../assets/logo-blue.png';
import whiteLogo from '../assets/logo-white.png';
import { DiscordIcon, DiscordLink } from './DiscordLink';
import { FacebookIcon, FacebookLink } from './FacebookLink';
import { brand, button, container, focus } from '../styles/styles';
import '../styles/astrascend.css';

type Appearance = 'system' | 'light' | 'dark';
const THEME_KEY = 'astrascend-theme';
const navigationLink = `flex min-h-11 items-center hover:text-ascend-accent hover:underline hover:underline-offset-[5px] lg:h-full lg:px-2.5 ${focus}`;
const ThemeContext = createContext<'light' | 'dark'>('light');
export const useAstrascendTheme = () => useContext(ThemeContext);
const systemDark = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;
function savedAppearance(): Appearance {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

function BrandWordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <>
      <img
        className="h-[var(--as-mark-height)] w-[calc(var(--as-mark-height)*550/535)] shrink-0"
        src={inverse ? whiteLogo : logo}
        alt=""
        width="35"
        height="34"
      />
      <span className="inline-flex items-baseline gap-[calc(var(--as-mark-height)*.19)] text-[length:calc(var(--as-mark-height)*.565)] font-normal leading-none tracking-[-.025em]">
        <strong className="font-bold tracking-[-.04em]">ASTRA</strong>{' '}
        <span>Developers</span>
      </span>
    </>
  );
}

export function AstrascendLayout() {
  const [appearance, setAppearance] = useState<Appearance>(savedAppearance);
  const [darkSystem, setDarkSystem] = useState(systemDark);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navSwipe, setNavSwipe] = useState(false);
  const [atTop, setAtTop] = useState(() => window.scrollY <= 24);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const previousLocation = useRef(location);
  const theme =
    appearance === 'system' ? (darkSystem ? 'dark' : 'light') : appearance;
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setDarkSystem(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const update = () => setAtTop(window.scrollY <= 24);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [menuOpen]);
  useEffect(() => {
    setMenuOpen(false);
    const previous = previousLocation.current;
    previousLocation.current = location;
    const requestQueryChanged =
      location.pathname === '/astrascend/request' &&
      previous.pathname === location.pathname &&
      previous.hash === location.hash &&
      previous.search !== location.search;
    if (requestQueryChanged) return;
    if (location.hash)
      document
        .getElementById(location.hash.slice(1))
        ?.scrollIntoView?.({ behavior: 'instant' });
    else window.scrollTo?.({ top: 0 });
  }, [location]);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'ASTRAscend | ASTRA Developers';
    return () => {
      document.title = previousTitle;
    };
  }, []);
  const changeAppearance = (next: Appearance) => {
    setAppearance(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* Appearance still works when storage is unavailable. */
    }
  };
  const startNavSwipe = () => {
    setNavSwipe(false);
    requestAnimationFrame(() => setNavSwipe(true));
    window.setTimeout(() => setNavSwipe(false), 560);
  };
  return (
    <ThemeContext.Provider value={theme}>
      <RequestStateProvider>
        <div
          className="astrascend isolate min-h-[100dvh] bg-ascend-page font-astrascend text-[16px] leading-[1.5] text-ascend-ink [color-scheme:light] data-[theme=dark]:[color-scheme:dark] [--as-header-height:80px] lg:[--as-header-height:96px] as-compact:[--as-header-height:65px]"
          data-theme={theme}
        >
          <div
            className="as-nav-swipe"
            data-active={navSwipe}
            aria-hidden="true"
          />
          <a
            className={`fixed left-4 top-3 z-30 -translate-y-[200%] bg-ascend-panel p-3 focus:translate-y-0 ${focus}`}
            href="#as-main"
          >
            Skip to content
          </a>
          <header
            className="as-header sticky top-0 z-20 border-b border-ascend-line bg-ascend-panel [&_a:focus-visible]:outline-offset-0 as-dark:bg-[#070c1d]"
            data-scrolled={!atTop}
            ref={headerRef}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && menuOpen) {
                setMenuOpen(false);
                menuButtonRef.current?.focus();
              }
            }}
          >
            <div
              className={`${container} flex min-h-[var(--as-header-height)] flex-wrap items-center gap-2 sm:gap-4 lg:flex-nowrap lg:gap-[22px] as-tiny:gap-1.5 as-compact:gap-5`}
            >
              <Link
                to="/astrascend"
                className={`${brand} h-[calc(var(--as-header-height)*.9)] [--as-mark-height:30px] sm:[--as-mark-height:34px] as-tiny:[--as-mark-height:26px] as-compact:[--as-mark-height:31px]`}
                aria-label="ASTRAscend home"
              >
                <BrandWordmark inverse={theme === 'dark'} />
                <small className="hidden border-l border-ascend-line pl-2.5 text-[16px] text-ascend-muted as-label:inline lg:inline as-compact:text-[14px]">
                  ASTRAscend
                </small>
              </Link>
              <button
                type="button"
                className={`ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ascend-line bg-ascend-input p-0 text-ascend-ink hover:bg-ascend-selected hover:text-ascend-accent lg:hidden ${focus}`}
                ref={menuButtonRef}
                aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
                aria-expanded={menuOpen}
                aria-controls="as-navigation"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? (
                  <X size={24} strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <Menu size={24} strokeWidth={1.8} aria-hidden="true" />
                )}
              </button>
              <nav
                id="as-navigation"
                className={`${menuOpen ? 'flex' : 'hidden'} absolute inset-x-0 top-full max-h-[calc(100dvh_-_var(--as-header-height))] flex-col items-stretch gap-2 overflow-y-auto border-b border-ascend-line bg-ascend-panel px-5 pb-6 pt-5 text-[15px] font-semibold shadow-[0_12px_20px_#0b14371a] sm:px-8 lg:static lg:flex lg:h-[calc(var(--as-header-height)*.9)] lg:max-h-none lg:flex-1 lg:flex-row lg:items-center lg:justify-end lg:gap-1 lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none as-compact:text-[14px]`}
                aria-label="ASTRAscend"
              >
                <Link
                  className={navigationLink}
                  to="/astrascend#services"
                  onClick={() => {
                    setMenuOpen(false);
                    startNavSwipe();
                  }}
                >
                  Services
                </Link>
                <Link
                  className={navigationLink}
                  to="/astrascend#how-it-works"
                  onClick={() => {
                    setMenuOpen(false);
                    startNavSwipe();
                  }}
                >
                  How it works
                </Link>
                <Link
                  className={navigationLink}
                  to="/astrascend#community"
                  onClick={() => {
                    setMenuOpen(false);
                    startNavSwipe();
                  }}
                >
                  Community
                </Link>
                <Link
                  className={`group mt-1 inline-flex items-center self-start rounded-full lg:mt-0 lg:h-full lg:self-auto ${focus}`}
                  to="/astrascend/request"
                  onClick={() => {
                    setMenuOpen(false);
                    startNavSwipe();
                  }}
                >
                  <span
                    className={`${button('primary', 'nav')} group-hover:bg-[#1d4ed8]`}
                  >
                    Start a request
                  </span>
                </Link>
              </nav>
            </div>
          </header>
          <div className="pointer-events-none fixed bottom-[max(12px,env(safe-area-inset-bottom))] right-0 z-[15] overflow-hidden p-2 pr-[var(--as-toggle-inset)] [--as-toggle-inset:max(20px,env(safe-area-inset-right))]">
            <button
              type="button"
              className={`inline-flex h-12 w-12 items-center justify-center rounded-full border border-ascend-line bg-ascend-input p-0 text-ascend-ink shadow-[0_4px_12px_#0b143733] hover:bg-ascend-selected hover:text-ascend-accent motion-reduce:transition-none [&_svg]:shrink-0 ${focus} ${atTop ? 'pointer-events-auto visible translate-x-0 [transition:transform_.24s_ease,visibility_0s]' : 'pointer-events-none invisible translate-x-[calc(100%_+_var(--as-toggle-inset)_+_8px)] [transition:transform_.24s_ease,visibility_0s_.24s]'}`}
              role="switch"
              aria-label="Dark mode"
              aria-checked={theme === 'dark'}
              aria-hidden={!atTop}
              tabIndex={atTop ? 0 : -1}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              onClick={() =>
                changeAppearance(theme === 'dark' ? 'light' : 'dark')
              }
            >
              {theme === 'dark' ? (
                <Moon size={20} strokeWidth={1.8} aria-hidden="true" />
              ) : (
                <Sun size={20} strokeWidth={1.8} aria-hidden="true" />
              )}
            </button>
          </div>
          <main
            className="scroll-mt-[calc(var(--as-header-height)_+_16px)] focus:outline-none"
            id="as-main"
            tabIndex={-1}
          >
            <Outlet />
          </main>
          <footer className="relative z-[2] border-t border-[#263a60] bg-[#0b1437] py-11 text-white as-dark:bg-[#070c1d] as-compact:py-10">
            <div
              className={`${container} flex flex-wrap items-center justify-between gap-6 lg:flex-nowrap`}
            >
              <Link
                to="/astrascend"
                className={`${brand} [--as-mark-height:38px] as-compact:[--as-mark-height:34px]`}
              >
                <BrandWordmark inverse />
              </Link>
              <p className="text-[15px]">
                An initiative of ASTRA Developers · AY 2026–2027
              </p>
              <div className="flex items-center gap-2">
                <FacebookLink
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 motion-reduce:transition-none ${focus}`}
                >
                  <FacebookIcon className="h-6 w-6" />
                </FacebookLink>
                <DiscordLink
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 motion-reduce:transition-none ${focus}`}
                >
                  <DiscordIcon className="h-6 w-6" />
                </DiscordLink>
              </div>
            </div>
          </footer>
        </div>
      </RequestStateProvider>
    </ThemeContext.Provider>
  );
}
