import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ErrorState,
  LoadingState,
  btnPrimary,
  btnSecondary,
} from '../../../components/mobile/ui.js';
import { portalData, type Perk, type PerkCategory } from '../../../data/index.js';
import { errorMessage } from '../../../lib/format.js';
import { isUncertainFailure } from '../../../lib/idempotency.js';
import { useResource } from '../../../lib/useResource.js';
import { claimKeyFor, settleClaim } from '../claimKeys.js';

const CATEGORIES = [
  'All Perks',
  'Discounts',
  'Merch',
  'Partner Workshops',
  'Food',
] as const;

type Category = (typeof CATEGORIES)[number];

const CATEGORY_KEYS: Record<Exclude<Category, 'All Perks'>, PerkCategory> = {
  Discounts: 'discount',
  Merch: 'merch',
  'Partner Workshops': 'workshop',
  Food: 'food',
};

const UNCONFIRMED =
  'The claim could not be confirmed. Confirm again to check it. You are charged only once.';

const loadPerks = () => portalData.listPerks();
const loadVouchers = () => portalData.listVouchers();

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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
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
  }, [busy, onCancel]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-6">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-h"
        className="w-full max-w-lg space-y-5 border border-astra-primary-dark bg-astra-black p-7 shadow-2xl"
      >
        <h2 id="claim-h" className="text-2xl font-bold">
          Claim this voucher?
        </h2>
        <p className="text-lg">{perk.name}</p>
        <p className="text-astra-gray">
          Cost: {perk.cost} PTS · Balance after: {balance - perk.cost} PTS
        </p>
        {error && <p role="alert" className="text-red-300">Error: {error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className={btnPrimary} onClick={onConfirm} disabled={busy}>
            {busy ? 'Claiming…' : 'Confirm claim'}
          </button>
          <button type="button" className={btnSecondary} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export const DesktopMarketplace: React.FC = () => {
  const perks = useResource(loadPerks);
  const vouchers = useResource(loadVouchers);
  const [category, setCategory] = useState<Category>('All Perks');
  const [pending, setPending] = useState<Perk | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const claimButtonRef = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();

  if (perks.status === 'loading' || vouchers.status === 'loading') {
    return <LoadingState label="Loading marketplace" />;
  }
  if (perks.status === 'error') return <ErrorState error={perks.error} onRetry={perks.reload} />;
  if (vouchers.status === 'error') return <ErrorState error={vouchers.error} onRetry={vouchers.reload} />;

  const balance = perks.data.balance;
  const list = perks.data.perks.filter(
    (perk) => category === 'All Perks' || perk.category === CATEGORY_KEYS[category]
  );
  const activeCount = vouchers.data.filter((voucher) => voucher.state === 'ready').length;

  const confirm = async () => {
    if (!pending || busy) return;
    const perkId = pending.id;
    setBusy(true);
    setError(null);
    try {
      const result = await portalData.claimPerk(perkId, {
        idempotencyKey: claimKeyFor(perkId),
      });
      settleClaim(perkId);
      if (result.status === 'claimed') {
        setPending(null);
        navigate(`/vouchers/${result.voucher.id}`, {
          state: { from: '/marketplace', voucher: result.voucher },
        });
      } else {
        setError(result.message);
      }
    } catch (claimError) {
      const uncertain = isUncertainFailure(claimError);
      if (!uncertain) settleClaim(perkId);
      setError(uncertain ? UNCONFIRMED : errorMessage(claimError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold">Perks Marketplace</h2>
          <p className="mt-2 text-sm text-astra-gray">
            Partner Perks &amp; Rewards · Use your points to claim exclusive partner discounts, merchandise, and experiences.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className="border border-astra-primary-dark px-5 py-3 font-bold">
            {balance} PTS Available
          </p>
          <Link to="/vouchers" className={btnSecondary + ' w-auto px-5'}>
            My Vouchers{activeCount ? ` (${activeCount})` : ''}
          </Link>
        </div>
      </div>

      <nav aria-label="Perk categories" className="border-b border-astra-primary-dark">
        <div className="flex gap-8">
          {CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={`border-b-2 px-1 py-3 text-sm font-bold ${
                category === item
                  ? 'border-astra-primary-light text-astra-primary-light'
                  : 'border-transparent text-astra-gray hover:text-astra-white'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </nav>

      {list.length === 0 ? (
        <p role="status" className="border border-astra-primary-dark p-8 text-center text-astra-gray">
          No perks in this category yet.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-6">
          {list.map((perk) => {
            const short = perk.cost > balance;
            return (
              <li key={perk.id} className="flex flex-col gap-4 border border-astra-primary-dark bg-black/30 p-5">
                <div className="flex min-h-10 items-center gap-2">
                  <span className="border border-astra-primary-dark px-3 py-2 text-xs font-bold uppercase tracking-wide">
                    {perk.partner}
                  </span>
                  {perk.featured && (
                    <span className="border border-astra-primary-dark px-3 py-2 text-xs font-bold">
                      Featured Partner Perk
                    </span>
                  )}
                </div>
                <div role="img" aria-label="Perk image placeholder" className="grid aspect-[2/1] place-items-center border border-dashed border-astra-primary-dark text-sm text-astra-gray">
                  Image
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <h3 className="text-base font-bold">{perk.name}</h3>
                  <p className="text-lg font-bold">{perk.cost} PTS</p>
                  <p className="text-sm text-astra-gray" aria-label="Remaining inventory">
                    {perk.remainingStock === null
                      ? 'Unlimited stock'
                      : perk.remainingStock > 0
                        ? `${perk.remainingStock} remaining`
                        : 'Out of stock'}
                  </p>
                </div>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={short}
                  aria-describedby={short ? `desktop-short-${perk.id}` : undefined}
                  onClick={(event) => {
                    claimButtonRef.current = event.currentTarget;
                    setError(null);
                    setPending(perk);
                  }}
                >
                  Claim Voucher
                </button>
                {short && (
                  <p id={`desktop-short-${perk.id}`} className="text-sm text-amber-300">
                    Not enough points: you need {perk.cost - balance} more PTS.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pending && (
        <ConfirmClaim
          perk={pending}
          balance={balance}
          busy={busy}
          error={error}
          onConfirm={confirm}
          onCancel={() => {
            setPending(null);
            setTimeout(() => claimButtonRef.current?.focus(), 0);
          }}
        />
      )}
    </div>
  );
};
