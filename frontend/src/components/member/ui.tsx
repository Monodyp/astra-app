import React from 'react';
import { Link } from 'react-router-dom';
import { ServiceUnavailableError } from '@/features/member/types';

export const panel = 'border border-astra-primary-dark bg-black/30 p-4 sm:p-6';
export const btnBase =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 px-4 py-2 font-astra text-base font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-astra-primary-light disabled:cursor-not-allowed disabled:opacity-50';
export const btnPrimary = `${btnBase} border-2 border-astra-primary-light bg-astra-primary-light/10 text-astra-white hover:bg-astra-primary-light/25`;
export const btnSecondary = `${btnBase} border border-astra-primary-dark text-astra-white hover:bg-astra-primary-dark/40`;
export const inputCls =
  'min-h-12 w-full border border-astra-primary-dark bg-astra-black px-3 py-2 font-astra text-base text-astra-white placeholder:text-astra-gray focus-visible:outline focus-visible:outline-2 focus-visible:outline-astra-primary-light';

export const PageTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="font-astra text-2xl font-bold text-astra-white">{children}</h2>
);

export const Panel: React.FC<{ children: React.ReactNode; className?: string; as?: 'section' | 'div' | 'li' }> = ({
  children,
  className = '',
  as: Tag = 'section',
}) => <Tag className={`${panel} ${className}`}>{children}</Tag>;

export const LoadingState: React.FC<{ label?: string }> = ({ label = 'Loading' }) => (
  <p role="status" className={`${panel} font-astra text-astra-gray`}>
    {label}…
  </p>
);

/** Error state; ServiceUnavailableError gets an explicit "not connected" presentation. */
export const ErrorState: React.FC<{ error: Error | null; onRetry?: () => void }> = ({ error, onRetry }) => {
  const unavailable = error instanceof ServiceUnavailableError;
  return (
    <div role="alert" className={`${panel} space-y-3 border-amber-400/60`}>
      <p className="font-astra text-base font-bold text-astra-white">
        {unavailable ? 'Not available yet' : 'Something went wrong'}
      </p>
      <p className="font-astra text-sm text-astra-gray">{error?.message ?? 'Please try again.'}</p>
      {unavailable && (
        <p className="font-astra text-sm text-astra-gray">
          The member backend is not connected to this site. To preview the screens with clearly labeled sample data, run the
          site in fixture mode (see README_MOBILE.md).
        </p>
      )}
      {onRetry && !unavailable && (
        <button type="button" className={btnSecondary} onClick={onRetry}>
          Try again
        </button>
      )}
      <Link to="/" className="inline-flex min-h-11 items-center font-astra text-sm font-bold text-astra-primary-light underline">
        Back to the public homepage
      </Link>
    </div>
  );
};

export const SimulatedNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="border border-amber-400/60 bg-amber-400/10 p-3 font-astra text-sm text-astra-white" role="status">
    <strong>SIMULATED · </strong>
    {children}
  </p>
);

export const formatDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

/**
 * Deterministic decorative QR-like pattern. It encodes NOTHING and cannot be scanned;
 * it is always captioned as a sample. Real QR payloads must come from the backend.
 */
export const SampleQr: React.FC<{ seed: string; label: string; size?: number }> = ({ seed, label, size = 21 }) => {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    return h / 4294967296;
  };
  const finder = (x: number, y: number) => {
    const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
    for (const [ox, oy] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
      if (inBox(ox, oy)) {
        const dx = x - ox, dy = y - oy;
        const edge = dx === 0 || dy === 0 || dx === 6 || dy === 6;
        const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        return edge || core;
      }
    }
    return null;
  };
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const f = finder(x, y);
      const on = f === null ? rnd() > 0.5 : f;
      if (on) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
    }
  return (
    <figure className="mx-auto w-full max-w-[240px]">
      <svg
        viewBox={`-2 -2 ${size + 4} ${size + 4}`}
        role="img"
        aria-label={`${label}. Sample pattern only, not scannable.`}
        className="w-full bg-white"
        fill="#0a0c0d"
        shapeRendering="crispEdges"
      >
        {cells}
      </svg>
      <figcaption className="mt-2 text-center font-astra text-xs font-bold uppercase tracking-wide text-amber-300">
        Sample pattern · not scannable
      </figcaption>
    </figure>
  );
};
