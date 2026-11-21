import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ErrorState, LoadingState, btnSecondary, formatDate } from '../../../components/mobile/ui.js';
import { portalData, type Voucher } from '../../../data/index.js';
import { isDataError } from '../../../data/index.js';
import { scannableVoucherQr } from '../../../lib/vouchers.js';
import { VOUCHER_STATUS, voucherTitle } from '../mobile/voucherText.js';
import { DesktopMarketplace } from './DesktopMarketplace.js';

interface NavState {
  from?: string;
  voucher?: Voucher;
}

export const DesktopVoucherDetails: React.FC = () => {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as NavState;
  const backTo = state.from ?? '/vouchers';
  const issued = state.voucher?.id === id ? state.voucher : null;
  const [voucher, setVoucher] = useState<Voucher | null>(issued);
  const [loading, setLoading] = useState(!issued);
  const [error, setError] = useState<unknown>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (issued) return;
    let active = true;
    setLoading(true);
    setError(null);
    portalData.getVoucher(id).then(
      (value) => {
        if (active) setVoucher(value);
      },
      (reason: unknown) => {
        if (active) {
          if (isDataError(reason) && reason.code === 'not_found') setVoucher(null);
          else setError(reason);
        }
      }
    ).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id, issued]);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') navigate(backTo, { replace: true });
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [backTo, navigate]);

  const close = () => navigate(backTo, { replace: true });
  const qr = voucher ? scannableVoucherQr(voucher) : null;
  const inactive = voucher && voucher.state !== 'ready';

  return (
    <div className="relative">
      <DesktopMarketplace />
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-8">
        <div
          ref={ref}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="voucher-h"
          className="max-h-[90vh] w-full max-w-xl overflow-y-auto border border-astra-primary-dark bg-astra-black p-8 outline-none"
        >
          {loading && <LoadingState label="Loading voucher" />}
          {error !== null && <ErrorState error={error} />}
          {!loading && !error && !voucher && (
            <div role="alert" className="space-y-4">
              <h2 id="voucher-h" className="text-2xl font-bold">Voucher not found</h2>
              <p className="text-astra-gray">This voucher does not exist or does not belong to you.</p>
              <Link to="/vouchers" replace className={btnSecondary}>Back to claimed vouchers</Link>
            </div>
          )}
          {!loading && !error && voucher && (
            <div className="space-y-6">
              <h2 id="voucher-h" className="text-2xl font-bold">
                {issued ? `Voucher Claimed: ${voucherTitle(voucher)}` : voucherTitle(voucher)}
              </h2>
              <p className="border border-astra-primary-dark p-4 text-center font-bold tracking-wide">
                {voucher.code}
              </p>
              {inactive && (
                <p role="status" className="border-2 border-red-400 p-3 text-center font-bold text-red-200">
                  {voucher.state === 'expired' ? '✖ EXPIRED · cannot be redeemed' : '✖ ALREADY REDEEMED'}
                </p>
              )}
              {!inactive && (qr ? (
                <figure className="mx-auto w-56">
                  <QRCodeSVG value={qr} size={224} marginSize={2} role="img" aria-label="Redemption QR code" className="h-auto w-full bg-white" />
                  <figcaption className="mt-2 text-center text-xs font-bold uppercase tracking-wide text-amber-300">
                    Demo QR · works only in this demo
                  </figcaption>
                </figure>
              ) : (
                <p role="status" className="border border-dashed border-astra-primary-dark p-6 text-center text-sm text-astra-gray">
                  Redemption QR unavailable: it must be issued by the ASTRA backend.
                </p>
              ))}
              <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3 border-y border-astra-primary-dark py-4">
                <dt>Expiration Date</dt>
                <dd className="font-bold">{formatDate(voucher.expiresAt)}</dd>
                <dt>Status</dt>
                <dd className="font-bold">{VOUCHER_STATUS[voucher.state]}</dd>
              </dl>
              <div>
                <h3 className="mb-3 font-bold">Terms of Use</h3>
                <ul className="space-y-2">
                  {voucher.instructions.map((term) => <li key={term} className="border border-astra-primary-dark p-3 text-sm">{term}</li>)}
                </ul>
              </div>
            </div>
          )}
          <button type="button" className={btnSecondary + ' mt-6'} onClick={close}>Close</button>
        </div>
      </div>
    </div>
  );
};
