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
import { errorMessage } from '../lib/format.js';
import { isUncertainFailure } from '../lib/idempotency.js';
import { useResource } from '../lib/useResource.js';
import { claimKeyFor, settleClaim } from '../features/rewards/claimKeys.js';
import { MerchantBadge } from '../features/rewards/MerchantBadge.js';
import { useAuth } from '../context/AuthContext.js';
import { Modal } from '../components/portal/Modal.js';
import { beginClaim } from '../features/rewards/claimRequest.js';

const loadCatalog = () => portalData.listPerks();
const loadVouchers = () => portalData.listVouchers();

const CATEGORY_ORDER = Object.keys(PERK_CATEGORY_LABELS) as PerkCategory[];

type Filter = 'all' | PerkCategory;

interface PendingClaim {
  perk: Perk;
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
  const { perk, submitting, uncertain, message } = claim;
  return (
    <Modal label="Claim this voucher?" onClose={onCancel} busy={submitting} className="max-w-md">
        <h2 id="claim-title" className="text-lg font-bold">
          Claim this voucher?
        </h2>
        <p className="break-words">{perk.name}</p>
        <p className="text-sm text-astra-gray">
          Cost: {perk.cost} PTS · Balance after: {balance - perk.cost} PTS
        </p>
        {submitting && <p role="status" className="text-sm text-astra-gray">Claiming your voucher…</p>}
        {message && (
          <p
            role="alert"
            className="border border-red-400/40 bg-red-950/30 px-4 py-3 text-sm text-red-200"
          >
            {message}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className={primaryButton}
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting
              ? 'Claiming…'
              : uncertain
                ? 'Retry claim'
                : 'Confirm claim'}
          </button>
          <button
            type="button"
            className={secondaryButton}
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
    </Modal>
  );
};

const PerkCard: React.FC<{
  perk: Perk;
  balance: number;
  onClaim: (perk: Perk, button: HTMLButtonElement) => void;
}> = ({ perk, balance, onClaim }) => {
  const shortBy = perk.cost - balance;
  const soldOut = perk.remainingStock !== null && perk.remainingStock <= 0;
  const limitReached = perk.remainingClaims <= 0;
  const blocked = soldOut
    ? 'This perk is out of stock.'
    : limitReached
      ? 'You reached the claim limit for this perk.'
      : shortBy > 0
        ? `Not enough points: you need ${shortBy} more PTS.`
        : null;
  const noteId = `perk-note-${perk.id}`;

  return (
    <Panel as="article" className="flex flex-col gap-4 p-6">
      <MerchantBadge name={perk.partner} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wide">
        <span className="text-astra-primary-light">{perk.eyebrow}</span>
        <span className="text-astra-gray">{perk.categoryLabel}</span>
      </div>
      <div className="border border-astra-primary-dark/80 bg-[#0c2633]/60 px-5 py-6">
        <p className="text-2xl font-bold">{perk.headline}</p>
        <p className="mt-1 text-sm text-astra-gray">{perk.subline}</p>
      </div>
      <div className="flex-1">
        <h2 className="break-words text-base font-bold">{perk.name}</h2>
        <p className="mt-1 text-sm text-astra-gray">{perk.partner}</p>
        <p className="mt-2 text-sm text-astra-white/80">{perk.description}</p>
        <p
          className="mt-2 text-sm text-astra-gray"
          aria-label="Remaining inventory"
        >
          {perk.remainingStock === null
            ? 'Unlimited stock'
            : perk.remainingStock > 0
              ? `${perk.remainingStock} remaining`
              : 'Out of stock'}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg font-bold">{perk.cost} PTS</p>
        {perk.featured && (
          <span className="rounded-full bg-[#0f2a3a] px-3 py-1 text-[10px] font-bold uppercase text-astra-primary-light">
            Featured
          </span>
        )}
      </div>
      <button
        type="button"
        className={primaryButton}
        disabled={blocked !== null}
        aria-describedby={blocked ? noteId : undefined}
        aria-label={`Claim ${perk.name}`}
        onClick={(event) => onClaim(perk, event.currentTarget)}
      >
        Claim Voucher
      </button>
      {blocked && (
        <p id={noteId} className="text-sm text-amber-300">
          {blocked}
        </p>
      )}
    </Panel>
  );
};

export const Marketplace: React.FC = () => {
  const catalog = useResource(loadCatalog);
  const vouchers = useResource(loadVouchers);
  const { user } = useAuth();
  const currentUser = useRef(user);
  currentUser.current = user;
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [claim, setClaim] = useState<PendingClaim | null>(null);
  const request = useRef<ReturnType<typeof beginClaim> | null>(null);
  const mounted = useRef(true);
  const submitting = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => () => { request.current?.cancel(); }, [user]);

