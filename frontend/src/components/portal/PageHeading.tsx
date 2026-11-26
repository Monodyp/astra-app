import React from 'react';

export const PageHeading: React.FC<{
  eyebrow?: string;
  title: string;
  description: string;
  aside?: React.ReactNode;
}> = ({ eyebrow, title, description, aside }) => (
  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-8">
    <div className="min-w-0">
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-wide text-astra-primary-light">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-3 break-words text-h4 font-bold text-astra-white md:text-h2">{title}</h1>
      <p className="mt-3 text-sm text-astra-gray">{description}</p>
    </div>
    {aside}
  </div>
);
