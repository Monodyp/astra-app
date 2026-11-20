import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ErrorState,
  LoadingState,
  Panel,
  btnPrimary,
  btnSecondary,
  inputCls,
} from '../../../components/mobile/ui.js';
import {
  portalData,
  type CheckInEvent,
  type CheckInInput,
  type ScanSample,
} from '../../../data/index.js';
import { errorMessage } from '../../../lib/format.js';
import { useResource } from '../../../lib/useResource.js';
import { decodeQrFrame } from '../decodeQr.js';

type CamState =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'unsupported'
  | 'error';

const SCAN_INTERVAL_MS = 250;
const REPEAT_WINDOW_MS = 4000;

const loadStation = () => portalData.getCheckInStation();

export const MobileCheckIn: React.FC = () => {
  const uid = useId();
  const station = useResource(loadStation);
  const [samples, setSamples] = useState<ScanSample[]>([]);
  const [shownSample, setShownSample] = useState<ScanSample | null>(null);
  const [cam, setCam] = useState<CamState>(
    typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function'
      ? 'idle'
      : 'unsupported'
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastSeenRef = useRef<{ value: string; at: number } | null>(null);
  const busyRef = useRef(false);
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

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

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => stopCam, [stopCam]);

  const eventRef = useRef<CheckInEvent | null>(null);
  eventRef.current = station.status === 'ready' ? station.data.event : null;
  const eventId = eventRef.current?.id ?? null;
  const setStation = station.setData;

  const checkIn = useCallback(
    async (input: CheckInInput) => {
      if (busyRef.current) return; // repeat-submission guard
      busyRef.current = true;
      setBusy(true);
      setResult(null);
      try {
        const r = await portalData.checkIn(input);
        if (eventRef.current) {
          setStation({ event: eventRef.current, roster: r.roster });
        }
        setResult({ ok: r.outcome === 'accepted', message: r.message });
        if (r.outcome === 'accepted' && input.method === 'manual') setCode('');
      } catch (err) {
        setResult({ ok: false, message: errorMessage(err) });
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [setStation]
  );

  useEffect(() => {
    if (cam !== 'active' || !eventId) return;
    if (videoRef.current) videoRef.current.srcObject = streamRef.current;
    const canvas = document.createElement('canvas');
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || busyRef.current) return;
      const value = decodeQrFrame(video, canvas);
      if (!value) return;
      const now = Date.now();
      const last = lastSeenRef.current;
      lastSeenRef.current = { value, at: now };
      if (last?.value === value && now - last.at < REPEAT_WINDOW_MS) return;
      void checkIn({ eventId, method: 'scan', credential: value });
    }, SCAN_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [cam, eventId, checkIn]);

  const startCam = async () => {
    setCam('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      lastSeenRef.current = null;
      setCam('active');
    } catch (e) {
      const name = (e as DOMException).name;
      setCam(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'denied'
          : name === 'NotFoundError'
            ? 'unsupported'
            : 'error'
      );
    }
  };

  if (station.status === 'error')
    return <ErrorState error={station.error} onRetry={station.reload} />;
  if (station.status === 'loading')
    return <LoadingState label="Opening the check-in station" />;
  const { event, roster } = station.data;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const trimmed = code.trim();
    setResult(null);
    if (!trimmed) return setFieldError('Enter the student ID.');
    setFieldError(null);
    void checkIn({ eventId: event.id, method: 'manual', studentId: trimmed });
  };

  const camMessage: Record<CamState, string> = {
    idle: 'Camera is off. Start the camera to scan a Member Digital ID QR.',
    requesting: 'Waiting for camera permission…',
    active: 'Camera active. Hold a Member Digital ID QR in front of it.',
    denied:
      'Camera permission was denied. Allow camera access in your browser settings, or use the student ID below.',
    unsupported:
      'No camera or scanner is available on this device or browser. Use the student ID below.',
    error: 'The camera could not be started. Use the student ID below.',
  };

  return (
    <div className="space-y-4">
      <h2 className="sr-only">Event check-in</h2>
      <section
        aria-label="QR scanner"
        className="space-y-3 border border-astra-primary-dark bg-black/30 p-4"
      >
        <div className="relative grid aspect-[4/3] place-items-center overflow-hidden border border-dashed border-astra-primary-dark">
          {cam === 'active' ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              aria-label="Camera preview"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 p-4 text-center">
              {cam === 'denied' || cam === 'unsupported' || cam === 'error' ? (
                <CameraOff className="h-8 w-8" aria-hidden="true" />
              ) : (
                <Camera className="h-8 w-8" aria-hidden="true" />
              )}
              <p className="text-sm">Scan Member Digital ID QR</p>
            </div>
          )}
        </div>
        <p role="status" className="text-sm text-astra-gray">
          {camMessage[cam]}
        </p>
        {(cam === 'idle' || cam === 'denied' || cam === 'error') && (
          <button type="button" className={btnSecondary} onClick={startCam}>
            {cam === 'idle' ? 'Start camera' : 'Try camera again'}
          </button>
        )}
        {cam === 'active' && (
          <button
            type="button"
            className={btnSecondary}
            onClick={() => {
              stopCam();
              setCam('idle');
            }}
          >
            Stop camera
          </button>
        )}
      </section>

      {samples.length > 0 && (
        <section aria-labelledby={`${uid}-demo`} className="space-y-2">
          <h3 id={`${uid}-demo`}>Demo QR codes</h3>
          <div className="grid grid-cols-2 gap-2">
            {samples.map((sample) => (
              <button
                key={sample.id}
                type="button"
                className={btnSecondary}
                aria-pressed={shownSample?.id === sample.id}
                onClick={() =>
                  setShownSample(shownSample?.id === sample.id ? null : sample)
                }
              >
                {sample.label}
              </button>
            ))}
          </div>
          {shownSample && (
            <Panel className="space-y-3">
              <figure className="mx-auto w-full max-w-[200px]">
                <QRCodeSVG
                  value={shownSample.credential}
                  size={256}
                  marginSize={2}
                  role="img"
                  aria-label={`QR code for ${shownSample.label}`}
                  className="h-auto w-full bg-white"
                />
              </figure>
              <p className="text-center text-sm text-astra-gray">
                {shownSample.hint}
              </p>
              <button
                type="button"
                className={btnPrimary}
                disabled={busy}
                onClick={() =>
                  void checkIn({
                    eventId: event.id,
                    method: 'scan',
                    credential: shownSample.credential,
                  })
                }
              >
                Check in with this QR
              </button>
            </Panel>
          )}
        </section>
      )}

      <form
        onSubmit={submit}
        noValidate
        className="space-y-3"
        aria-label="Manual student ID check-in"
      >
        <p>Or enter Student ID manually:</p>
        <label htmlFor={`${uid}-code`} className="block text-sm">
          Student ID Attendance
        </label>
        <input
          id={`${uid}-code`}
          className={inputCls}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-invalid={!!fieldError}
          aria-describedby={fieldError ? `${uid}-err` : undefined}
        />
        {fieldError && (
          <p id={`${uid}-err`} className="text-sm text-red-300">
            Error: {fieldError}
          </p>
        )}
        <button
          type="submit"
          className={btnPrimary}
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? 'Verifying…' : 'Verify & Check In'}
        </button>
        {result && (
          <p
            role={result.ok ? 'status' : 'alert'}
            className={`border-2 p-3 text-sm ${result.ok ? 'border-emerald-400' : 'border-red-400'}`}
          >
            {result.ok ? '✔ ' : '✖ '}
            {result.message}
          </p>
        )}
      </form>

      <section aria-labelledby={`${uid}-recent`} className="space-y-2">
        <h3 id={`${uid}-recent`}>Recent Scans</h3>
        {roster.length === 0 && (
          <Panel>
            <p className="text-sm text-astra-gray">
              No check-ins yet for {event.name}.
            </p>
          </Panel>
        )}
        <ul className="space-y-2">
          {roster.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap justify-between gap-2 border border-astra-primary-dark p-3 text-sm"
            >
              <span className="break-all">
                {s.memberName} · {s.studentId}
              </span>
              <span>
                ✔ Checked in ·{' '}
                {new Date(s.checkedInAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
