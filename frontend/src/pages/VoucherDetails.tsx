import React from 'react';
import { ViewportScreen } from '../components/ViewportScreen.js';
import { DesktopVoucherDetails } from '../features/rewards/desktop/DesktopVoucherDetails.js';
import { MobileVoucherDetails } from '../features/rewards/mobile/MobileVoucherDetails.js';

export const VoucherDetails: React.FC = () => (
  <ViewportScreen
    mobile={MobileVoucherDetails}
    desktop={DesktopVoucherDetails}
  />
);
