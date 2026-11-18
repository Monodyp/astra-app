import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IdCard } from 'lucide-react';
import { decodeQrFrame } from './decodeQr.js';

type CameraState =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'unsupported'
  | 'error';

const SCAN_INTERVAL_MS = 250;
const REPEAT_WINDOW_MS = 4000;
const FRAME_HINT = 'Keep the QR code inside the frame';

const STATUS_LABELS: Record<CameraState, { text: string; tone: string }> = {
  idle: { text: 'Camera off', tone: 'text-astra-gray' },
  requesting: { text: 'Starting camera', tone: 'text-astra-primary-light' },
  active: { text: 'Camera active', tone: 'text-[#4ade80]' },
  denied: { text: 'Camera blocked', tone: 'text-amber-300' },
  unsupported: { text: 'No camera', tone: 'text-astra-gray' },
  error: { text: 'Camera error', tone: 'text-amber-300' },
};

const PROBLEMS: Partial<Record<CameraState, string>> = {
  requesting: 'Waiting for camera permission…',
  denied:
    'Camera access is blocked. Allow the camera in the browser, or use a sample ID or the student ID.',
  unsupported:
    'No camera is available here. Use a sample ID or the student ID.',
  error: 'The camera could not start. Click to try again.',
};

const CORNERS = [
  'left-0 top-0 border-l-2 border-t-2',
  'right-0 top-0 border-r-2 border-t-2',
  'bottom-0 left-0 border-b-2 border-l-2',
  'bottom-0 right-0 border-b-2 border-r-2',
];

function cameraAvailable(): boolean {
  return typeof navigator.mediaDevices?.getUserMedia === 'function';
}

function failureState(error: unknown): CameraState {
  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? String(error.name)
      : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'unsupported';
  }
  return 'error';
}

export const CameraScanner: React.FC<{
  paused: boolean;
  onDecode: (credential: string) => void;
}> = ({ paused, onDecode }) => {
  const [state, setState] = useState<CameraState>(() =>
    cameraAvailable() ? 'idle' : 'unsupported'
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastSeenRef = useRef<{ value: string; at: number } | null>(null);
  const pausedRef = useRef(paused);
  const onDecodeRef = useRef(onDecode);
  pausedRef.current = paused;
  onDecodeRef.current = onDecode;

  const releaseCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => releaseCamera, [releaseCamera]);

  useEffect(() => {
    if (state !== 'active') return;
    if (videoRef.current) videoRef.current.srcObject = streamRef.current;
    const canvas = document.createElement('canvas');
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || pausedRef.current) return;
      const value = decodeQrFrame(video, canvas);
      if (!value) return;
      const now = Date.now();
      const last = lastSeenRef.current;
      lastSeenRef.current = { value, at: now };
      if (last?.value === value && now - last.at < REPEAT_WINDOW_MS) return;
      onDecodeRef.current(value);
    }, SCAN_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [state]);

  async function openCamera() {
    setState('requesting');
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      lastSeenRef.current = null;
      setState('active');
    } catch (error) {
      releaseCamera();
      setState(failureState(error));
    }
  }

  function cancel() {
    releaseCamera();
    setState('idle');
  }

  const canOpen = state === 'idle' || state === 'denied' || state === 'error';
  const active = state === 'active';
  const status = STATUS_LABELS[state];
  const problem = PROBLEMS[state];

  return (
    <section
      aria-labelledby="scanner-title"
      className={`group relative min-h-[322px] overflow-hidden border bg-black/60 bg-[linear-gradient(rgba(0,177,237,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,177,237,0.06)_1px,transparent_1px)] bg-[size:32px_32px] px-6 py-6 transition-colors ${
        canOpen
          ? 'border-astra-white/10 hover:border-astra-primary-light/50 has-[:focus-visible]:border-astra-primary-light'
          : 'border-astra-white/10'
      }`}
    >
      {canOpen && (
        <button
          type="button"
          onClick={() => void openCamera()}
          aria-label="Open camera to scan a member QR"
          className="absolute inset-0 z-10 cursor-pointer focus:outline-none"
        />
      )}
      <div className="flex justify-between text-[10px] font-medium uppercase">
        <span className="text-astra-gray">Cam 01 / Member ID scanner</span>
        <span className={status.tone}>{status.text}</span>
      </div>

      <div className="relative mx-auto mt-[18px] h-[207px] w-[300px]">
        {active ? (
          <video
            ref={videoRef}
            aria-label="Camera preview"
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full bg-black object-cover"
          />
        ) : (
          <div className="absolute inset-x-4 top-8 flex flex-col items-center text-center">
            <IdCard
              className="h-[70px] w-[70px] text-astra-white"
              strokeWidth={1.25}
              aria-hidden="true"
            />
            <span className="mt-4 h-px w-full bg-astra-primary-light/60" />
            <h2 id="scanner-title" className="mt-4 text-sm font-bold">
              Scan Member Digital ID QR
            </h2>
            <p className="mt-2 text-[10px] text-astra-gray">
              {problem ?? FRAME_HINT}
            </p>
          </div>
        )}
        {CORNERS.map((corner) => (
          <span
            key={corner}
            aria-hidden="true"
            className={`pointer-events-none absolute h-6 w-6 border-astra-primary-light ${corner}`}
          />
        ))}
      </div>

      {active && (
        <>
          <h2 id="scanner-title" className="sr-only">
            Scan Member Digital ID QR
          </h2>
          <p className="mt-2 text-center text-[10px] text-astra-gray">
            {FRAME_HINT}
          </p>
        </>
      )}

      <div className="mt-[18px] flex items-end justify-between text-[10px] font-medium uppercase text-astra-gray">
        <span>Scan mode / Digital ID</span>
        {active && (
          <button
            type="button"
            onClick={cancel}
            className="relative z-20 rounded-full border border-astra-white/30 px-5 py-2 text-xs font-bold normal-case text-astra-white transition-colors hover:border-astra-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-astra-primary-light"
          >
            Cancel
          </button>
        )}
        <span>Automatic verification</span>
      </div>
    </section>
  );
};
