import React from 'react';
import { ViewportScreen } from '../features/rewards/ViewportScreen.js';
import { DesktopVouchers } from '../features/rewards/desktop/DesktopVouchers.js';
import { MobileVouchers } from '../features/rewards/mobile/MobileVouchers.js';

export const Vouchers: React.FC = () => (
  <ViewportScreen mobile={MobileVouchers} desktop={DesktopVouchers} />
);
