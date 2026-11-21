import React, { useCallback, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ErrorState, LoadingState } from '../components/portal/StatusViews.js';
import { secondaryButton } from '../components/portal/buttons.js';
import { isDataError, portalData, type Voucher } from '../data/index.js';
import { errorMessage, formatLongDate } from '../lib/format.js';
import { useResource } from '../lib/useResource.js';
import {
  VOUCHER_STATE_LABELS,
  scannableVoucherQr,
  voucherTitle,
} from '../lib/vouchers.js';

interface ReceiptState {
  from?: string;
  voucher?: Voucher;
}

const Receipt: React.FC<{ voucher: Voucher; claimed: boolean }> = ({ voucher, claimed }) => {
  const qr = scannableVoucherQr(voucher);
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-wide text-astra-primary-light">
        {claimed ? 'Voucher claimed' : 'Voucher'}
      </p>
      <h2 id="voucher-title" className="sr-only">
        {claimed ? `Voucher Claimed: ${voucherTitle(voucher)}` : voucherTitle(voucher)}
      </h2>
      <h2 className="break-words text-xl font-bold">{voucherTitle(voucher)}</h2>
      {voucher.partnerName && <p className="text-sm text-astra-gray">{voucher.partnerName}</p>}
      {!voucher.reward && (
        <p className="text-sm text-astra-gray">
          The perk for this voucher is no longer listed. The code and dates below still apply.
          <span className="sr-only">Perk details unavailable.</span>
        </p>
      )}
      <p className="break-all border border-astra-primary-dark p-4 text-center font-mono text-lg font-bold tracking-wide"
        aria-label={`Voucher code ${voucher.code}`}>
        {voucher.code}
      </p>
      {voucher.state !== 'ready' && (
        <p role="status" className="border-2 border-red-400 p-3 text-center font-bold text-red-200">
          {voucher.state === 'expired' ? '✖ EXPIRED · cannot be redeemed' : 'Already redeemed'}
        </p>
      )}
      {!scannableVoucherQr(voucher) && voucher.state === 'ready' && (
        <p className="border border-astra-primary-dark p-3 text-center text-sm text-astra-gray">
          Redemption QR unavailable
        </p>
      )}
      {qr && (
        <figure className="mx-auto w-full max-w-[220px]">
          <div className="bg-white p-3">
            <QRCodeSVG value={qr} size={256} role="img" aria-label="Redemption QR code"
              style={{ width: '100%', height: '100%' }} />
          </div>
          <figcaption className="mt-2 text-center text-xs text-astra-gray">
            Demo voucher QR. Partners can scan it only in this demo.
          </figcaption>
        </figure>
      )}
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-astra-gray">Status</dt>
          <dd className="font-bold">{VOUCHER_STATE_LABELS[voucher.state]}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-astra-gray">Claimed</dt>
          <dd className="font-bold">{formatLongDate(voucher.claimedAt)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-astra-gray">Expiration Date</dt>
          <dd className="font-bold">{formatLongDate(voucher.expiresAt)}</dd>
        </div>
        {voucher.redeemedAt && (
          <div className="flex justify-between gap-4">
            <dt className="text-astra-gray">Redeemed</dt>
            <dd className="font-bold">{formatLongDate(voucher.redeemedAt)}</dd>
          </div>
        )}
      </dl>
      {voucher.instructions.length > 0 && (
        <>
          <h3 className="font-bold">Terms of Use</h3>
          <ul className="space-y-2">
            {voucher.instructions.map((line) => (
              <li key={line} className="border border-astra-primary-dark p-3 text-sm">{line}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
};

const VoucherBody: React.FC<{ id: string; issued: Voucher | null }> = ({ id, issued }) => {
  const load = useCallback(
    () => (issued ? Promise.resolve(issued) : portalData.getVoucher(id)),
    [id, issued]
  );
  const voucher = useResource(load);

  if (voucher.status === 'loading') return <LoadingState label="Loading voucher" />;
  if (voucher.status === 'error') {
    if (isDataError(voucher.error) && voucher.error.code === 'not_found') {
      return (
        <div role="alert" className="space-y-3">
          <h2 id="voucher-title" className="text-lg font-bold">Voucher not found</h2>
          <p className="text-sm text-astra-gray">
            This voucher does not exist or does not belong to your account.
          </p>
          <Link to="/vouchers" replace className={secondaryButton}>Back to claimed vouchers</Link>
        </div>
      );
    }
    return <ErrorState message={errorMessage(voucher.error)} onRetry={voucher.reload} />;
  }
  return <Receipt voucher={voucher.data} claimed={issued !== null} />;
};

export const VoucherDetails: React.FC = () => {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as ReceiptState;
  const backTo = state.from ?? '/vouchers';
  const issued = state.voucher?.id === id ? state.voucher : null;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') navigate(backTo, { replace: true });
      if (event.key === 'Tab' && dialog) {
        const items = Array.from(dialog.querySelectorAll<HTMLElement>('a[href],button:not([disabled])'));
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [backTo, navigate]);

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <h2 className="sr-only">Voucher Details</h2>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="voucher-title"
        className="mx-auto w-full max-w-md space-y-4 border border-astra-primary-dark bg-astra-black p-5 font-astra outline-none sm:p-6">
        <VoucherBody key={id} id={id} issued={issued} />
        <button type="button" className={`${secondaryButton} w-full`}
          onClick={() => navigate(backTo, { replace: true })}>Close</button>
      </div>
    </div>
  );
};
