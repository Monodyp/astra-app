import React from 'react';

export const DesktopVoucherDetails: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-100">Voucher Details</h2>
      <p className="text-sm text-slate-400">
        Claimed perk voucher showing digital redemption code and partner terms.
      </p>
      {/* TODO(Frontend): Fetch voucher from GET /vouchers/:id and show verification QR */}
      <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/60 text-xs text-amber-400 font-mono">
        TODO(Frontend): Display single voucher code, expiration date, and
        redemption status.
      </div>
    </div>
  );
};
