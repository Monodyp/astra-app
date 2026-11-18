import React from 'react';
import { technicalCorners } from '../home/ui-util.js';

export const Panel: React.FC<
  React.HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' | 'article' }
> = ({ as: Tag = 'section', className = '', children, ...rest }) => (
  <Tag
    className={`relative border border-astra-primary-dark bg-black/40 shadow-[0_0_16px_rgba(0,140,204,0.07)] ${className}`}
    {...rest}
  >
    {technicalCorners}
    {children}
  </Tag>
);
