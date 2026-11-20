import React from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../../../lib/format.js';

export const panel = 'border border-astra-primary-dark bg-black/30 p-4 sm:p-6';
export const btnBase =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 px-4 py-2 font-astra text-base font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-astra-primary-light disabled:cursor-not-allowed disabled:opacity-50';
export const btnPrimary = `${btnBase} border-2 border-astra-primary-light bg-astra-primary-light/10 text-astra-white hover:bg-astra-primary-light/25`;
export const btnSecondary = `${btnBase} border border-astra-primary-dark text-astra-white hover:bg-astra-primary-dark/40`;

export const Panel: React.FC<{
  children: React.ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'li';
}> = ({ children, className = '', as: Tag = 'section' }) => (
  <Tag className={`${panel} ${className}`}>{children}</Tag>
);

export const LoadingState: React.FC<{ label?: string }> = ({
  label = 'Loading',
}) => (
  <p role="status" className={`${panel} font-astra text-astra-gray`}>
    {label}…
  </p>
);

export const ErrorState: React.FC<{
  error: unknown;
  onRetry?: () => void;
}> = ({ error, onRetry }) => (
  <div role="alert" className={`${panel} space-y-3 border-amber-400/60`}>
    <p className="font-astra text-base font-bold text-astra-white">
      Something went wrong
    </p>
    <p className="font-astra text-sm text-astra-gray">{errorMessage(error)}</p>
    {onRetry && (
      <button type="button" className={btnSecondary} onClick={onRetry}>
        Try again
      </button>
    )}
    <Link
      to="/"
      className="inline-flex min-h-11 items-center font-astra text-sm font-bold text-astra-primary-light underline"
    >
      Back to the public homepage
    </Link>
  </div>
);

export const formatDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );
