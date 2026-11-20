import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import wordmark from '../../../assets/astra-home/wordmark.png';
import photoPlaceholder from '../../../assets/astra-member/member-photo-placeholder.svg';
import {
  ErrorState,
  LoadingState,
  btnSecondary,
} from '../../../components/mobile/ui.js';
import { portalData } from '../../../data/index.js';
import { useResource } from '../../../lib/useResource.js';

const loadDigitalId = () => portalData.getDigitalId();

export const MobileDigitalID: React.FC = () => {
  const digitalId = useResource(loadDigitalId);

  if (digitalId.status === 'error')
    return <ErrorState error={digitalId.error} onRetry={digitalId.reload} />;
  if (digitalId.status === 'loading')
    return <LoadingState label="Loading your Digital ID" />;
  const p = digitalId.data;
  const valid = p.membershipStatus === 'verified';

  return (
    <article
      aria-label="ASTRA Developers official member card"
      className="space-y-4 border border-astra-primary-dark bg-black/30 p-4 sm:p-6"
    >
      <header className="flex flex-col items-center gap-2 text-center">
        <img src={wordmark} alt="ASTRA Developers" className="h-auto w-32" />
        <h2 className="text-sm text-astra-gray">
          ASTRA Developers · Official Member Card
        </h2>
      </header>

      <div className="flex items-center gap-4">
        <img
          src={photoPlaceholder}
          alt="Member photo placeholder"
          className="h-20 w-16 shrink-0 object-cover"
        />
        <div className="min-w-0">
          <p className="break-words text-lg font-bold">{p.fullName}</p>
          <p className="break-words text-sm text-astra-gray">
            {p.program} · {p.yearLevel}
          </p>
          <p className="break-words text-sm text-astra-gray">{p.studentId}</p>
        </div>
      </div>

      <p
        role="status"
        className={`flex min-h-12 items-center justify-center gap-2 border-2 px-3 text-center font-bold ${
          valid
            ? 'border-emerald-400 text-emerald-200'
            : 'border-red-400 text-red-200'
        }`}
      >
        {valid ? (
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        ) : (
          <XCircle className="h-5 w-5" aria-hidden="true" />
        )}
        {valid ? 'VALID / ACTIVE DUES' : 'UNVERIFIED / INACTIVE FOR CHECK-IN'}
      </p>

      {valid ? (
        <div className="space-y-3">
          <figure className="mx-auto w-full max-w-[240px]">
            <QRCodeSVG
              value={p.qrValue}
              size={256}
              marginSize={2}
              role="img"
              aria-label="Member check-in QR"
              className="h-auto w-full bg-white"
            />
          </figure>
          <p className="text-center text-sm text-astra-gray">
            Present this QR code to event officers or partner staff for
            verification.
          </p>
        </div>
      ) : (
        <div
          className="space-y-3 border border-red-400/60 p-4"
          aria-labelledby="renew-h"
        >
          <h3 id="renew-h" className="font-bold">
            Payment Instructions
          </h3>
          <p className="text-sm text-astra-gray">
            Your annual dues are unpaid, so this ID cannot be verified and no
            verification QR is shown. To renew, contact an ASTRA officer.
          </p>
          <p className="text-sm text-astra-gray">
            Payment details and officer contact information are not available in
            this app yet. Official instructions will appear here once published
            by ASTRA.
          </p>
          <Link to="/not-valid" className={btnSecondary}>
            Read renewal guidance
          </Link>
        </div>
      )}
    </article>
  );
};
