import React from 'react';

export const DesktopMarketplace: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-100">Perks Marketplace</h2>
      <p className="text-sm text-slate-400">
        Catalog of partner discounts, merch, and perks redeemable using earned
        points.
      </p>
      {/* TODO(Frontend): Fetch perks from GET /perks and implement redemption confirmation modal */}
      <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/60 text-xs text-amber-400 font-mono">
        TODO(Frontend): List partner perk cards and trigger POST
        /perks/:id/redeem.
      </div>
    </div>
  );
};
