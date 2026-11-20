import React from 'react';
import { useIsDesktop } from '../../lib/viewport.js';

export const ViewportScreen: React.FC<{
  mobile: React.ComponentType;
  desktop: React.ComponentType;
}> = ({ mobile: Mobile, desktop: Desktop }) =>
  useIsDesktop() ? <Desktop /> : <Mobile />;
