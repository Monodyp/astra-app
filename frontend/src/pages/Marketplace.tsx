import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import {
  PERK_CATEGORY_LABELS,
  isDataError,
  portalData,
  type Perk,
  type PerkCategory,
} from '../data/index.js';
import { claimKeyFor, settleClaim } from '../features/rewards/claimKeys.js';
import { errorMessage } from '../lib/format.js';
import { isUncertainFailure } from '../lib/idempotency.js';
import { useResource } from '../lib/useResource.js';

const loadCatalog = () => portalData.listPerks();
const loadVouchers = () => portalData.listVouchers();
const CATEGORY_ORDER = Object.keys(PERK_CATEGORY_LABELS) as PerkCategory[];
const FILTER_LABELS: Record<PerkCategory, string> = {
  discount: 'Discounts',
  merch: 'Merch',
  workshop: 'Partner Workshops',
  food: 'Food',
};
type Filter = 'all' | PerkCategory;

interface PendingClaim {
  perk: Perk;
  key: string | null;
  submitting: boolean;
  uncertain: boolean;
  message: string | null;
}

const ConfirmClaim: React.FC<{
  claim: PendingClaim;
  balance: number;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ claim, balance, onConfirm, onCancel }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !claim.submitting) onCancel();
      if (event.key === 'Tab' && dialog) {
        const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
        if (!buttons.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [claim.submitting, onCancel]);

  const after = balance - claim.perk.cost;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="claim-title"
        className="max-h-[90dvh] w-full max-w-md space-y-4 overflow-y-auto border border-astra-primary-dark bg-astra-black p-6">
        <h2 id="claim-title" className="text-lg font-bold">Claim this voucher?</h2>
        <p className="break-words">{claim.perk.name}</p>
        <p className="text-sm text-astra-gray">Cost: {claim.perk.cost} PTS · Balance after: {after} PTS</p>
        {claim.message && (
          <p role="alert" className="border border-red-400/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            Error: {claim.message}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" className={primaryButton} onClick={onConfirm} disabled={claim.submitting}>
            {claim.submitting ? 'Claiming…' : 'Confirm claim'}
          </button>
          <button type="button" className={secondaryButton} onClick={onCancel} disabled={claim.submitting}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export const Marketplace: React.FC = () => {
  const catalog = useResource(loadCatalog);
  const vouchers = useResource(loadVouchers);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [claim, setClaim] = useState<PendingClaim | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  if (catalog.status === 'loading') return <LoadingState label="Loading perks" />;
  if (catalog.status === 'error') {
    return <ErrorState message={errorMessage(catalog.error)} onRetry={catalog.reload} />;
  }

  const { perks, balance } = catalog.data;
  const shown = perks.filter((perk) => filter === 'all' || perk.category === filter);

  function open(perk: Perk, button: HTMLButtonElement) {
    opener.current = button;
    setClaim({ perk, key: claimKeyFor(perk.id), submitting: false, uncertain: false, message: null });
  }

  function cancel() {
    if (claim) settleClaim(claim.perk.id);
    setClaim(null);
    window.setTimeout(() => opener.current?.focus(), 0);
  }

  async function confirm() {
    if (!claim || claim.submitting) return;
    const { perk } = claim;
    const key = claim.key ?? claimKeyFor(perk.id);
    setClaim({ ...claim, key, submitting: true, message: null });
    try {
      const result = await portalData.claimPerk(perk.id, { idempotencyKey: key });
      if (!mounted.current) return;
      settleClaim(perk.id);
      if (result.status === 'claimed') {
        navigate(`/vouchers/${result.voucher.id}`, {
          state: { from: '/marketplace', voucher: result.voucher },
        });
      } else {
        setClaim({ perk, key: null, submitting: false, uncertain: false, message: result.message });
      }
    } catch (caught) {
      if (!mounted.current) return;
      const uncertain = isUncertainFailure(caught);
      if (!uncertain) settleClaim(perk.id);
      setClaim({
        perk,
        key: uncertain ? key : null,
        submitting: false,
        uncertain,
        message: uncertain
          ? 'The claim could not be confirmed. Confirm again to check it. You are charged only once.'
          : isDataError(caught) ? caught.message : errorMessage(caught),
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading eyebrow="Rewards" title="Perks Marketplace"
        description="Spend your points on partner perks. Each claim adds a voucher to your wallet." />
      <div className="grid gap-3 sm:grid-cols-2">
        <p aria-live="polite" className="flex min-h-12 items-center justify-center border border-astra-primary-dark bg-black/40 px-4 text-center font-bold">
          {balance} PTS Available
        </p>
        <Link to="/vouchers" className="flex min-h-12 items-center justify-center border border-astra-primary-dark bg-black/40 px-4 text-center font-bold transition-colors hover:border-astra-primary-light">
          My Vouchers{vouchers.status === 'ready'
            ? ` (${vouchers.data.filter((voucher) => voucher.state === 'ready').length})`
            : ''}
        </Link>
      </div>
      <div role="group" aria-label="Perk categories" className="flex gap-1 overflow-x-auto border-b border-astra-primary-dark [scrollbar-width:none]">
        {(['all', ...CATEGORY_ORDER] as Filter[]).map((item) => (
          <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}
            className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-bold transition-colors ${filter === item ? 'border-astra-primary-light text-astra-primary-light' : 'border-transparent text-astra-gray hover:text-astra-white'}`}>
            {item === 'all' ? 'All Perks' : FILTER_LABELS[item]}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState title="No perks here yet" message="No perks are in this category right now." />
      ) : (
        <ul aria-label="Partner perks" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((perk) => {
            const shortBy = perk.cost - balance;
            const soldOut = perk.remainingStock !== null && perk.remainingStock <= 0;
            const limitReached = perk.remainingClaims <= 0;
            const blocked = soldOut ? 'This perk is out of stock.'
              : limitReached ? 'You reached the claim limit for this perk.'
              : shortBy > 0 ? `Not enough points: you need ${shortBy} more PTS.` : null;
            const noteId = `perk-note-${perk.id}`;
            return (
              <li key={perk.id} className="flex">
              <Panel as="article" className="flex w-full flex-col gap-4 p-5 sm:p-6">
                <span role="img" aria-label="Perk image placeholder" className="sr-only" />
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wide">
                  <span className="text-astra-primary-light">{perk.eyebrow}</span>
                  <span className="text-astra-gray">{perk.categoryLabel}</span>
                </div>
                <div className="border border-astra-primary-dark/80 bg-[#0c2633]/60 px-5 py-6">
                  <p className="text-2xl font-bold">{perk.headline}</p>
                  <p className="mt-1 text-sm text-astra-gray">{perk.subline}</p>
                </div>
                <div className="flex-1">
                  <h3 className="break-words text-base font-bold">{perk.name}</h3>
                  <p className="mt-1 text-sm text-astra-gray">{perk.partner}</p>
                  <p className="mt-2 text-sm text-astra-white/80">{perk.description}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-lg font-bold">{perk.cost} PTS</p>
                  {perk.featured && <span className="rounded-full bg-[#0f2a3a] px-3 py-1 text-[10px] font-bold uppercase text-astra-primary-light">Featured</span>}
                </div>
                <button type="button" className={primaryButton} disabled={shortBy > 0}
                  aria-describedby={blocked ? noteId : undefined}
                  onClick={(event) => open(perk, event.currentTarget)}>Claim Voucher</button>
                {blocked && <p id={noteId} className="text-sm text-amber-300">{blocked}</p>}
              </Panel>
              </li>
            );
          })}
        </ul>
      )}
      {claim && <ConfirmClaim claim={claim} balance={balance} onConfirm={() => void confirm()} onCancel={cancel} />}
    </div>
  );
};
