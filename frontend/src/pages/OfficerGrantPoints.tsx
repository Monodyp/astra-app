import React, { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState, Panel, SimulatedNote, btnPrimary, btnSecondary, inputCls } from '@/components/member/ui';
import { useMemberData, useMemberQuery } from '@/features/member/MemberDataContext';
import type { MemberSearchResult } from '@/features/member/types';

export const MAX_GRANT = 1000;

export function validateGrant(v: { member: MemberSearchResult | null; amount: string; reason: string }) {
  const errors: { member?: string; amount?: string; reason?: string } = {};
  if (!v.member) errors.member = 'Search for and select a member.';
  const n = Number(v.amount);
  if (!v.amount.trim()) errors.amount = 'Enter a points amount.';
  else if (!Number.isInteger(n) || n < 1) errors.amount = 'Points must be a whole number of at least 1.';
  else if (n > MAX_GRANT) errors.amount = `Points cannot exceed ${MAX_GRANT} per grant.`;
  if (!v.reason.trim()) errors.reason = 'Enter a reason.';
  return errors;
}

/** Officer-only. The role check here is UI gating only; real authorization must be enforced by the server. */
export const OfficerGrantPoints: React.FC = () => {
  const uid = useId();
  const { source, fixture } = useMemberData();
  const profile = useMemberQuery((s) => s.getProfile());
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [member, setMember] = useState<MemberSearchResult | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Workshop Attendance');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<ReturnType<typeof validateGrant>>({});
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ ok: boolean; message: string; simulated?: boolean } | null>(null);

  useEffect(() => {
    if (!query.trim() || member) { setResults([]); return; }
    let live = true;
    const t = setTimeout(() => {
      source.searchMembers(query).then(
        (r) => live && (setResults(r), setSearchError(null)),
        (e: Error) => live && setSearchError(e.message),
      );
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [query, member, source]);

  if (profile.status === 'error') return <ErrorState error={profile.error} onRetry={profile.reload} />;
  if (profile.status === 'loading' || !profile.data) return <LoadingState label="Checking access" />;
  if (profile.data.role !== 'officer') {
    return (
      <Panel className="space-y-3">
        <h2 className="text-lg font-bold">Officer access required</h2>
        <p className="text-sm text-astra-gray">Granting points is limited to ASTRA officers.</p>
        <Link to="/member" className={btnSecondary}>Back to overview</Link>
      </Panel>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setOutcome(null);
    const errs = validateGrant({ member, amount, reason });
    setErrors(errs);
    if (Object.keys(errs).length || !member) return;
    setBusy(true);
    try {
      const r = await source.grantPoints({ studentId: member.studentId, amount: Number(amount), reason: reason.trim(), notes: notes.trim() });
      setOutcome({ ok: true, message: r.message, simulated: r.simulated });
      setAmount('');
      setNotes('');
    } catch (err) {
      setOutcome({ ok: false, message: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const err = (k: keyof typeof errors) => errors[k] && <p id={`${uid}-${k}-e`} className="mt-1 text-sm text-red-300">Error: {errors[k]}</p>;

  return (
    <form onSubmit={submit} noValidate className="space-y-4" aria-label="Grant points to a member">
      <h2 className="sr-only">Officer: grant points</h2>
      <div>
        <label htmlFor={`${uid}-q`} className="mb-2 block text-sm">Search by Student ID or Name...</label>
        <input id={`${uid}-q`} className={inputCls} type="search" value={query} onChange={(e) => { setQuery(e.target.value); setMember(null); }} autoComplete="off" aria-describedby={errors.member ? `${uid}-member-e` : undefined} aria-invalid={!!errors.member} />
        {err('member')}
        {searchError && <p role="alert" className="mt-1 text-sm text-red-300">{searchError}</p>}
        {!member && results.length > 0 && (
          <ul aria-label="Search results" className="mt-2 divide-y divide-white/10 border border-astra-primary-dark">
            {results.map((r) => (
              <li key={r.studentId}>
                <button type="button" className="flex min-h-12 w-full flex-col items-start px-3 py-2 text-left hover:bg-astra-primary-dark/40" onClick={() => { setMember(r); setQuery(r.name); }}>
                  <span className="break-words font-bold">{r.name}</span>
                  <span className="break-words text-sm text-astra-gray">{r.studentId} · {r.program}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!member && query.trim() && results.length === 0 && !searchError && <p className="mt-1 text-sm text-astra-gray" role="status">No members match.</p>}
      </div>

      <section aria-label="Selected member" className="min-h-24 border border-astra-primary-dark p-4">
        {member ? (
          <>
            <p className="break-words font-bold">{member.name}</p>
            <p className="break-words text-sm text-astra-gray">{member.studentId}</p>
            <p className="break-words text-sm text-astra-gray">{member.program}</p>
          </>
        ) : (
          <p className="text-astra-gray">No member selected</p>
        )}
      </section>

      <div>
        <label htmlFor={`${uid}-a`} className="mb-2 block text-sm">Points Amount</label>
        <input id={`${uid}-a`} className={inputCls} type="text" inputMode="numeric" pattern="[0-9]*" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!errors.amount} aria-describedby={errors.amount ? `${uid}-amount-e` : undefined} />
        {err('amount')}
      </div>
      <div>
        <label htmlFor={`${uid}-r`} className="mb-2 block text-sm">Reason</label>
        <input id={`${uid}-r`} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!errors.reason} aria-describedby={errors.reason ? `${uid}-reason-e` : undefined} />
        {err('reason')}
      </div>
      <div>
        <label htmlFor={`${uid}-n`} className="mb-2 block text-sm">Reference link / notes</label>
        <textarea id={`${uid}-n`} className={`${inputCls} min-h-32`} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {outcome && (
        <p role={outcome.ok ? 'status' : 'alert'} className={`border-2 p-3 text-sm ${outcome.ok ? 'border-emerald-400' : 'border-red-400'}`}>
          {outcome.ok ? '✔ ' : '✖ '}{outcome.message}
        </p>
      )}
      {fixture && outcome?.simulated && <SimulatedNote>No points were granted to anyone.</SimulatedNote>}
      <button type="submit" className={btnPrimary} disabled={busy} aria-busy={busy}>
        {busy ? 'Submitting…' : 'Grant Points to Member'}
      </button>
    </form>
  );
};
