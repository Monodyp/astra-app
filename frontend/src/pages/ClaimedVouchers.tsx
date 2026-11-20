import React from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState, Panel, btnSecondary } from '@/components/member/ui';
import { useMemberQuery } from '@/features/member/MemberDataContext';

export const ClaimedVouchers: React.FC = () => {
  const vouchers = useMemberQuery((s) => s.getVouchers());

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Claimed Vouchers</h2>
      <Link to="/marketplace" className={btnSecondary}>Browse Perks</Link>
      {vouchers.status === 'loading' && <LoadingState label="Loading vouchers" />}
      {vouchers.status === 'error' && <ErrorState error={vouchers.error} onRetry={vouchers.reload} />}
      {vouchers.status === 'ready' && vouchers.data?.length === 0 && (
        <Panel className="space-y-2">
          <p className="font-bold" role="status">You have not claimed any vouchers yet.</p>
          <p className="text-sm text-astra-gray">Spend your points in the perks marketplace to claim one.</p>
        </Panel>
      )}
      <ul className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
        {vouchers.data?.map((v) => (
          <li key={v.id} className="space-y-3 border border-astra-primary-dark bg-black/30 p-4">
            <div role="img" aria-label="Voucher image placeholder" className="grid aspect-[3/1] place-items-center border border-dashed border-astra-primary-dark text-sm text-astra-gray">
              Voucher image placeholder
            </div>
            <h3 className="break-words">{v.title}</h3>
            <p className="break-all text-sm text-astra-gray">{v.code}</p>
            <p className="text-sm">Status: <strong>{v.status === 'Active' ? '✔ Active' : `✖ ${v.status}`}</strong></p>
            <Link to={`/vouchers/${v.id}`} state={{ from: '/vouchers' }} className={btnSecondary}>
              View Details<span className="sr-only"> for {v.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
