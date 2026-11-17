import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
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

  return (
    <header className="fixed z-[100] mx-auto flex w-full items-center justify-between gap-6 px-[112px] py-8 bg-astra-black/30 shadow-[0_0_16px_rgba(0,140,204,0.07)]">
      <a href="#home" aria-label="ASTRA Developers home">
        <img src={wordmark} alt="ASTRA Developers" className="h-auto w-40 sm:w-48" />
      </a>
      <nav className="hidden items-center gap-7 font-astra text-sm font-medium text-astra-gray lg:flex" aria-label="Landing page">
        {NAV_LINKS.map(({ label, id }) => (
          <a
            key={label}
            href={`#${id}`}
            aria-current={activeId === id ? "true" : undefined}
            className={`transition-colors ${
              activeId === id ? "text-astra-primary-light" : "hover:text-astra-white"
            }`}
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-4 font-astra text-sm font-medium">
        <a className="hidden text-astra-white transition-colors hover:text-astra-primary-light sm:block" href="/login">Login</a>
        <a className="inline-flex items-center gap-2 rounded-full bg-astra-primary-light px-4 py-2 font-bold text-astra-white transition-transform hover:scale-105" href="/astrascend">
          ASTRAscend
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}