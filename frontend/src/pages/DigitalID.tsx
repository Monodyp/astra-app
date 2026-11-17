import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import wordmark from '../assets/astra-home/wordmark.png';
import photoPlaceholder from '../assets/astra-member/member-photo-placeholder.svg';
import { ErrorState, LoadingState, SampleQr, SimulatedNote, btnSecondary } from '@/components/member/ui';
import { useMemberData, useMemberQuery } from '@/features/member/MemberDataContext';

const REFRESH_SECONDS = 45;

/** Fixture-only countdown. A production QR must be issued and refreshed by the backend. */
function useFixtureCountdown(active: boolean) {
  const [left, setLeft] = useState(REFRESH_SECONDS);
  const [cycle, setCycle] = useState(1);
  useEffect(() => {
    if (!active) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          setCycle((c) => c + 1);
          return REFRESH_SECONDS;
        }
        return l - 1;
      });
    }, reduce ? 5000 : 1000);
    return () => clearInterval(t);
  }, [active]);
  return { left, cycle };
}

export const DigitalID: React.FC = () => {
  const { fixture } = useMemberData();
  const profile = useMemberQuery((s) => s.getProfile());
  const valid = !!profile.data?.duesPaid;
  const { left, cycle } = useFixtureCountdown(fixture && valid);

  if (profile.status === 'error') return <ErrorState error={profile.error} onRetry={profile.reload} />;
  if (profile.status === 'loading' || !profile.data) return <LoadingState label="Loading your Digital ID" />;
  const p = profile.data;

  return (
    <article aria-label="ASTRA Developers official member card" className="space-y-4 border border-astra-primary-dark bg-black/30 p-4 sm:p-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <img src={wordmark} alt="ASTRA Developers" className="h-auto w-32" />
        <h2 className="text-sm text-astra-gray">ASTRA Developers · Official Member Card</h2>
      </header>

      <div className="flex items-center gap-4">
        <img src={photoPlaceholder} alt="Member photo placeholder" className="h-20 w-16 shrink-0 object-cover" />
        <div className="min-w-0">
          <p className="break-words text-lg font-bold">{p.name}</p>
          <p className="break-words text-sm text-astra-gray">{p.yearLabel}</p>
          <p className="break-words text-sm text-astra-gray">{p.studentId}</p>
        </div>
      </div>

      <p
        role="status"
        className={`flex min-h-12 items-center justify-center gap-2 border-2 px-3 text-center font-bold ${
          valid ? 'border-emerald-400 text-emerald-200' : 'border-red-400 text-red-200'
        }`}
      >
        {valid ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <XCircle className="h-5 w-5" aria-hidden="true" />}
        {valid ? 'VALID / ACTIVE DUES' : 'UNPAID / NOT VALID'}
      </p>

      {valid ? (
        <div className="space-y-3">
          {fixture ? (
            <>
              <SampleQr seed={`fixture-${cycle}`} label="Dynamic security QR code (sample)" />
              <p className="text-center">Refreshes in {left}s</p>
              <SimulatedNote>
                This pattern is a visual sample. A real, signed QR token must be issued and refreshed by the ASTRA backend, which is not connected.
              </SimulatedNote>
            </>
          ) : (
            <div role="status" className="border border-dashed border-astra-primary-dark p-6 text-center">
              <p className="font-bold">Security QR unavailable</p>
              <p className="mt-2 text-sm text-astra-gray">
                The service that issues your live, signed QR code is not connected yet, so no QR is shown. Do not rely on screenshots for verification.
              </p>
            </div>
          )}
          <p className="text-center text-sm text-astra-gray">
            Present this QR code to event officers or partner staff for verification.
          </p>
        </div>
      ) : (
        <div className="space-y-3 border border-red-400/60 p-4" aria-labelledby="renew-h">
          <h3 id="renew-h" className="font-bold">Payment Instructions</h3>
          <p className="text-sm text-astra-gray">
            Your annual dues are unpaid, so this ID cannot be verified and no verification QR is shown. To renew, contact an ASTRA officer.
          </p>
          <p className="text-sm text-astra-gray">
            Payment details and officer contact information are not available in this app yet. Official instructions will appear here once published by ASTRA.
          </p>
          <Link to="/not-valid" className={btnSecondary}>Read renewal guidance</Link>
        </div>
      )}
    </article>
  );
};
