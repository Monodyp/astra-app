import React, { useEffect, useId, useState } from 'react';
import {
  btnPrimary,
  btnSecondary,
  inputCls,
} from '../../../components/mobile/ui.js';
import {
  isDataError,
  portalData,
  type MemberSearchResult,
} from '../../../data/index.js';
import { errorMessage } from '../../../lib/format.js';
import {
  isUncertainFailure,
  newIdempotencyKey,
} from '../../../lib/idempotency.js';

const MAX_GRANT = 1000;
const MAX_REFERENCE = 200;

function validateGrant(v: {
  member: MemberSearchResult | null;
  amount: string;
  reason: string;
}) {
  const errors: { member?: string; amount?: string; reason?: string } = {};
  if (!v.member) errors.member = 'Search for and select a member.';
  const n = Number(v.amount);
  if (!v.amount.trim()) errors.amount = 'Enter a points amount.';
  else if (!Number.isInteger(n) || n < 1)
    errors.amount = 'Points must be a whole number of at least 1.';
  else if (n > MAX_GRANT)
    errors.amount = `Points cannot exceed ${MAX_GRANT} per grant.`;
  if (!v.reason.trim()) errors.reason = 'Enter a reason.';
  return errors;
}

interface FrozenGrant {
  member: MemberSearchResult;
  amount: number;
  reason: string;
  referenceId: string;
  idempotencyKey: string;
}

