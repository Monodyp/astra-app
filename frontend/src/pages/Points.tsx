import React from 'react';
import { ViewportScreen } from '../components/ViewportScreen.js';
import { DesktopPoints } from '../features/rewards/desktop/DesktopPoints.js';
import { MobilePoints } from '../features/rewards/mobile/MobilePoints.js';

export const Points: React.FC = () => (
  <ViewportScreen mobile={MobilePoints} desktop={DesktopPoints} />
);
