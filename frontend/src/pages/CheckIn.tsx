import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { LoadingState, Panel, SimulatedNote, btnPrimary, btnSecondary, inputCls } from '@/components/member/ui';
import { FIXTURE_CHECKIN_CODE } from '@/features/member/fixtures';
import { useMemberData, useMemberQuery } from '@/features/member/MemberDataContext';
import { CheckInError } from '@/features/member/types';

type CamState = 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported' | 'error';

/**
 * Check-in. Interpretation of the wireframe: the camera area is the QR scanner (officers scanning a
 * member's Digital ID QR) and the manual field takes the EVENT code. Those are different tokens
 * (backend: POST /attendance/checkin {srCode,eventId} vs POST /events/:id/checkin), so scanner
 * results are never auto-submitted as event codes. This screen wires the camera permission states and the
 * manual event-code path; QR decoding is not wired (needs a decoder library + backend contract).
 */
export const CheckIn: React.FC = () => {
  const uid = useId();
  const { source, fixture } = useMemberData();
  const scans = useMemberQuery((s) => s.getScans());
  const [cam, setCam] = useState<CamState>(
    typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function' ? 'idle' : 'unsupported',
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; simulated?: boolean } | null>(null);

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => stopCam, [stopCam]);

  const startCam = async () => {
    setCam('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCam('active');
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch (e) {
      const name = (e as DOMException).name;
      setCam(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'unsupported' : 'error');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return; // repeat-submission guard
    const trimmed = code.trim();
    setResult(null);
    if (!trimmed) return setFieldError('Enter the event code shown at the event.');
    if (!/^[A-Za-z0-9-]{4,32}$/.test(trimmed)) return setFieldError('Event codes use letters, numbers and dashes only (4–32 characters).');
    setFieldError(null);
    setBusy(true);
    try {
      const r = await source.checkIn(trimmed);
      setResult({ ok: true, message: r.message, simulated: r.simulated });
      setCode('');
    } catch (err) {
      setResult({ ok: false, message: err instanceof CheckInError || err instanceof Error ? err.message : 'Check-in failed.' });
    } finally {
      setBusy(false);
      scans.reload();
    }
  };

  const camMessage: Record<CamState, string> = {
    idle: 'Camera is off. Start the camera to scan a Member Digital ID QR.',
    requesting: 'Waiting for camera permission…',
    active: 'Camera active. QR decoding is not connected yet: use the event code below.',
    denied: 'Camera permission was denied. Allow camera access in your browser settings, or use the event code below.',
    unsupported: 'No camera or scanner is available on this device or browser. Use the event code below.',
    error: 'The camera could not be started. Use the event code below.',
  };

  return (
    <div className="space-y-4">
      <h2 className="sr-only">Event check-in</h2>
      <section aria-label="QR scanner" className="space-y-3 border border-astra-primary-dark bg-black/30 p-4">
        <div className="relative grid aspect-[4/3] place-items-center overflow-hidden border border-dashed border-astra-primary-dark">
          {cam === 'active' ? (
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" aria-label="Camera preview" />
          ) : (
            <div className="flex flex-col items-center gap-2 p-4 text-center">
              {cam === 'denied' || cam === 'unsupported' || cam === 'error' ? <CameraOff className="h-8 w-8" aria-hidden="true" /> : <Camera className="h-8 w-8" aria-hidden="true" />}
              <p className="text-sm">Scan Member Digital ID QR</p>
            </div>
          )}
        </div>
        <p role="status" className="text-sm text-astra-gray">{camMessage[cam]}</p>
        {(cam === 'idle' || cam === 'denied' || cam === 'error') && (
          <button type="button" className={btnSecondary} onClick={startCam}>{cam === 'idle' ? 'Start camera' : 'Try camera again'}</button>
        )}
        {cam === 'active' && (
          <button type="button" className={btnSecondary} onClick={() => { stopCam(); setCam('idle'); }}>Stop camera</button>
        )}
      </section>

      <form onSubmit={submit} noValidate className="space-y-3" aria-label="Manual event code check-in">
        <p>Or enter Event Code manually:</p>
        <label htmlFor={`${uid}-code`} className="block text-sm">Event Code Attendance</label>
        <input
          id={`${uid}-code`}
          className={inputCls}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="go"
          aria-invalid={!!fieldError}
          aria-describedby={fieldError ? `${uid}-err` : undefined}
        />
        {fieldError && <p id={`${uid}-err`} className="text-sm text-red-300">Error: {fieldError}</p>}
        <button type="submit" className={btnPrimary} disabled={busy} aria-busy={busy}>
          {busy ? 'Verifying…' : 'Verify & Check In'}
        </button>
        {fixture && <p className="text-xs text-astra-gray">Fixture mode: the sample event code is <code>{FIXTURE_CHECKIN_CODE}</code>. Try it twice to see the repeat check-in message.</p>}
        {result && (
          <p role={result.ok ? 'status' : 'alert'} className={`border-2 p-3 text-sm ${result.ok ? 'border-emerald-400' : 'border-red-400'}`}>
            {result.ok ? '✔ ' : '✖ '}{result.message}
          </p>
        )}
        {result?.simulated && <SimulatedNote>No attendance was recorded and no real points were awarded.</SimulatedNote>}
      </form>

      <section aria-labelledby={`${uid}-recent`} className="space-y-2">
        <h3 id={`${uid}-recent`}>Recent Scans</h3>
        {scans.status === 'loading' && <LoadingState label="Loading recent scans" />}
        {scans.status === 'ready' && scans.data?.length === 0 && <Panel><p className="text-sm text-astra-gray">No scans yet this session.</p></Panel>}
        <ul className="space-y-2">
          {scans.data?.map((s) => (
            <li key={s.id} className="flex flex-wrap justify-between gap-2 border border-astra-primary-dark p-3 text-sm">
              <span className="break-all">{s.label}</span>
              <span>{s.outcome === 'Checked in' ? '✔' : '✖'} {s.outcome} · {new Date(s.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
