import React from 'react';
import { MemberIdCard } from '../components/id/MemberIdCard';
import { TiltCard } from '@/components/id/tilt-wrapper';
import { FloatingCardWrapper } from '@/components/id/FloatingCardWrapper';
import { technicalCorners } from '@/components/home/ui-util';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { ErrorState, LoadingState } from '../components/portal/StatusViews.js';
import { portalData, type DigitalId } from '../data/index.js';
import { errorMessage } from '../lib/format.js';
import { useResource } from '../lib/useResource.js';

const loadDigitalId = () => portalData.getDigitalId();

const IdCard: React.FC<{ id: DigitalId }> = ({ id }) => {
  const isVerified = id.membershipStatus === 'verified';
  return (
    <MemberIdCard
      name={id.fullName}
      memberNumber={id.studentId}
      program={id.program}
      yearRole={`${id.yearLevel} | ${id.roleLabel}`}
      membershipId={id.membershipId}
      joinMessage={id.statusNote}
      status={id.membershipStatus}
      qrValue={isVerified ? id.qrValue : undefined}
    />
  );
};

export const DigitalID: React.FC = () => {
  const digitalId = useResource(loadDigitalId);

  if (digitalId.status === 'loading') {
    return <LoadingState label="Loading your digital ID" />;
  }
  if (digitalId.status === 'error') {
    return (
      <ErrorState
        message={errorMessage(digitalId.error)}
        onRetry={digitalId.reload}
      />
    );
  }

  const memberData = digitalId.data;
  const isVerified = memberData.membershipStatus === 'verified';

  return (
    <div className="relative overflow-x-clip font-astra text-astra-white">
      <p className="sr-only">
        {isVerified
          ? 'VALID / ACTIVE DUES'
          : 'UNVERIFIED / INACTIVE FOR CHECK-IN'}
      </p>
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/3 h-96 w-96 rounded-full bg-cyan-600/10 blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl space-y-10">
        <div className="border-b border-astra-primary-dark/60 pb-5">
          <h1 className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight text-astra-white">
            Digital ID
          </h1>
          <p className="mt-1 text-sm sm:text-base text-[#d3e5ff]">
            Present your member card to an ASTRA officer or partner staff.
          </p>
        </div>

        <div className="flex flex-col gap-24 sm:gap-28 md:gap-32 items-center">
          {/* <div className="flex flex-col items-center justify-center py-6 w-full sm:py-8"> */}
          <div className="mx-auto mt-11 flex aspect-[600/265] w-3/4 md:w-full min-w-0 sm:aspect-[600/400] max-w-[480px] items-center justify-center">
            <FloatingCardWrapper
              isPreview={false}
              // className="w-full max-w-[340px] sm:max-w-lg aspect-[600/378]"
              className="w-full max-w-md sm:max-w-lg aspect-[600/378] [--astra-drift:0.4] lg:[--astra-drift:1]"
              glowColor={
                isVerified
                  ? 'rgba(0, 177, 237, 0.25)'
                  : 'rgba(100, 116, 139, 0.18)'
              }
              zoomedContent={
                <div className="w-full aspect-[600/378] select-none">
                  <IdCard id={memberData} />
                </div>
              }
            >
              <TiltCard
                className="w-full aspect-[600/378]"
                rotateX={18}
                rotateY={10}
                rotateZ={-16}
                intensity={8}
              >
                <IdCard id={memberData} />
              </TiltCard>
            </FloatingCardWrapper>
          </div>

          <div className="w-full space-y-6">
            <div className="relative border border-astra-primary-dark/80 bg-black/40 p-4 sm:p-7 shadow-[0_0_20px_rgba(0,140,204,0.08)]">
              {technicalCorners}

              {/* Header: stacked on mobile, side by side from sm up */}
              <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-astra-gray">
                    Verification Clearance
                  </p>
                  <h2 className="mt-1 break-words text-base font-bold text-astra-white sm:text-lg">
                    {memberData.fullName}
                  </h2>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 self-start whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${isVerified
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-700/60 text-slate-300 border border-slate-600'
                    }`}
                >
                  {isVerified ? (
                    <CheckCircle2
                      className="h-3.5 w-3.5 text-cyan-400"
                      aria-hidden="true"
                    />
                  ) : (
                    <AlertCircle
                      className="h-3.5 w-3.5 text-amber-400"
                      aria-hidden="true"
                    />
                  )}
                  {isVerified ? 'Verified Member' : 'Unverified'}
                </span>
              </div>

              {/* Details: 1 col on very small screens, 2 cols once there's room */}
              <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 text-sm min-[420px]:grid-cols-2">
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-astra-gray">
                    Student SR-Code
                  </span>
                  <span className="mt-0.5 block break-all font-mono font-medium text-slate-200">
                    {memberData.studentId}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-astra-gray">
                    Membership ID
                  </span>
                  <span className="mt-0.5 block break-all font-mono font-medium text-slate-200">
                    {memberData.membershipId}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-astra-gray">
                    Academic Program
                  </span>
                  <span className="mt-0.5 block break-words text-slate-200">
                    {memberData.program}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-astra-gray">
                    Year &amp; Role
                  </span>
                  <span className="mt-0.5 block break-words text-slate-200">
                    {memberData.yearLevel} · {memberData.roleLabel}
                  </span>
                </div>
              </div>

              <div className="mt-5 border-t border-white/10 pt-3">
                <p className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Status Note:</span>{' '}
                  {memberData.statusNote}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Check-in QR:</span>{' '}
                  {isVerified
                    ? 'Ready to scan at ASTRA events'
                    : 'Inactive for check-in'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