export const MobileGrantPoints: React.FC = () => {
  const uid = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [member, setMember] = useState<MemberSearchResult | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Workshop Attendance');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<ReturnType<typeof validateGrant>>({});
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [pending, setPending] = useState<FrozenGrant | null>(null);

  useEffect(() => {
    if (!query.trim() || member) {
      setResults([]);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      portalData.searchMembers(query).then(
        (r) => {
          if (!live) return;
          setResults(r);
          setSearchError(null);
        },
        (e: unknown) => {
          if (live) setSearchError(errorMessage(e));
        }
      );
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query, member]);

  const frozen = pending !== null;
  const inactive = member !== null && member.membershipStatus !== 'verified';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setOutcome(null);
    let grant = pending;
    if (!grant) {
      const errs = validateGrant({ member, amount, reason });
      setErrors(errs);
      if (Object.keys(errs).length || !member || inactive) return;
      grant = {
        member,
        amount: Number(amount),
        reason: reason.trim(),
        referenceId: notes.trim(),
        idempotencyKey: newIdempotencyKey(),
      };
    }
    const retry = pending !== null;
    const name = grant.member.fullName;
    setBusy(true);
    try {
      const r = await portalData.grantPoints({
        studentId: grant.member.studentId,
        amount: grant.amount,
        reason: grant.reason,
        referenceId: grant.referenceId || undefined,
        idempotencyKey: grant.idempotencyKey,
      });
      setPending(null);
      setOutcome({
        ok: true,
        message: `${name} received +${r.amount} points for ${r.reason}. ${
          r.balance
            ? `Balance went from ${r.balance.previous} to ${r.balance.current} pts.`
            : 'The grant is now in their ledger.'
        }`,
      });
      setAmount('');
      setNotes('');
    } catch (err) {
      const conflict = isDataError(err) && err.code === 'conflict';
      if (conflict && retry) {
        setPending(null);
        setOutcome({
          ok: true,
          message: `An earlier attempt already recorded +${grant.amount} points for ${name} for ${grant.reason}. It was not recorded again.`,
        });
        setAmount('');
        setNotes('');
      } else if (isUncertainFailure(err)) {
        setPending(grant);
        setOutcome({
          ok: false,
          message: `The portal could not confirm the grant to ${name}. Retry to send the same grant again. It is recorded only once.`,
        });
      } else {
        setPending(null);
        setOutcome({
          ok: false,
          message: conflict
            ? `A grant with this reference is already recorded for ${name}. Use a different reference.`
            : errorMessage(err),
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const err = (k: keyof typeof errors) =>
    errors[k] && (
      <p id={`${uid}-${k}-e`} className="mt-1 text-sm text-red-300">
        Error: {errors[k]}
      </p>
    );

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-4"
      aria-label="Grant points to a member"
    >
      <h2 className="sr-only">Officer: grant points</h2>
      <div>
        <label htmlFor={`${uid}-q`} className="mb-2 block text-sm">
          Search by Student ID or Name...
        </label>
        <input
          id={`${uid}-q`}
          className={inputCls}
          type="search"
          value={query}
          disabled={frozen}
          onChange={(e) => {
            setQuery(e.target.value);
            setMember(null);
            setOutcome(null);
          }}
          autoComplete="off"
          aria-describedby={errors.member ? `${uid}-member-e` : undefined}
          aria-invalid={!!errors.member}
        />
        {err('member')}
        {searchError && (
          <p role="alert" className="mt-1 text-sm text-red-300">
            {searchError}
          </p>
        )}
        {!member && results.length > 0 && (
          <ul
            aria-label="Search results"
            className="mt-2 divide-y divide-white/10 border border-astra-primary-dark"
          >
            {results.map((r) => (
              <li key={r.memberId}>
                <button
                  type="button"
                  className="flex min-h-12 w-full flex-col items-start px-3 py-2 text-left hover:bg-astra-primary-dark/40"
                  onClick={() => {
                    setMember(r);
                    setQuery(r.fullName);
                  }}
                >
                  <span className="break-words font-bold">{r.fullName}</span>
                  <span className="break-words text-sm text-astra-gray">
                    {r.studentId} · {r.memberId}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!member && query.trim() && results.length === 0 && !searchError && (
          <p className="mt-1 text-sm text-astra-gray" role="status">
            No members match.
          </p>
        )}
      </div>

      <section
        aria-label="Selected member"
        className="min-h-24 border border-astra-primary-dark p-4"
      >
        {member ? (
          <>
            <p className="break-words font-bold">{member.fullName}</p>
            <p className="break-words text-sm text-astra-gray">
              {member.studentId}
            </p>
            <p className="break-words text-sm text-astra-gray">
              {inactive ? 'Inactive member' : 'Active member'}
            </p>
          </>
        ) : (
          <p className="text-astra-gray">No member selected</p>
        )}
      </section>

      {inactive && (
        <p
          id={`${uid}-inactive`}
          className="border-2 border-red-400 p-3 text-sm"
        >
          ✖ {member.fullName} cannot receive points because their membership is
          inactive. Points go only to members who paid their annual dues.
        </p>
      )}

      <div>
        <label htmlFor={`${uid}-a`} className="mb-2 block text-sm">
          Points Amount
        </label>
        <input
          id={`${uid}-a`}
          className={inputCls}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={amount}
          disabled={frozen}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={!!errors.amount}
          aria-describedby={errors.amount ? `${uid}-amount-e` : undefined}
        />
        {err('amount')}
      </div>
      <div>
        <label htmlFor={`${uid}-r`} className="mb-2 block text-sm">
          Reason
        </label>
        <input
          id={`${uid}-r`}
          className={inputCls}
          value={reason}
          disabled={frozen}
          onChange={(e) => setReason(e.target.value)}
          aria-invalid={!!errors.reason}
          aria-describedby={errors.reason ? `${uid}-reason-e` : undefined}
        />
        {err('reason')}
      </div>
      <div>
        <label htmlFor={`${uid}-n`} className="mb-2 block text-sm">
          Reference link / notes
        </label>
        <textarea
          id={`${uid}-n`}
          className={`${inputCls} min-h-32`}
          value={notes}
          maxLength={MAX_REFERENCE}
          disabled={frozen}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {outcome && (
        <p
          role={outcome.ok ? 'status' : 'alert'}
          className={`border-2 p-3 text-sm ${outcome.ok ? 'border-emerald-400' : 'border-red-400'}`}
        >
          {outcome.ok ? '✔ ' : '✖ '}
          {outcome.message}
        </p>
      )}
      <button
        type="submit"
        className={btnPrimary}
        disabled={busy || (!frozen && inactive)}
        aria-busy={busy}
        aria-describedby={inactive ? `${uid}-inactive` : undefined}
      >
        {busy
          ? 'Submitting…'
          : frozen
            ? 'Retry Grant'
            : 'Grant Points to Member'}
      </button>
      {frozen && !busy && (
        <button
          type="button"
          className={btnSecondary}
          onClick={() => {
            setPending(null);
            setOutcome(null);
          }}
        >
          Discard and edit
        </button>
      )}
    </form>
  );
};
