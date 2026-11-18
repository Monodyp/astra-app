import React, { useEffect, useId, useState } from 'react';
import { CircleCheck, IdCard, ScanLine } from 'lucide-react';
import { PageHeading } from '../components/portal/PageHeading.js';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../components/portal/StatusViews.js';
import {
  portalData,
  type AttendanceRecord,
  type CheckInInput,
  type CheckInResult,
  type ScanSample,
} from '../data/index.js';
import { errorMessage, formatPointsDelta, formatTime } from '../lib/format.js';
import { useResource } from '../lib/useResource.js';
import { SampleQrPanel } from '../features/checkin/SampleQrPanel.js';

const loadStation = () => portalData.getCheckInStation();

type Outcome =
  | { kind: 'result'; result: CheckInResult }
  | { kind: 'error'; message: string };

const RosterRow: React.FC<{ record: AttendanceRecord }> = ({ record }) => (
  <li className="grid grid-cols-[1.6fr_1fr_1fr_0.8fr_0.6fr] items-center gap-4 border border-astra-white/10 bg-black/50 px-4 py-4 text-sm">
    <span className="flex items-center gap-3 font-bold text-astra-white">
      <CircleCheck className="h-5 w-5 text-[#4ade80]" aria-hidden="true" />
      {record.memberName}
    </span>
    <span className="text-xs text-astra-gray">{record.studentId}</span>
    <span className="text-astra-gray">Checked in</span>
    <span className="font-bold text-[#4ade80]">
      {formatPointsDelta(record.pointsAwarded)}
    </span>
    <span className="text-right text-xs text-astra-gray">
      {formatTime(record.checkedInAt)}
    </span>
  </li>
);

