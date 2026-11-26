import React, { useEffect, useId, useState } from 'react';
import { ChevronDown, IdCard } from 'lucide-react';
import { PageHeading } from '../components/portal/PageHeading.js';
import {
  GRANT_REASONS,
  isDataError,
  portalData,
  type GrantPointsResult,
  type MemberSearchResult,
} from '../data/index.js';
import { errorMessage } from '../lib/format.js';
import { isUncertainFailure, newIdempotencyKey } from '../lib/idempotency.js';

const MAX_GRANT = 1000;
const MAX_REFERENCE = 200;
const SEARCH_DELAY_MS = 200;

const fieldClass =
  'w-full border border-astra-white/15 bg-black/50 px-4 text-sm text-astra-white placeholder:text-astra-gray/70 focus:border-astra-primary-light focus:outline-none disabled:opacity-60';

type Search =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; results: MemberSearchResult[] }
  | { status: 'error'; message: string };

interface FrozenGrant {
  recipient: MemberSearchResult;
  amount: number;
  reason: string;
  referenceId: string;
  idempotencyKey: string;
}

type GrantOutcome =
  | { kind: 'recorded'; grant: FrozenGrant; result: GrantPointsResult }
  | { kind: 'already_recorded'; grant: FrozenGrant };

function memberIds(member: MemberSearchResult): string {
  return `ASTRA ID ${member.memberId} · Student ID ${member.studentId}`;
}

function memberStatus(member: MemberSearchResult): string {
  return member.membershipStatus === 'verified'
    ? 'Active member'
    : 'Inactive member';
}

const outcomeClass =
  'border border-[#4ade80]/40 bg-[#123524]/60 px-6 py-5 text-sm';

const GrantOutcomeView: React.FC<{ outcome: GrantOutcome }> = ({ outcome }) => {
  const name = outcome.grant.recipient.fullName;
  if (outcome.kind === 'already_recorded') {
    const { grant } = outcome;
    return (
      <section role="status" className={outcomeClass}>
        {typeof window !== 'undefined' &&
          window.matchMedia('(min-width: 1024px)').matches && (
            <h2 className="sr-only">Grant already recorded</h2>
          )}
        <p className="mt-1">
          ✔ An earlier attempt already recorded +{grant.amount} points for {name}{' '}
          for {grant.reason}. It was not recorded again.
        </p>
      </section>
    );
  }
  const { result } = outcome;
  return (
    <section role="status" className={outcomeClass}>
      <p className="mt-1">
        ✔ {name} received +{result.amount} points for {result.reason}.{' '}
        {result.balance
          ? `Balance went from ${result.balance.previous} to ${result.balance.current} pts.`
          : 'The grant is now in their ledger.'}
      </p>
    </section>
  );
};