  if (catalog.status === 'loading') {
    return <LoadingState label="Loading perks" />;
  }
  if (catalog.status === 'error') {
    return (
      <ErrorState
        message={errorMessage(catalog.error)}
        onRetry={catalog.reload}
      />
    );
  }

  const { perks, balance } = catalog.data;
  const shown = perks.filter(
    (perk) => filter === 'all' || perk.category === filter
  );

  function open(perk: Perk, button: HTMLButtonElement) {
    button.focus();
    setClaim({
      perk,
      submitting: false,
      uncertain: false,
      message: null,
    });
  }

  function cancel() {
    setClaim(null);
  }

  async function confirm() {
    if (!claim || submitting.current) return;
    submitting.current = true;
    const claimUser = user;
    const perk = claim.perk;
    const idempotencyKey = claimKeyFor(perk.id);
    const task = beginClaim(perk.id, idempotencyKey);
    request.current = task;
    setClaim({ ...claim, submitting: true, message: null });
    try {
      const result = await task.result;
      if (!mounted.current || currentUser.current !== claimUser) return;
      settleClaim(perk.id);
      if (result.status === 'claimed') {
        navigate(`/vouchers/${result.voucher.id}`, {
          state: { from: '/marketplace', voucher: result.voucher },
        });
        return;
      }
      setClaim({
        perk,
        submitting: false,
        uncertain: false,
        message: result.message,
      });
    } catch (caught) {
      const uncertain = isUncertainFailure(caught);
      if (!mounted.current || currentUser.current !== claimUser) return;
      if (!uncertain) settleClaim(perk.id);
      setClaim({
        perk,
        submitting: false,
        uncertain,
        message: uncertain
          ? 'The portal could not confirm your claim. Retry to check it. You are charged only once.'
          : isDataError(caught)
            ? caught.message
            : errorMessage(caught),
      });
    } finally {
      if (request.current === task) {
        request.current = null;
        submitting.current = false;
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Rewards"
        title="Perks Marketplace"
        description="Spend your points on partner perks. Each claim adds a voucher to your wallet."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <p
          aria-live="polite"
          className="flex min-h-12 items-center justify-center border border-astra-primary-dark bg-black/40 px-4 text-center font-bold"
        >
          {balance} PTS Available
        </p>
        <Link
          to="/vouchers"
          className="flex min-h-12 items-center justify-center border border-astra-primary-dark bg-black/40 px-4 text-center font-bold transition-colors hover:border-astra-primary-light"
        >
          My Vouchers
          {vouchers.status === 'ready' && (
            <span className="ml-1" aria-hidden="true">
              (
              {
                vouchers.data.filter((voucher) => voucher.state === 'ready')
                  .length
              }
              )
            </span>
          )}
        </Link>
      </div>
      {vouchers.status === 'error' && (
        <p role="status" className="text-sm text-astra-gray">
          Your voucher count is unavailable.{' '}
          <button
            type="button"
            onClick={vouchers.reload}
            className="min-h-11 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-astra-primary-light"
          >
            Retry voucher count
          </button>
        </p>
      )}

      <div
        role="group"
        aria-label="Perk categories"
        className="flex gap-1 overflow-x-auto border-b border-astra-primary-dark [scrollbar-width:none]"
      >
        {(
          [
            'all',
            ...CATEGORY_ORDER.filter((category) =>
              perks.some((perk) => perk.category === category)
            ),
          ] as Filter[]
        ).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={filter === item}
            onClick={() => setFilter(item)}
            className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-bold transition-colors ${
              filter === item
                ? 'border-astra-primary-light text-astra-primary-light'
                : 'border-transparent text-astra-gray hover:text-astra-white'
            }`}
          >
            {item === 'all' ? 'All Perks' : PERK_CATEGORY_LABELS[item]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title="No perks here yet"
          message="No perks are in this category right now."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((perk) => (
            <PerkCard
              key={perk.id}
              perk={perk}
              balance={balance}
              onClaim={open}
            />
          ))}
        </div>
      )}

      {claim && (
        <ConfirmClaim
          claim={claim}
          balance={balance}
          onConfirm={() => void confirm()}
          onCancel={cancel}
        />
      )}
    </div>
  );
};
