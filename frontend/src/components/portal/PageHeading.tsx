import React from 'react';

export const PageHeading: React.FC<{
  eyebrow?: string;
  title: string;
  description: string;
  aside?: React.ReactNode;
}> = ({ eyebrow, title, description, aside }) => (
  <div className="flex items-start justify-between gap-8">
    <div>
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-wide text-astra-primary-light">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-3 text-h2 font-bold text-astra-white">{title}</h1>
      <p className="mt-3 text-sm text-astra-gray">{description}</p>
    </div>
    {aside}
  </div>
);
