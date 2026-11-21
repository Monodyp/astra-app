import React from 'react';
import { Link } from 'react-router-dom';
import {
  ErrorState,
  LoadingState,
  btnSecondary,
} from '../../../components/mobile/ui.js';
import { portalData } from '../../../data/index.js';
import { useResource } from '../../../lib/useResource.js';
import { VOUCHER_STATUS, voucherTitle } from '../mobile/voucherText.js';

const loadVouchers = () => portalData.listVouchers();

export const DesktopVouchers: React.FC = () => {
  const vouchers = useResource(loadVouchers);

  if (vouchers.status === 'loading') {
    return <LoadingState label="Loading vouchers" />;
  }
  if (vouchers.status === 'error') {
    return <ErrorState error={vouchers.error} onRetry={vouchers.reload} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold">Claimed Vouchers</h2>
          <p className="mt-2 text-sm text-astra-gray">
            Your wallet of claimed partner vouchers.
          </p>
        </div>
        <Link to="/marketplace" className={btnSecondary + ' w-auto px-6'}>
          Browse Perks
        </Link>
      </div>

      {vouchers.data.length === 0 ? (
        <div className="border border-astra-primary-dark p-10 text-center">
          <p role="status" className="font-bold">You have not claimed any vouchers yet.</p>
          <p className="mt-2 text-sm text-astra-gray">
            Spend your points in the perks marketplace to claim one.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-6">
          {vouchers.data.map((voucher) => {
            const status = VOUCHER_STATUS[voucher.state];
            return (
              <li key={voucher.id} className="flex flex-col gap-4 border border-astra-primary-dark bg-black/30 p-5">
                <div role="img" aria-label="Voucher image placeholder" className="grid aspect-[2/1] place-items-center border border-dashed border-astra-primary-dark text-sm text-astra-gray">
                  Image
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <h3 className="text-base font-bold">{voucherTitle(voucher)}</h3>
                  <p className="break-all text-sm text-astra-gray">{voucher.code}</p>
                  <p className="text-sm">
                    Status:{' '}
                    <strong className={voucher.state === 'ready' ? 'text-astra-primary-light' : 'text-amber-300'}>
                      {status === 'Active' ? '✔ Active' : `✖ ${status}`}
                    </strong>
                  </p>
                </div>
                <Link
                  to={`/vouchers/${voucher.id}`}
                  state={{ from: '/vouchers' }}
                  className={btnSecondary}
                >
                  View Details
                  <span className="sr-only"> for {voucherTitle(voucher)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
