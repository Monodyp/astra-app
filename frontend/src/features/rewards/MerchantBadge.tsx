import React from 'react';

export const MerchantBadge: React.FC<{ name: string | null }> = ({ name }) => {
  const partner = name?.trim() || 'ASTRA Partner';
  const initials = partner
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="grid h-11 w-11 shrink-0 place-items-center border border-astra-primary-dark bg-black/40 text-base font-bold text-astra-primary-light"
      >
        {initials}
      </span>
      <p className="min-w-0 break-words text-sm font-bold">{partner}</p>
    </div>
  );
};
