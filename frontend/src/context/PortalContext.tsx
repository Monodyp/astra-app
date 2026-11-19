import React, { createContext, useContext, useState } from 'react';
import {
  INITIAL_VOUCHERS,
  type ClaimedVoucher,
  type MarketplacePerk,
} from '../data/portalData.js';

interface PortalContextValue {
  pointsBalance: number;
  vouchers: ClaimedVoucher[];
  claimPerk: (perk: MarketplacePerk) => ClaimedVoucher | null;
}

const PortalContext = createContext<PortalContextValue | null>(null);

function generateVoucherCode(): string {
  const digits = Math.floor(10000 + Math.random() * 90000);
  return `ASTR-PRK-${digits}`;
}

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [pointsBalance, setPointsBalance] = useState(450);
  const [vouchers, setVouchers] = useState<ClaimedVoucher[]>(INITIAL_VOUCHERS);

  const claimPerk = (perk: MarketplacePerk): ClaimedVoucher | null => {
    if (pointsBalance < perk.pointsCost) {
      return null;
    }

    const code = generateVoucherCode();
    const newVoucher: ClaimedVoucher = {
      id: `voucher-${Date.now()}`,
      title: perk.title,
      description: perk.description,
      code,
      status: 'ready',
      dateLabel: `Valid until ${perk.expirationLabel}`,
      expirationLabel: perk.expirationLabel,
      artworkKind: perk.artworkKind,
      artworkLabel:
        perk.artworkKind === 'discount' ? 'PARTNER' : 'MERCH',
      artworkTitle:
        perk.artworkKind === 'discount'
          ? '10% OFF'
          : perk.artworkKind === 'stickers'
            ? 'ASTRA ORIGINALS'
            : 'COFFEE BREAK',
      dialogEyebrow: 'REDEMPTION / PARTNER PERK',
      dialogTitle: perk.dialogTitle,
      terms: perk.terms,
    };

    setPointsBalance((prev) => prev - perk.pointsCost);
    setVouchers((prev) => [newVoucher, ...prev]);
    return newVoucher;
  };

  return (
    <PortalContext.Provider value={{ pointsBalance, vouchers, claimPerk }}>
      {children}
    </PortalContext.Provider>
  );
};

export const usePortal = () => {
  const ctx = useContext(PortalContext);
  if (!ctx) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return ctx;
};