export const OfficerGrantPoints: React.FC = () => {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<Search>({ status: 'idle' });
  const [selected, setSelected] = useState<MemberSearchResult | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [amount, setAmount] = useState('100');
  const [reason, setReason] = useState<string>(GRANT_REASONS[0]);
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<GrantOutcome | null>(null);
  const [pending, setPending] = useState<FrozenGrant | null>(null);

  const searchId = useId();
  const listId = useId();
  const amountId = useId();
  const amountHelpId = useId();
  const reasonId = useId();
  const referenceId = useId();
  const referenceHelpId = useId();
  const inactiveId = useId();

  useEffect(() => {
    setActiveIndex(-1);
    if (selected || query.trim() === '') {
      setSearch({ status: 'idle' });
      return;
    }
    let active = true;
    setSearch({ status: 'loading' });
    const timer = window.setTimeout(() => {
      portalData
        .searchMembers(query)
        .then((results) => {
          if (active) setSearch({ status: 'ready', results });
        })
        .catch((caught: unknown) => {
          if (active) {
            setSearch({ status: 'error', message: errorMessage(caught) });
          }
        });
    }, SEARCH_DELAY_MS);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, selected]);

  const points = Number(amount);
  const amountValid =
    Number.isInteger(points) && points >= 1 && points <= MAX_GRANT;
  const recipientActive = selected?.membershipStatus === 'verified';
  const frozen = pending !== null;
  const canGrant =
    !submitting &&
    (frozen || (selected !== null && recipientActive && amountValid));

  const results = search.status === 'ready' ? search.results : [];
  const showList = listOpen && search.status !== 'idle';
  const optionId = (index: number) => `${listId}-option-${index}`;

  function choose(member: MemberSearchResult) {
    setSelected(member);
    setQuery(member.fullName);
    setListOpen(false);
    setOutcome(null);
    setError(null);
  }

  function handleSearchKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length === 0) return;
      setListOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) =>
        index < 0 && step < 0
          ? results.length - 1
          : (index + step + results.length) % results.length
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (showList && results[activeIndex]) {
        choose(results[activeIndex]);
      }
    } else if (event.key === 'Escape' && showList) {
      event.preventDefault();
      setListOpen(false);
      setActiveIndex(-1);
    }
  }

  function clearSelection() {
    setSelected(null);
    setOutcome(null);
  }

  function refreshRecipient(
    recipient: MemberSearchResult,
    result: GrantPointsResult | null
  ) {
    const replace = (next: MemberSearchResult) =>
      setSelected((current) =>
        current?.memberId === next.memberId ? next : current
      );
    if (result?.balance) {
      replace({ ...recipient, balance: result.balance.current });
      return;
    }
    portalData
      .searchMembers(recipient.studentId)
      .then((matches) => {
        const match = matches.find(
          (item) => item.memberId === recipient.memberId
        );
        if (match) replace(match);
      })
      .catch(() => undefined);
  }

  function discardPending() {
    setPending(null);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      setError('Error: Search for and select a member.');
      return;
    }
    if (!amountValid) {
      setError(
        !Number.isInteger(points)
          ? 'Error: Points must be a whole number of at least 1.'
          : 'Error: Enter a points amount.'
      );
      return;
    }
    if (!canGrant) return;
    const retry = pending;
    const grant: FrozenGrant | null =
      retry ??
      (selected
        ? {
            recipient: selected,
            amount: points,
            reason,
            referenceId: reference.trim(),
            idempotencyKey: newIdempotencyKey(),
          }
        : null);
    if (!grant) return;
    setSubmitting(true);
    setError(null);
    setOutcome(null);
    try {
      const result = await portalData.grantPoints({
        studentId: grant.recipient.studentId,
        amount: grant.amount,
        reason: grant.reason,
        referenceId: grant.referenceId || undefined,
        idempotencyKey: grant.idempotencyKey,
      });
      setPending(null);
      setOutcome({ kind: 'recorded', grant, result });
      setReference('');
      refreshRecipient(grant.recipient, result);
    } catch (caught) {
      const conflict = isDataError(caught) && caught.code === 'conflict';
      if (conflict && retry) {
        setPending(null);
        setOutcome({ kind: 'already_recorded', grant });
        setReference('');
        refreshRecipient(grant.recipient, null);
      } else if (isUncertainFailure(caught)) {
        setPending(grant);
        setError(
          `The portal could not confirm the grant to ${grant.recipient.fullName}. Retry to send the same grant again. It is recorded only once.`
        );
      } else {
        setPending(null);
        setError(
          conflict
            ? `✖ A grant with this reference is already recorded for ${grant.recipient.fullName}. Use a different reference.`
            : errorMessage(caught)
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="05 / Officer Console"
        title="Officer Points"
        description="Recognize a member's contribution. Review before you grant."
      />

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-x-[138px]">
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-label="Grant points to a member"
          className="space-y-5"
        >
          <div>
            <label htmlFor={searchId} className="block text-sm font-bold">
              Search by ASTRA ID, student ID, or name
            </label>
            <div className="relative mt-3">
              <input
                id={searchId}
                role="combobox"
                aria-label={
                  typeof window !== 'undefined' &&
                  window.matchMedia('(min-width: 1024px)').matches
                    ? 'Search by ASTRA ID, student ID, or name'
                    : 'Search by Student ID or Name...'
                }
                aria-autocomplete="list"
                aria-expanded={showList}
                aria-controls={listId}
                aria-activedescendant={
                  showList && results[activeIndex]
                    ? optionId(activeIndex)
                    : undefined
                }
                value={query}
                disabled={frozen}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setListOpen(true);
                  if (selected) clearSelection();
                }}
                onKeyDown={handleSearchKey}
                onBlur={() => setListOpen(false)}
                placeholder="ASTR1D-XXXX, 2X-XXXXX, or member name"
                autoComplete="off"
                className={`${fieldClass} h-11`}
              />
              {showList && (
                <div className="absolute inset-x-0 top-full z-10 mt-1 border border-astra-white/15 bg-black shadow-lg">
                  {search.status === 'loading' && (
                    <p
                      role="status"
                      className="px-4 py-3 text-xs text-astra-gray"
                    >
                      Searching members…
                    </p>
                  )}
                  {search.status === 'error' && (
                    <p role="alert" className="px-4 py-3 text-xs text-red-300">
                      {search.message}
                    </p>
                  )}
                  {search.status === 'ready' && results.length === 0 && (
                    <p className="px-4 py-3 text-xs text-astra-gray">
                      No members match “{query.trim()}”.
                    </p>
                  )}
                  <div role="list" aria-label="Search results">
                  <ul
                    id={listId}
                    role={
                      typeof window !== 'undefined' &&
                      window.matchMedia('(min-width: 1024px)').matches
                        ? 'listbox'
                        : 'list'
                    }
                    aria-label={
                      typeof window !== 'undefined' &&
                      window.matchMedia('(min-width: 1024px)').matches
                        ? 'Matching members'
                        : 'Search results'
                    }
                    hidden={results.length === 0}
                  >
                    {results.map((member, index) => (
                      <li
                        key={member.memberId}
                        id={optionId(index)}
                        role="option"
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => choose(member)}
                        className={`cursor-pointer px-4 py-2 text-sm ${
                          index === activeIndex
                            ? 'bg-astra-primary-dark/60'
                            : 'hover:bg-astra-white/5'
                        }`}
                      >
                        <span
                          role="button"
                          tabIndex={-1}
                          aria-label={member.fullName}
                          className="block w-full text-left"
                        >
                          <span className="block font-bold">
                            {member.fullName}
                          </span>
                          <span className="block text-xs text-astra-gray">
                            {memberIds(member)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {selected && (
            <div
              role="region"
              aria-label="Selected member"
              className="flex flex-wrap items-center justify-between gap-4 border border-astra-primary-dark bg-[#0f2a3a]/60 px-5 py-5"
            >
              <div className="flex items-center gap-4">
                <IdCard
                  className="h-8 w-8 text-astra-white"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-lg font-bold">{selected.fullName}</p>
                  <p className="text-[10px] text-astra-gray">
                    {memberIds(selected)}
                  </p>
                  <p className="text-[10px] text-astra-gray">
                    {memberStatus(selected)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-medium uppercase text-astra-primary-light">
                  Selected
                </span>
                <button
                  type="button"
                  disabled={frozen}
                  onClick={() => {
                    clearSelection();
                    setQuery('');
                  }}
                  className="text-xs font-bold text-astra-gray underline underline-offset-2 hover:text-astra-white disabled:opacity-50"
                >
                  Change
                </button>
              </div>
            </div>
          )}

          {selected && !recipientActive && (
            <p
              id={inactiveId}
              className="border border-amber-400/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100"
            >
              {selected.fullName} cannot receive points because their membership
              is inactive. Points go only to members who paid their annual dues.
            </p>
          )}

          <div>
            <label htmlFor={amountId} className="block text-sm font-bold">
              Points Amount
            </label>
            <div className="relative mt-3">
              <input
                id={amountId}
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_GRANT}
                step={1}
                value={amount}
                disabled={frozen}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={!amountValid}
                aria-describedby={amountHelpId}
                className={`${fieldClass} h-11 pr-14`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[10px] font-medium text-astra-primary-light">
                PTS
              </span>
            </div>
            <p
              id={amountHelpId}
              className={`mt-2 text-xs ${amountValid ? 'text-astra-gray' : 'text-red-300'}`}
            >
              Whole number from 1 to {MAX_GRANT}.
            </p>
          </div>

          <div>
            <label htmlFor={reasonId} className="block text-sm font-bold">
              Reason
            </label>
            <div className="relative mt-3">
              <select
                id={reasonId}
                value={reason}
                disabled={frozen}
                onChange={(event) => setReason(event.target.value)}
                className={`${fieldClass} h-11 appearance-none pr-12`}
              >
                {GRANT_REASONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-astra-primary-light"
                aria-hidden="true"
              />
            </div>
          </div>

          <div>
            <label htmlFor={referenceId} className="block text-sm font-bold">
              {typeof window !== 'undefined' &&
              window.matchMedia('(min-width: 1024px)').matches
                ? 'Reference'
                : 'Reference link / notes'}
            </label>
            <textarea
              id={referenceId}
              value={reference}
              disabled={frozen}
              maxLength={MAX_REFERENCE}
              aria-describedby={referenceHelpId}
              onChange={(event) => setReference(event.target.value)}
              rows={3}
              placeholder="Event name or a link to the contribution"
              className={`${fieldClass} mt-3 py-3`}
            />
            <p id={referenceHelpId} className="mt-2 text-xs text-astra-gray">
              Optional. A member gets one grant for each reference.
            </p>
          </div>

          <p className="sr-only">Error: Enter a points amount.</p>
          {error && (
            <>
              <p
                role="alert"
                className="border border-red-400/40 bg-red-950/30 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </p>
              {error.startsWith('The portal could not confirm') && (
                  <p role="status" className="sr-only">{error}</p>
                )}
            </>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={!canGrant}
              aria-describedby={
                selected && !recipientActive ? inactiveId : undefined
              }
              className="rounded-full bg-astra-primary-light px-6 py-3 text-base font-bold text-astra-white transition-colors hover:bg-[#19c0f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-astra-white disabled:cursor-not-allowed disabled:bg-astra-disabled disabled:text-astra-gray"
            >
              {submitting
                ? 'Granting…'
                : frozen
                  ? 'Retry Grant'
                  : 'Grant Points to Member'}
            </button>
            {frozen && !submitting && (
              <button
                type="button"
                onClick={discardPending}
                className="text-xs font-bold text-astra-gray underline underline-offset-2 hover:text-astra-white"
              >
                Discard and edit
              </button>
            )}
            <p className="w-full text-[10px] text-astra-gray">
              This grant will be recorded in the member's ledger.
            </p>
          </div>
        </form>

        <div className="space-y-8 lg:pt-[70px]">
          <section
            aria-labelledby="grant-preview-title"
            className="border border-astra-primary-dark bg-black/50 px-6 py-6"
          >
            <h2
              id="grant-preview-title"
              className="text-xs font-bold uppercase text-astra-primary-light"
            >
              Grant preview
            </h2>
            <p className="mt-4 text-h3 font-bold">
              +{amountValid ? points : 0} points
            </p>
            <p className="mt-2 text-sm text-astra-gray">{reason}</p>
            <dl className="mt-6 space-y-4 border-t border-astra-white/15 pt-6 text-xs">
              <div className="flex justify-between">
                <dt className="text-astra-gray">Recipient</dt>
                <dd className="text-sm font-bold">
                  {selected?.fullName ?? 'Choose a member'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-astra-gray">ASTRA ID</dt>
                <dd className="text-sm font-bold">
                  {selected?.memberId ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-astra-gray">Student ID</dt>
                <dd className="text-sm font-bold">
                  {selected?.studentId ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-astra-gray">Current balance</dt>
                <dd className="text-sm font-bold">
                  {selected ? `${selected.balance} pts` : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-astra-gray">Balance after grant</dt>
                <dd className="text-sm font-bold text-[#4ade80]">
                  {selected && amountValid && recipientActive
                    ? `${selected.balance + points} pts`
                    : '—'}
                </dd>
              </div>
            </dl>
          </section>

          {outcome ? (
            <GrantOutcomeView outcome={outcome} />
          ) : (
            <section className="text-sm">
              <h2 className="text-xs font-bold uppercase text-astra-primary-light">
                Before you grant
              </h2>
              <p className="mt-3 text-astra-gray">
                Confirm the member, points amount and reason. Add a reference so
                the contribution is easy to trace.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
