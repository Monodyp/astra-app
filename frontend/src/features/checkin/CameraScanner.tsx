import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, IdCard } from 'lucide-react';
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

const MESSAGES: Record<CameraState, string> = {
  idle: "Start the camera, then hold a member's Digital ID QR in view.",
  requesting: 'Waiting for camera permission…',
  active: 'Looking for a QR code…',
  denied:
    'Camera access is blocked. Allow the camera in the browser, or use a sample ID or the student ID.',
  unsupported:
    'No camera is available here. Use a sample ID or the student ID.',
  error: 'The camera could not start. Try again.',
};

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

  async function startCamera() {
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

  function stopCamera() {
    releaseCamera();
    setState('idle');
  }

  const canStart = state === 'idle' || state === 'denied' || state === 'error';

  return (
    <div className="mt-4 flex w-full flex-col items-center">
      {state === 'active' ? (
        <video
          ref={videoRef}
          aria-label="Camera preview"
          autoPlay
          muted
          playsInline
          className="aspect-video w-full max-w-[420px] border border-astra-primary-light/60 bg-black object-cover"
        />
      ) : (
        <IdCard
          className="h-10 w-10 text-astra-white"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      )}
      <p aria-live="polite" className="mt-3 text-[10px] text-astra-gray">
        {MESSAGES[state]}
      </p>
      {state === 'active' ? (
        <button
          type="button"
          onClick={stopCamera}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-astra-white/30 px-4 py-2 text-xs font-bold text-astra-white transition-colors hover:border-astra-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-astra-primary-light"
        >
          <CameraOff className="h-4 w-4" aria-hidden="true" />
          Stop camera
        </button>
      ) : (
        canStart && (
          <button
            type="button"
            onClick={() => void startCamera()}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-astra-primary-light px-4 py-2 text-xs font-bold text-astra-white transition-colors hover:bg-[#19c0f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-astra-white"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            Start camera
          </button>
        )
      )}
    </div>
  );
};
