import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  ErrorState,
  LoadingState,
  btnSecondary,
  formatDate,
} from '../../../components/mobile/ui.js';
import { portalData, type Voucher } from '../../../data/index.js';
import { scannableVoucherQr } from '../../../lib/vouchers.js';
import { useResource } from '../../../lib/useResource.js';
import { VOUCHER_STATUS, voucherTitle } from '../mobile/voucherText.js';

const loadVouchers = () => portalData.listVouchers();

const TABS = ['Active', 'Used'] as const;
type Tab = (typeof TABS)[number];

function monogram(name: string | null): string {
  const words = (name ?? 'ASTRA').trim().split(/\s+/);
  return words
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase();
}

function activeTab(voucher: Voucher): Tab {
  return voucher.state === 'ready' ? 'Active' : 'Used';
}

const BarcodeDialog: React.FC<{
  voucher: Voucher;
  onClose: () => void;
}> = ({ voucher, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const qr = scannableVoucherQr(voucher);

  useEffect(() => {
    const el = ref.current;
    el?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !el) return;
      const focusable = Array.from(
        el.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-6">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="barcode-h"
        className="w-full max-w-md space-y-5 border border-astra-primary-dark bg-astra-black p-7 shadow-2xl"
      >
        <h2 id="barcode-h" className="text-2xl font-bold">
          Show barcode
        </h2>
        <p className="text-lg">{voucherTitle(voucher)}</p>
        {qr ? (
          <figure className="mx-auto w-56">
            <QRCodeSVG
              value={qr}
              size={224}
              marginSize={2}
              role="img"
              aria-label="Voucher barcode"
              className="h-auto w-full bg-white"
            />
            <figcaption className="mt-2 text-center text-xs font-bold uppercase tracking-wide text-amber-300">
              Demo barcode · works only in this demo
            </figcaption>
          </figure>
        ) : (
          <p role="status" className="border border-dashed border-astra-primary-dark p-6 text-center text-sm text-astra-gray">
            Barcode unavailable: it must be issued by the ASTRA backend.
          </p>
        )}
        <p className="break-all text-center font-bold">{voucher.code}</p>
        <p className="text-center text-sm text-astra-gray">
          Expires {formatDate(voucher.expiresAt)}
        </p>
        <button type="button" className={btnSecondary} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export const DesktopVouchers: React.FC = () => {
  const vouchers = useResource(loadVouchers);
  const [tab, setTab] = useState<Tab>('Active');
  const [barcode, setBarcode] = useState<Voucher | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const closeBarcode = () => {
    setBarcode(null);
    setTimeout(() => triggerRef.current?.focus(), 0);
  };

  if (vouchers.status === 'loading') {
    return <LoadingState label="Loading vouchers" />;
  }
  if (vouchers.status === 'error') {
    return <ErrorState error={vouchers.error} onRetry={vouchers.reload} />;
  }

  const counts: Record<Tab, number> = { Active: 0, Used: 0 };
  for (const voucher of vouchers.data) counts[activeTab(voucher)] += 1;
  const list = vouchers.data.filter((voucher) => activeTab(voucher) === tab);

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
        <>
          <nav
            aria-label="Filter vouchers by status"
            className="border-b border-astra-primary-dark"
          >
            <div className="flex gap-8">
              {TABS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={tab === item}
                  onClick={() => setTab(item)}
                  className={`border-b-2 px-1 py-3 text-sm font-bold ${
                    tab === item
                      ? 'border-astra-primary-light text-astra-primary-light'
                      : 'border-transparent text-astra-gray hover:text-astra-white'
                  }`}
                >
                  {item} ({counts[item]})
                </button>
              ))}
            </div>
          </nav>

          {list.length === 0 ? (
            <p
              role="status"
              className="border border-astra-primary-dark p-8 text-center text-astra-gray"
            >
              {tab === 'Active'
                ? 'No active vouchers yet.'
                : 'No used vouchers yet.'}
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-6">
              {list.map((voucher) => {
                const status = VOUCHER_STATUS[voucher.state];
                const partner = voucher.partnerName ?? 'ASTRA Partner';
                const qr = scannableVoucherQr(voucher);
                return (
                  <li
                    key={voucher.id}
                    className="flex flex-col gap-4 border border-astra-primary-dark bg-black/30 p-5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        role="img"
                        aria-label={`${partner} merchant logo`}
                        className="grid h-12 w-12 shrink-0 place-items-center border border-astra-primary-dark bg-black/40 text-lg font-bold text-astra-primary-light"
                      >
                        {monogram(voucher.partnerName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{partner}</p>
                        {voucher.categoryLabel && (
                          <p className="truncate text-xs uppercase tracking-wide text-astra-gray">
                            {voucher.categoryLabel}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-base font-bold">{voucherTitle(voucher)}</h3>
                      <p className="mt-1 break-all text-sm text-astra-gray">
                        {voucher.code}
                      </p>
                    </div>

                    <p className="text-sm text-astra-gray">
                      Expires {formatDate(voucher.expiresAt)}
                    </p>
                    <p className="text-sm">
                      Status:{' '}
                      <strong
                        className={
                          voucher.state === 'ready'
                            ? 'text-astra-primary-light'
                            : 'text-amber-300'
                        }
                      >
                        {status === 'Active' ? '✔ Active' : `✖ ${status}`}
                      </strong>
                    </p>

                    <div className="flex gap-3">
                      {qr && (
                        <button
                          type="button"
                          className={btnSecondary + ' flex-1'}
                          onClick={(event) => {
                            triggerRef.current = event.currentTarget;
                            setBarcode(voucher);
                          }}
                        >
                          Show Barcode
                          <span className="sr-only"> for {voucherTitle(voucher)}</span>
                        </button>
                      )}
                      <Link
                        to={`/vouchers/${voucher.id}`}
                        state={{ from: '/vouchers' }}
                        className={btnSecondary + ' flex-1'}
                      >
                        View Details
                        <span className="sr-only"> for {voucherTitle(voucher)}</span>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {barcode && <BarcodeDialog voucher={barcode} onClose={closeBarcode} />}
    </div>
  );
};
