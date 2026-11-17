import React, { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ErrorState, LoadingState, SampleQr, SimulatedNote, btnSecondary, formatDate } from '@/components/member/ui';
import { useMemberData, useMemberQuery } from '@/features/member/MemberDataContext';

interface NavState { from?: string; simulated?: boolean; message?: string }

/** Voucher receipt as an accessible full-screen dialog route: scrollable, Escape/Close return to the origin. */
export const VoucherDetails: React.FC = () => {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { fixture } = useMemberData();
  const state = (location.state ?? {}) as NavState;
  const backTo = state.from ?? '/vouchers';
  const voucher = useMemberQuery((s) => s.getVoucher(id), [id]);
  const ref = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(document.activeElement);

  const close = () => navigate(backTo, { replace: true });

  useEffect(() => {
    const el = ref.current;
    el?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(backTo, { replace: true });
      if (e.key === 'Tab' && el) {
        const f = Array.from(el.querySelectorAll<HTMLElement>('a[href],button:not([disabled])'));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const restore = opener.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (restore instanceof HTMLElement) restore.focus();
    };
  }, [backTo, navigate]);

  const v = voucher.data;
  const inactive = v && v.status !== 'Active';

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="voucher-h"
        className="mx-auto w-full max-w-md space-y-4 border border-astra-primary-dark bg-astra-black p-5 outline-none"
      >
        {voucher.status === 'loading' && <LoadingState label="Loading voucher" />}
        {voucher.status === 'error' && <ErrorState error={voucher.error} onRetry={voucher.reload} />}
        {voucher.status === 'ready' && !v && (
          <div role="alert" className="space-y-3">
            <h2 id="voucher-h" className="text-lg font-bold">Voucher not found</h2>
            <p className="text-sm text-astra-gray">This voucher does not exist or does not belong to you.</p>
            <Link to="/vouchers" replace className={btnSecondary}>Back to claimed vouchers</Link>
          </div>
        )}
        {v && (
          <>
            <h2 id="voucher-h" className="break-words text-lg font-bold">
              {state.simulated ? `Voucher Claimed: ${v.title}` : v.title}
            </h2>
            {state.simulated && state.message && <SimulatedNote>{state.message}</SimulatedNote>}
            <p className="break-all border border-astra-primary-dark p-4 text-center text-lg font-bold tracking-wide" aria-label={`Voucher code ${v.code}`}>
              {v.code}
            </p>
            {inactive && (
              <p role="status" className="border-2 border-red-400 p-3 text-center font-bold text-red-200">
                {v.status === 'Expired' ? '✖ EXPIRED · cannot be redeemed' : '✖ ALREADY REDEEMED'}
              </p>
            )}
            {!inactive && (
              fixture ? (
                <SampleQr seed={v.code} label="Redemption QR code (sample)" />
              ) : (
                <p role="status" className="border border-dashed border-astra-primary-dark p-6 text-center text-sm text-astra-gray">Redemption QR unavailable: it must be issued by the ASTRA backend.</p>
              )
            )}
            <p className="flex justify-between gap-4">
              <span>Expiration Date</span>
              <span className="font-bold">{formatDate(v.expiresOn)}</span>
            </p>
            <p className="flex justify-between gap-4">
              <span>Status</span>
              <span className="font-bold">{v.status}</span>
            </p>
            <h3 className="font-bold">Terms of Use</h3>
            <ul className="space-y-2">
              {v.terms.map((t) => (
                <li key={t} className="border border-astra-primary-dark p-3 text-sm">{t}</li>
              ))}
            </ul>
          </>
        )}
        <button type="button" className={btnSecondary} onClick={close}>Close</button>
      </div>
    </div>
  );
};
