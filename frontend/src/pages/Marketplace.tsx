import React from 'react';
import { ViewportScreen } from '../components/ViewportScreen.js';
import { DesktopMarketplace } from '../features/rewards/desktop/DesktopMarketplace.js';
import { MobileMarketplace } from '../features/rewards/mobile/MobileMarketplace.js';

export const Marketplace: React.FC = () => (
  <ViewportScreen mobile={MobileMarketplace} desktop={DesktopMarketplace} />
);
