import { ChevronRight } from "lucide-react";

export const technicalCorners = (
  <>
    <span className="absolute left-0 -top-0 h-3 w-3 border-l border-t border-astra-white/80" />
    <span className="absolute -bottom-0 left-0 h-3 w-3 border-b border-l border-astra-white/80" />
    <span className="absolute right-0 -top-0 h-3 w-3 border-r border-t border-astra-white/80" />
    <span className="absolute -bottom-0 right-0 h-3 w-3 border-b border-r border-astra-white/80" />
  </>
);

export function ActionLink({
  children,
  href,
  className = '',
}: {
  children: React.ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-2 font-astra text-sm font-bold text-astra-primary-light transition-opacity hover:opacity-75 ${className}`}
    >
      {children}
      <ChevronRight className="h-5 w-5" aria-hidden="true" />
    </a>
  );
}

export function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mx-12 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <h2 className="font-astra text-3xl font-bold tracking-tight text-astra-white sm:text-4xl">{title}</h2>
      <p className="font-astra text-sm text-astra-gray">{subtitle}</p>
    </div>
  );
}

export const clamp = (v: number) => Math.max(-1, Math.min(1, v));
export const ease = (v: number) => Math.sign(v) * Math.abs(v) ** 1.5;