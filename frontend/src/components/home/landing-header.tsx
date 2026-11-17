import { useEffect, useRef, useState } from "react";
import { ExternalLink, Menu, X } from "lucide-react";
import wordmark from '@/assets/astra-home/wordmark.png';

const NAV_LINKS = [
  { label: "Home", id: "home" },
  { label: "Features", id: "features" },
  { label: "How It Works", id: "how-it-works" },
  { label: "Console Preview", id: "console" },
  { label: "Events", id: "events" },
];

const SECTION_IDS = ["home", "features", "how-it-works", "console", "events"];

function useScrollSpy(ids: string[]) {
  const [activeId, setActiveId] = useState(ids[0]);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      ticking = false;
      const line = window.innerHeight * 0.35;
      let current = ids[0];

      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }

      // at the very bottom, force the last section (short final sections never reach the line)
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = ids[ids.length - 1];
      }

      setActiveId(current);
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ids]);

  return activeId;
}

export default function LandingHeader() {
  const activeId = useScrollSpy(SECTION_IDS);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Escape closes the phone menu and returns focus to the toggle; focus moves in on open.
  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="fixed z-[100] mx-auto w-full bg-astra-black/80 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shadow-[0_0_16px_rgba(0,140,204,0.07)] backdrop-blur sm:px-8 lg:flex lg:items-center lg:justify-between lg:gap-6 lg:bg-astra-black/30 lg:px-8 lg:py-8 xl:px-[112px] lg:backdrop-blur-none">
      <div className="flex items-center justify-between gap-4 lg:contents">
        <a href="#home" aria-label="ASTRA Developers home" className="inline-flex min-h-11 items-center">
          <img src={wordmark} alt="ASTRA Developers" className="h-auto w-36 sm:w-44 lg:w-48" />
        </a>
        <button
          ref={toggleRef}
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center border border-astra-primary-dark text-astra-white lg:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>
      <nav className="hidden items-center gap-5 font-astra text-sm font-medium text-astra-gray lg:flex xl:gap-7" aria-label="Landing page">
        {NAV_LINKS.map(({ label, id }) => (
          <a
            key={label}
            href={`#${id}`}
            aria-current={activeId === id ? "true" : undefined}
            className={`whitespace-nowrap py-3 transition-colors ${
              activeId === id ? "text-astra-primary-light" : "hover:text-astra-white"
            }`}
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="mt-3 flex items-center gap-4 font-astra text-sm font-medium lg:mt-0">
        <a className="flex min-h-11 w-full items-center justify-center border border-astra-primary-light text-astra-white transition-colors hover:text-astra-primary-light lg:inline lg:min-h-0 lg:w-auto lg:py-3 lg:whitespace-nowrap lg:border-0" href="/login">Log In</a>
        <a className="hidden items-center gap-2 rounded-full bg-astra-primary-light px-4 py-2 font-bold text-astra-white transition-transform hover:scale-105 lg:inline-flex" href="/astrascend">
          ASTRAscend
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
      {menuOpen && (
        <div
          id="landing-mobile-menu"
          ref={menuRef}
          className="absolute left-0 right-0 top-full max-h-[calc(100dvh-100%)] overflow-y-auto border-t border-astra-primary-dark bg-astra-black px-4 pb-4 sm:px-8 lg:hidden"
        >
          <nav aria-label="Landing page menu" className="flex flex-col font-astra text-base text-astra-white">
            {NAV_LINKS.map(({ label, id }) => (
              <a
                key={label}
                href={`#${id}`}
                onClick={() => setMenuOpen(false)}
                aria-current={activeId === id ? "true" : undefined}
                className={`flex min-h-12 items-center border-b border-white/10 ${activeId === id ? "text-astra-primary-light" : ""}`}
              >
                {label}
              </a>
            ))}
            <a href="/astrascend" className="flex min-h-12 items-center gap-2 font-bold text-astra-primary-light">
              ASTRAscend <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
