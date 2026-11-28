import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeading } from '../components/portal/PageHeading.js';
import { Panel } from '../components/portal/Panel.js';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../components/portal/StatusViews.js';
import {
  primaryButton,
  secondaryButton,
} from '../components/portal/buttons.js';
import { portalData, type Voucher } from '../data/index.js';
import { errorMessage, formatShortDate } from '../lib/format.js';
import { useResource } from '../lib/useResource.js';
import {
  VOUCHER_STATE_LABELS,
  scannableVoucherBarcode,
  voucherTitle,
} from '../lib/vouchers.js';
import { MerchantBadge } from '../features/rewards/MerchantBadge.js';

const loadVouchers = () => portalData.listVouchers();

const stateClass: Record<Voucher['state'], string> = {
  ready: 'bg-[#0f2a3a] text-astra-primary-light',
  redeemed: 'bg-astra-white/15 text-astra-white',
  expired: 'bg-red-950/60 text-red-200',
};

const VoucherCard: React.FC<{ voucher: Voucher }> = ({ voucher }) => (
  <Panel as="article" className="flex w-full min-w-0 flex-col gap-4 p-6">
    <MerchantBadge name={voucher.partnerName} />
    <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-wide">
      <span className="text-astra-gray">
        {voucher.categoryLabel ?? 'Partner perk'}
      </span>
      <span className={`rounded-full px-3 py-1 ${stateClass[voucher.state]}`}>
        {VOUCHER_STATE_LABELS[voucher.state]}
      </span>
    </div>
    <div className="border border-astra-primary-dark/80 bg-[#0c2633]/60 px-5 py-5 text-center text-lg font-bold">
      {voucher.bannerLabel ?? voucher.partnerName ?? 'ASTRA voucher'}
    </div>
    <div className="flex-1">
      <h2 className="break-words font-bold">{voucherTitle(voucher)}</h2>
      {voucher.partnerName && (
        <p className="mt-1 text-sm text-astra-gray">{voucher.partnerName}</p>
      )}
      <p className="mt-2 break-all font-mono text-sm">{voucher.code}</p>
      <p className="mt-1 text-xs text-astra-gray">
        {voucher.state === 'redeemed' && voucher.redeemedAt
          ? `Redeemed ${formatShortDate(voucher.redeemedAt)}`
          : voucher.expiresAt ? `${voucher.state === 'expired' ? 'Expired' : 'Expires'} ${formatShortDate(voucher.expiresAt)}` : 'Expiration date unavailable'}
      </p>
    </div>
    {scannableVoucherBarcode(voucher) && (
      <Link
        to={`/vouchers/${voucher.id}#barcode`}
        state={{ from: '/vouchers' }}
        className={secondaryButton}
      >
        Show Barcode
        <span className="sr-only"> for {voucher.code}</span>
      </Link>
    )}
    <Link
      to={`/vouchers/${voucher.id}`}
      state={{ from: '/vouchers' }}
      className={secondaryButton}
    >
      View Details
      <span className="sr-only"> for {voucher.code}</span>
    </Link>
  </Panel>
);

export const Vouchers: React.FC = () => {
  const vouchers = useResource(loadVouchers);
  const [filter, setFilter] = useState<'all' | Voucher['state']>('all');
  const shown =
    vouchers.data?.filter(
      (voucher) => filter === 'all' || voucher.state === filter
    ) ?? [];

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Rewards"
        title="Claimed Vouchers"
        description="Show a ready voucher to partner staff together with your digital ID."
        aside={
          <Link
            to="/marketplace"
            className={`${primaryButton} shrink-0 sm:self-start md:self-auto`}
          >
            Browse Perks
          </Link>
        }
      />
      {vouchers.status === 'loading' && (
        <LoadingState label="Loading your vouchers" />
      )}
      {vouchers.status === 'error' && (
        <ErrorState
          message={errorMessage(vouchers.error)}
          onRetry={vouchers.reload}
        />
      )}
      {vouchers.status === 'ready' &&
        (vouchers.data.length === 0 ? (
          <EmptyState
            title="No vouchers yet"
            message="Spend your points in the perks marketplace to claim one."
          />
        ) : (
          <>
            <div
              role="group"
              aria-label="Filter vouchers by status"
              className="flex flex-wrap gap-2 border-b border-astra-primary-dark"
            >
              {(['all', 'ready', 'redeemed', 'expired'] as const).map(
                (state) => (
                  <button
                    key={state}
                    type="button"
                    aria-pressed={filter === state}
                    onClick={() => setFilter(state)}
                    className={`min-h-11 border-b-2 px-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-astra-primary-light ${filter === state ? 'border-astra-primary-light text-astra-primary-light' : 'border-transparent text-astra-gray hover:text-astra-white'}`}
                  >
                    {state === 'all' ? 'All' : VOUCHER_STATE_LABELS[state]} (
                    {
                      vouchers.data.filter(
                        (voucher) => state === 'all' || voucher.state === state
                      ).length
                    }
                    )
                  </button>
                )
              )}
            </div>
            {shown.length === 0 ? (
              <EmptyState
                title={`No ${filter === 'all' ? '' : VOUCHER_STATE_LABELS[filter].toLowerCase() + ' '}vouchers`}
                message="Choose another status to see your other vouchers."
              />
            ) : (
              <ul
                aria-label="Claimed vouchers"
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
              >
                {shown.map((voucher) => (
                  <li key={voucher.id} className="flex min-w-0">
                    <VoucherCard voucher={voucher} />
                  </li>
                ))}
              </ul>
            )}
          </>
        ))}
    </div>
  );
};
