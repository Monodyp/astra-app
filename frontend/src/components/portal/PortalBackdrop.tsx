import React from 'react';
import astraBg from '../../assets/astra-home/Astra-Bg.png';

export const PortalBackdrop: React.FC = () => (
  <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
    <img
      src={astraBg}
      alt=""
      className="h-full w-full object-cover object-top"
    />
  </div>
);