export const CheckIn: React.FC = () => {
  const station = useResource(loadStation);
  const [samples, setSamples] = useState<ScanSample[]>([]);
  const [shownSampleId, setShownSampleId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const manualId = useId();

  useEffect(() => {
    let active = true;
    portalData
      .listScanSamples()
      .then((items) => {
        if (active) setSamples(items);
      })
      .catch(() => {
        if (active) setSamples([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (station.status === 'loading') {
    return <LoadingState label="Opening the check-in station" />;
  }
  if (station.status === 'error') {
    return (
      <ErrorState
        message={errorMessage(station.error)}
        onRetry={station.reload}
      />
    );
  }

  const { event, roster } = station.data;

  async function submit(key: string, input: CheckInInput) {
    setPending(key);
    setOutcome(null);
    try {
      const result = await portalData.checkIn(input);
      setOutcome({ kind: 'result', result });
      station.setData({ event, roster: result.roster });
      if (result.outcome === 'accepted' && input.method === 'manual') {
        setStudentId('');
      }
    } catch (error) {
      setOutcome({ kind: 'error', message: errorMessage(error) });
    } finally {
      setPending(null);
    }
  }

  function handleManual(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    void submit('manual', {
      eventId: event.id,
      method: 'manual',
      studentId,
    });
  }

  const shownSample =
    samples.find((sample) => sample.id === shownSampleId) ?? null;
  const accepted =
    outcome?.kind === 'result' && outcome.result.outcome === 'accepted';
  const busy = pending !== null;

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="04 / Attendance Station"
        title="Event Check-In"
        description="Scan a member's digital ID to verify attendance."
        aside={
          <div className="min-w-[340px] border border-astra-primary-dark bg-black/50 px-6 py-4">
            <p className="text-[10px] font-medium uppercase text-astra-primary-light">
              Current event / +{event.points} pts
            </p>
            <p className="mt-1 text-sm font-bold text-astra-white">
              {event.name}
            </p>
          </div>
        }
      />

      <section
        aria-labelledby="scanner-title"
        className="relative overflow-hidden border border-astra-white/10 bg-black/60 bg-[linear-gradient(rgba(0,177,237,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,177,237,0.06)_1px,transparent_1px)] bg-[size:32px_32px] px-6 py-6"
      >
        <div className="flex justify-between text-[10px] font-medium uppercase">
          <span className="text-astra-gray">Cam 01 / Member ID scanner</span>
          <span className="text-[#4ade80]">Sample QR · Simulated scan</span>
        </div>
        <div className="mx-auto mt-6 flex w-[300px] flex-col items-center border-x border-astra-primary-light/40 px-6 py-6 text-center">
          <IdCard
            className="h-10 w-10 text-astra-white"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span className="mt-4 h-px w-full bg-astra-primary-light/60" />
          <h2 id="scanner-title" className="mt-4 text-sm font-bold">
            Scan Member Digital ID QR
          </h2>
          <p className="mt-1 text-[10px] text-astra-gray">
            Choose a sample ID below to show its QR
          </p>
        </div>
        {samples.length > 0 && (
          <ul
            aria-label="Sample IDs to scan"
            className="mt-6 grid grid-cols-4 gap-3"
          >
            {samples.map((sample) => (
              <li key={sample.id}>
                <button
                  type="button"
                  onClick={() =>
                    setShownSampleId(
                      shownSampleId === sample.id ? null : sample.id
                    )
                  }
                  aria-pressed={shownSampleId === sample.id}
                  aria-label={`Show QR for ${sample.label}, ${sample.hint}`}
                  className={`flex w-full items-center gap-3 border bg-black/60 px-4 py-3 text-left transition-colors hover:border-astra-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-astra-primary-light ${
                    shownSampleId === sample.id
                      ? 'border-astra-primary-light'
                      : 'border-astra-primary-dark'
                  }`}
                >
                  <ScanLine
                    className="h-5 w-5 shrink-0 text-astra-primary-light"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="block text-sm font-bold">
                      {sample.label}
                    </span>
                    <span className="block text-[10px] text-astra-gray">
                      {sample.hint}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {shownSample && (
          <SampleQrPanel
            sample={shownSample}
            busy={busy}
            scanning={pending === shownSample.id}
            onSimulate={() =>
              void submit(shownSample.id, {
                eventId: event.id,
                method: 'scan',
                credential: shownSample.credential,
              })
            }
            onClose={() => setShownSampleId(null)}
          />
        )}
        <div className="mt-6 flex justify-between text-[10px] font-medium uppercase text-astra-gray">
          <span>Scan mode / Digital ID</span>
          <span>Automatic verification</span>
        </div>
      </section>

      <form onSubmit={handleManual} noValidate>
        <label htmlFor={manualId} className="block text-base font-bold">
          Or enter Student ID manually
        </label>
        <div className="mt-4 flex gap-6">
          <input
            id={manualId}
            value={studentId}
            onChange={(changeEvent) => setStudentId(changeEvent.target.value)}
            placeholder="2X-XXXXX"
            autoComplete="off"
            className="h-11 flex-1 border border-astra-white/15 bg-black/50 px-4 text-sm text-astra-white placeholder:text-astra-gray/70 focus:border-astra-primary-light focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || studentId.trim() === ''}
            className="rounded-full bg-astra-primary-light px-6 text-base font-bold text-astra-white transition-colors hover:bg-[#19c0f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-astra-white disabled:cursor-not-allowed disabled:bg-astra-disabled disabled:text-astra-gray"
          >
            {pending === 'manual' ? 'Verifying…' : 'Verify & Check In'}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-astra-gray">
          Student ID attendance
        </p>
      </form>

      {outcome && (
        <div
          role={accepted ? 'status' : 'alert'}
          className={`border px-6 py-4 text-sm ${
            accepted
              ? 'border-[#4ade80]/40 bg-[#123524]/60'
              : 'border-amber-400/40 bg-amber-950/30'
          }`}
        >
          <p className="font-bold">
            {accepted
              ? 'Check-in accepted'
              : outcome.kind === 'error'
                ? 'Check-in failed'
                : 'Check-in rejected'}
          </p>
          <p className="mt-1">
            {outcome.kind === 'error'
              ? outcome.message
              : outcome.result.message}
          </p>
        </div>
      )}

      <section aria-labelledby="roster-title">
        <div className="flex items-end justify-between">
          <h2 id="roster-title" className="text-lg font-bold">
            Recent Scans
          </h2>
          <p className="text-[10px] font-medium uppercase text-astra-gray">
            {roster.length} verified{' '}
            {roster.length === 1 ? 'attendee' : 'attendees'}
          </p>
        </div>
        {roster.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No check-ins yet"
              message="Accepted scans for this event appear here."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-2" aria-label="Checked-in members">
            {roster.map((record) => (
              <RosterRow key={record.id} record={record} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
