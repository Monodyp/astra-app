import React from 'react';

export const DesktopPoints: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-100">Points & Ledger</h2>
      <p className="text-sm text-slate-400">
        Member point balance overview and chronological transaction ledger
        history.
      </p>
      {/* TODO(Frontend): Fetch points balance from /points/me and history from /points/me/history */}
      <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/60 text-xs text-amber-400 font-mono">
        TODO(Frontend): Bind /points/me and /points/me/history data to balance
        card and ledger list.
      </div>
    </div>
  );
};
