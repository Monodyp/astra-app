import React from 'react';
import { LoaderCircle } from 'lucide-react';

export const LoadingState: React.FC<{ label: string }> = ({ label }) => (
  <div
    role="status"
    className="flex items-center justify-center gap-3 py-16 font-astra text-sm text-astra-gray"
  >
    <LoaderCircle
      className="h-5 w-5 animate-spin text-astra-primary-light"
      aria-hidden="true"
    />
    <span>{label}…</span>
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Something went wrong', message, onRetry }) => (
  <div
    role="alert"
    className="border border-red-400/40 bg-red-950/20 px-6 py-5 font-astra"
  >
    <p className="text-sm font-bold text-red-300">{title}</p>
    <p className="mt-1 text-sm text-astra-white/80">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full border border-astra-primary-light px-5 py-2 text-sm font-bold text-astra-primary-light transition-colors hover:bg-astra-primary-light/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-astra-primary-light"
      >
        Try again
      </button>
    )}
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  message: string;
  children?: React.ReactNode;
}> = ({ title, message, children }) => (
  <div className="border border-dashed border-astra-primary-dark px-6 py-10 text-center font-astra">
    <p className="text-base font-bold text-astra-white">{title}</p>
    <p className="mt-1 text-sm text-astra-gray">{message}</p>
    {children && <div className="mt-5">{children}</div>}
  </div>
);
