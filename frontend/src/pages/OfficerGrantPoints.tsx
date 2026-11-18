import React, { useEffect, useId, useState } from 'react';
import { ChevronDown, IdCard } from 'lucide-react';
import { PageHeading } from '../components/portal/PageHeading.js';
import {
  GRANT_REASONS,
  portalData,
  type GrantPointsResult,
  type MemberSearchResult,
} from '../data/index.js';
import { errorMessage } from '../lib/format.js';

const MAX_GRANT = 1000;
const SEARCH_DELAY_MS = 200;

const fieldClass =
  'w-full border border-astra-white/15 bg-black/50 px-4 text-sm text-astra-white placeholder:text-astra-gray/70 focus:border-astra-primary-light focus:outline-none';

type Search =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; results: MemberSearchResult[] }
  | { status: 'error'; message: string };

function memberIds(member: MemberSearchResult): string {
  return `ASTRA ID ${member.memberId} · Student ID ${member.studentId}`;
}

function memberStatus(member: MemberSearchResult): string {
  return member.membershipStatus === 'verified'
    ? 'Active member'
    : 'Inactive member';
}

export const OfficerGrantPoints: React.FC = () => {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<Search>({ status: 'idle' });
  const [selected, setSelected] = useState<MemberSearchResult | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [amount, setAmount] = useState('100');
  const [reason, setReason] = useState<string>(GRANT_REASONS[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState<GrantPointsResult | null>(null);

  const searchId = useId();
  const listId = useId();
  const amountId = useId();
  const amountHelpId = useId();
  const reasonId = useId();
  const noteId = useId();

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
  const canGrant = selected !== null && amountValid && !submitting;

  const results = search.status === 'ready' ? search.results : [];
  const showList = listOpen && search.status !== 'idle';
  const optionId = (index: number) => `${listId}-option-${index}`;

  function choose(member: MemberSearchResult) {
    setSelected(member);
    setQuery(member.fullName);
    setListOpen(false);
    setGranted(null);
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
    setGranted(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !amountValid) return;
    setSubmitting(true);
    setError(null);
    setGranted(null);
    try {
      const result = await portalData.grantPoints({
        memberId: selected.memberId,
        amount: points,
        reason,
        note,
      });
      setGranted(result);
      setSelected(result.recipient);
      setNote('');
    } catch (caught) {
      setError(errorMessage(caught));
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

      <div className="grid grid-cols-[1fr_1fr] gap-x-[138px]">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label htmlFor={searchId} className="block text-sm font-bold">
              Search by ASTRA ID, student ID, or name
            </label>
            <div className="relative mt-3">
              <input
                id={searchId}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showList}
                aria-controls={listId}
                aria-activedescendant={
                  showList && results[activeIndex]
                    ? optionId(activeIndex)
                    : undefined
                }
                value={query}
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
                  <ul
                    id={listId}
                    role="listbox"
                    aria-label="Matching members"
                    hidden={results.length === 0}
                  >
                    {results.map((member, index) => (
                      <li
                        key={member.memberId}
                        id={optionId(index)}
                        role="option"
                        aria-selected={index === activeIndex}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => choose(member)}
                        className={`cursor-pointer px-4 py-2 text-sm ${
                          index === activeIndex
                            ? 'bg-astra-primary-dark/60'
                            : 'hover:bg-astra-white/5'
                        }`}
                      >
                        <span className="block font-bold">
                          {member.fullName}
                        </span>
                        <span className="block text-xs text-astra-gray">
                          {memberIds(member)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {selected && (
            <div className="flex items-center justify-between border border-astra-primary-dark bg-[#0f2a3a]/60 px-5 py-5">
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
                  onClick={() => {
                    clearSelection();
                    setQuery('');
                  }}
                  className="text-xs font-bold text-astra-gray underline underline-offset-2 hover:text-astra-white"
                >
                  Change
                </button>
              </div>
            </div>
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
            <label htmlFor={noteId} className="block text-sm font-bold">
              Reference link / notes
            </label>
            <textarea
              id={noteId}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Event name or a link to the contribution"
              className={`${fieldClass} mt-3 py-3`}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="border border-red-400/40 bg-red-950/30 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={!canGrant}
              className="rounded-full bg-astra-primary-light px-6 py-3 text-base font-bold text-astra-white transition-colors hover:bg-[#19c0f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-astra-white disabled:cursor-not-allowed disabled:bg-astra-disabled disabled:text-astra-gray"
            >
              {submitting ? 'Granting…' : 'Grant Points to Member'}
            </button>
            <p className="mt-3 text-[10px] text-astra-gray">
              This grant will be recorded in the member's ledger.
            </p>
          </div>
        </form>

        <div className="space-y-8 pt-[70px]">
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
                  {selected && amountValid
                    ? `${selected.balance + points} pts`
                    : '—'}
                </dd>
              </div>
            </dl>
          </section>

          {granted ? (
            <section
              role="status"
              className="border border-[#4ade80]/40 bg-[#123524]/60 px-6 py-5 text-sm"
            >
              <h2 className="font-bold">Points granted</h2>
              <p className="mt-1">
                {granted.recipient.fullName} received +{granted.amount} points
                for {granted.reason}. Balance went from{' '}
                {granted.previousBalance} to {granted.newBalance} pts.
              </p>
            </section>
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
