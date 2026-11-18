import React, { useState, useEffect, useCallback } from 'react';
import { MemberIdCard } from '../components/id/MemberIdCard';
import { TiltCard } from '@/components/id/tilt-wrapper';
import { FloatingCardWrapper } from '@/components/id/FloatingCardWrapper';
import { technicalCorners } from '@/components/home/ui-util';
import { RotateCw, CheckCircle2, AlertCircle, QrCode as QrIcon } from 'lucide-react';

type MemberData = {
  fullName: string;
  studentId: string;
  membershipId: string;
  program: string;
  yearLevel: string;
  roleLabel: string;
  membershipStatus: 'verified' | 'unverified';
  statusNote: string;
  qrValue: string;
  expiresInSeconds?: number;
};

const DEFAULT_MEMBER_PLACEHOLDER: MemberData = {
  fullName: 'Jane Doe',
  studentId: '2024-XXXXX',
  membershipId: 'ASTR1D-XXXX',
  program: 'BS Computer Science',
  yearLevel: '3rd year',
  roleLabel: 'Member',
  membershipStatus: 'verified',
  statusNote: 'Annual dues paid · Valid until Aug 2027',
  qrValue: 'ASTRA-TOKEN-VERIFIED-DEMO-PAYLOAD-2026',
  expiresInSeconds: 300,
};

export const DigitalID: React.FC = () => {
  const [memberData, setMemberData] = useState<MemberData>(DEFAULT_MEMBER_PLACEHOLDER);
  const [refreshCountdown, setRefreshCountdown] = useState<number>(300);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Accomplish TODO(Frontend): Wire up /members/me/id data fetching with fallback to rich placeholder data
  const fetchMemberId = useCallback(async () => {
    setLoading(true);
    try {
      // In development/stub environment, try fetching; fallback seamlessly to placeholder
      const response = await fetch('/api/members/me/id').catch(() => null);
      if (response && response.ok) {
        const json = await response.json();
        if (json?.card) {
          setMemberData((prev) => ({
            ...prev,
            fullName: json.card.fullName || prev.fullName,
            studentId: json.card.studentId || prev.studentId,
            membershipStatus: json.card.isPaid ? 'verified' : 'unverified',
            qrValue: json.card.qrToken || prev.qrValue,
          }));
        }
      }
    } catch {
      // Graceful fallback to default placeholder
    } finally {
      setLoading(false);
      setRefreshCountdown(300);
    }
  }, []);

  useEffect(() => {
    void fetchMemberId();
  }, [fetchMemberId]);

  // Dynamic QR Refresh Timer (5-minute countdown as specified in the handoff)
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          void fetchMemberId();
          return 300;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchMemberId]);

  const isVerified = memberData.membershipStatus === 'verified';

  // Toggle helper for easily testing verified vs unverified states
  const toggleVerificationStatus = () => {
    setMemberData((prev) => {
      const nextStatus = prev.membershipStatus === 'verified' ? 'unverified' : 'verified';
      return {
        ...prev,
        membershipStatus: nextStatus,
        roleLabel: nextStatus === 'verified' ? 'Member' : 'Non-member',
        membershipId: nextStatus === 'verified' ? 'ASTR1D-XXXX' : 'NON-MEMBER',
        statusNote:
          nextStatus === 'verified'
            ? 'Annual dues paid · Valid until Aug 2027'
            : 'Membership inactive · Unverified for AY 2026–2027',
      };
    });
  };

  return (
    <div className="relative min-h-screen py-6 px-4 sm:px-8 font-astra text-astra-white">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/3 h-96 w-96 rounded-full bg-cyan-600/10 blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl space-y-10">
        {/* Header Telemetry */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-astra-primary-dark/60 pb-5">
          <div>
            <h1 className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight text-astra-white">
              Digital ID
            </h1>
            <p className="mt-1 text-sm sm:text-base text-[#d3e5ff]">
              Present your member card to an ASTRA officer or partner staff.
            </p>
          </div>

          {/* Dev/Demo State Switcher */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleVerificationStatus}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${isVerified
                ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
                : 'border-slate-500/50 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              title="Click to preview Verified vs Unverified card appearance"
            >
              <span className={`h-2 w-2 rounded-full ${isVerified ? 'bg-cyan-400' : 'bg-amber-400'}`} />
              <span>Preview: {isVerified ? 'Verified Member' : 'Unverified'}</span>
            </button>
          </div>
        </div>

        {/* Main Stage: Floating Card Showcase */}
        <div className="grid gap-32 lg:grid-rows-[1.1fr_0.9fr] lg:items-center">
          {/* Left Column: 3D Zero-G Floating Card with Lightbox Zoom Overlay */}
          <div className="flex flex-col items-center justify-center py-6 sm:py-8">
            <FloatingCardWrapper
              className="w-full max-w-md sm:max-w-lg aspect-[600/378]"
              glowColor={isVerified ? 'rgba(0, 177, 237, 0.25)' : 'rgba(100, 116, 139, 0.18)'}
              zoomedContent={
                <div className="w-full aspect-[600/378] select-none">
                  <MemberIdCard
                    name={memberData.fullName}
                    memberNumber={memberData.studentId}
                    program={memberData.program}
                    yearRole={`${memberData.yearLevel} | ${memberData.roleLabel}`}
                    membershipId={memberData.membershipId}
                    joinMessage={isVerified ? 'Annual dues paid' : 'Membership inactive'}
                    status={memberData.membershipStatus}
                  />
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
                <MemberIdCard
                  name={memberData.fullName}
                  memberNumber={memberData.studentId}
                  program={memberData.program}
                  yearRole={`${memberData.yearLevel} | ${memberData.roleLabel}`}
                  membershipId={memberData.membershipId}
                  joinMessage={isVerified ? 'Annual dues paid' : 'Membership inactive'}
                  status={memberData.membershipStatus}
                />
              </TiltCard>
            </FloatingCardWrapper>
          </div>

          {/* Right Column: Member Details & QR Code Verification Co  nsole */}
          <div className="space-y-6">
            {/* Accomplish TODO(Frontend): Student Details & Status Display */}
            <div className="relative border border-astra-primary-dark/80 bg-black/40 p-6 sm:p-7 shadow-[0_0_20px_rgba(0,140,204,0.08)]">
              {technicalCorners}

              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-astra-gray">
                    Verification Clearance
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-astra-white">
                    {memberData.fullName}
                  </h3>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isVerified
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-700/60 text-slate-300 border border-slate-600'
                      }`}
                  >
                    {isVerified ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                    )}
                    {isVerified ? 'Verified Member' : 'Unverified'}
                  </span>
                </div>
              </div>

              {/* Information Grid */}
              <div className="mt-4 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-astra-gray">
                    Student SR-Code
                  </span>
                  <span className="mt-0.5 block font-mono font-medium text-slate-200">
                    {memberData.studentId}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-astra-gray">
                    Membership ID
                  </span>
                  <span className="mt-0.5 block font-mono font-medium text-slate-200">
                    {memberData.membershipId}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-astra-gray">
                    Academic Program
                  </span>
                  <span className="mt-0.5 block text-slate-200">
                    {memberData.program}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-astra-gray">
                    Year &amp; Role
                  </span>
                  <span className="mt-0.5 block text-slate-200">
                    {memberData.yearLevel} · {memberData.roleLabel}
                  </span>
                </div>
              </div>

              <div className="mt-5 border-t border-white/10 pt-3">
                <p className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Status Note:</span>{' '}
                  {memberData.statusNote}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
