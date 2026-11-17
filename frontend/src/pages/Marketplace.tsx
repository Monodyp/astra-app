import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorState, LoadingState, Panel, SimulatedNote, btnPrimary, btnSecondary } from '@/components/member/ui';
import { useMemberData, useMemberQuery } from '@/features/member/MemberDataContext';
import type { Perk } from '@/features/member/types';

const CATEGORIES = ['All Perks', 'Discounts', 'Merch', 'Partner Workshops'] as const;

/** Accessible confirm dialog: focus trap, Escape to close, focus restore. */
const ConfirmClaim: React.FC<{
  perk: Perk;
  balance: number;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ perk, balance, busy, error, onConfirm, onCancel }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
      if (e.key === 'Tab' && el) {
        const f = Array.from(el.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="claim-h" className="max-h-[90dvh] w-full max-w-md space-y-3 overflow-y-auto border border-astra-primary-dark bg-astra-black p-5">
        <h2 id="claim-h" className="text-lg font-bold">Claim this voucher?</h2>
        <p className="break-words">{perk.title}</p>
        <p className="text-sm text-astra-gray">Cost: {perk.cost} PTS · Balance after: {balance - perk.cost} PTS</p>
        {error && <p role="alert" className="text-sm text-red-300">Error: {error}</p>}
        <button type="button" className={btnPrimary} onClick={onConfirm} disabled={busy}>
          {busy ? 'Claiming…' : 'Confirm claim'}
        </button>
        <button type="button" className={btnSecondary} onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </div>
  );
};

export const Marketplace: React.FC = () => {
  const perks = useMemberQuery((s) => s.getPerks());
  const points = useMemberQuery((s) => s.getPoints());
  const vouchers = useMemberQuery((s) => s.getVouchers());
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('All Perks');
  const [pending, setPending] = useState<Perk | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const claimBtnRef = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();
  const { source, fixture } = useMemberData();

  if (perks.status === 'error') return <ErrorState error={perks.error} onRetry={perks.reload} />;
  if (perks.status === 'loading' || !perks.data) return <LoadingState label="Loading perks" />;

  const balance = points.data?.balance ?? 0;
  const list = perks.data.filter((p) => cat === 'All Perks' || p.category === cat);
  const activeCount = (vouchers.data ?? []).filter((v) => v.status === 'Active').length;

  const confirm = async () => {
    if (!pending || busy) return; // blocks repeat submissions
    setBusy(true);
    setError(null);
    try {
      const res = await source.claimPerk(pending.id);
      setPending(null);
      navigate(`/vouchers/${res.voucher.id}`, { state: { from: '/marketplace', simulated: res.simulated, message: res.message } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Partner Perks &amp; Rewards</h2>
      <div className="grid grid-cols-2 gap-3">
        <p className="flex min-h-12 items-center justify-center border border-astra-primary-dark px-2 text-center font-bold" aria-live="polite">
          {points.data ? `${balance} PTS Available` : '— PTS'}
        </p>
        <Link to="/vouchers" className="flex min-h-12 items-center justify-center border border-astra-primary-dark px-2 text-center font-bold hover:bg-astra-primary-dark/40">
          My Vouchers{vouchers.data ? ` (${activeCount})` : ''}
        </Link>
      </div>

      <div role="group" aria-label="Perk categories" className="flex gap-1 overflow-x-auto border-b border-astra-primary-dark [scrollbar-width:none]">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={cat === c}
            onClick={() => setCat(c)}
            className={`min-h-11 shrink-0 px-3 text-sm ${cat === c ? 'font-bold text-astra-primary-light underline underline-offset-8' : 'text-astra-gray hover:text-astra-white'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {list.length === 0 && <Panel><p role="status">No perks in this category yet.</p></Panel>}
      <ul className="space-y-4">
        {list.map((p) => {
          const short = p.cost > balance;
          return (
            <li key={p.id} className="space-y-3 border border-astra-primary-dark bg-black/30 p-4">
              <p className="inline-block border border-astra-primary-dark px-3 py-2 text-sm">{p.partner} <span className="text-astra-gray">(sample)</span></p>
              {p.featured && <p className="border border-astra-primary-dark px-3 py-2 text-center text-sm">Featured Partner Perk</p>}
              <div role="img" aria-label="Perk image placeholder" className="grid aspect-[2/1] place-items-center border border-dashed border-astra-primary-dark text-sm text-astra-gray">
                Perk image placeholder
              </div>
              <h3 className="break-words text-base">{p.title}</h3>
              <p className="text-lg font-bold">{p.cost} PTS</p>
              <button
                type="button"
                className={btnPrimary}
                disabled={short}
                aria-describedby={short ? `short-${p.id}` : undefined}
                onClick={(e) => { claimBtnRef.current = e.currentTarget; setError(null); setPending(p); }}
              >
                Claim Voucher
              </button>
              {short && (
                <p id={`short-${p.id}`} className="text-sm text-amber-300">
                  Not enough points: you need {p.cost - balance} more PTS.
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {fixture && <SimulatedNote>Perk titles, partners and terms are sample content. Claims do not change real points.</SimulatedNote>}
      {pending && (
        <ConfirmClaim
          perk={pending}
          balance={balance}
          busy={busy}
          error={error}
          onConfirm={confirm}
          onCancel={() => { setPending(null); setTimeout(() => claimBtnRef.current?.focus(), 0); }}
        />
      )}
    </div>
  );
};
