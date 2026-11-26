import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ScanLine, X } from 'lucide-react';
import type { ScanSample } from '../../data/index.js';

export const SampleQrPanel: React.FC<{
  sample: ScanSample;
  busy: boolean;
  scanning: boolean;
  onSimulate: () => void;
  onClose: () => void;
}> = ({ sample, busy, scanning, onSimulate, onClose }) => (
  <section
    aria-label={`Sample QR for ${sample.label}`}
    className="mt-6 flex flex-col items-start gap-5 border border-astra-primary-dark bg-black/70 px-4 py-6 sm:flex-row sm:items-center sm:gap-8 sm:px-6"
  >
    <div className="shrink-0 bg-astra-white p-3">
      <QRCodeSVG
        value={sample.credential}
        size={152}
        role="img"
        aria-label={`QR code for ${sample.label}`}
      />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-medium uppercase text-astra-primary-light">
        Sample ID
      </p>
      <p className="mt-1 text-lg font-bold">{sample.label}</p>
      <p className="text-xs text-astra-gray">{sample.hint}</p>
      <p className="mt-3 break-all font-mono text-[10px] text-astra-gray">
        {sample.credential}
      </p>
      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          onClick={onSimulate}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-astra-primary-light px-5 py-2 text-sm font-bold text-astra-white transition-colors hover:bg-[#19c0f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-astra-white disabled:cursor-not-allowed disabled:bg-astra-disabled disabled:text-astra-gray"
        >
          <ScanLine className="h-4 w-4" aria-hidden="true" />
          {scanning ? 'Scanning…' : 'Simulate scan'}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sample QR"
          className="rounded-full p-2 text-astra-gray transition-colors hover:text-astra-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-astra-primary-light"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  </section>
);
