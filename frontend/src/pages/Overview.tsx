import React from 'react';
import { Link } from 'react-router-dom';
import activityCheck from '../assets/astra-portal/activity-check.svg';
import hudCornerPlus from '../assets/astra-portal/hud-corner-plus.svg';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../components/portal/StatusViews.js';
import { useAuth } from '../context/AuthContext.js';
import { portalData, type ActivityEntry } from '../data/index.js';
import {
  errorMessage,
  formatActivityDate,
  formatPointsDelta,
} from '../lib/format.js';
import { useResource } from '../lib/useResource.js';

const loadOverview = () => portalData.getOverview();

const statCardClass =
  'relative flex flex-col justify-center border border-[#224573] bg-[rgba(10,12,13,0.4)] px-[24px] py-[16px] shadow-[0px_0px_16px_rgba(0,140,204,0.07)] backdrop-blur-[4px]';
const statLinkClass = `${statCardClass} transition-colors hover:border-[#00b1ed]/70`;

function HudFrameAccents() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[7px] -top-[7px] h-[13px] w-[146.48px]"
      >
        <img
          src={hudCornerPlus}
          alt=""
          width={13}
          height={13}
          className="absolute left-0 top-0 size-[13px]"
        />
        <span className="absolute left-[29px] top-[6px] h-px w-[117.48px] bg-[#fdfcfa]/50 opacity-65" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[7px] -right-[7px] h-[13px] w-[146px] rotate-180"
      >
        <img
          src={hudCornerPlus}
          alt=""
          width={13}
          height={13}
          className="absolute left-0 top-0 size-[13px]"
        />
        <span className="absolute left-[29px] top-[6px] h-px w-[117.48px] bg-[#fdfcfa]/50 opacity-65" />
      </div>
    </>
  );
}

const ActivityRow: React.FC<{ entry: ActivityEntry }> = ({ entry }) => (
  <li className="grid grid-cols-2 items-center gap-x-4 gap-y-2 border border-[#1c303f] bg-[rgba(12,19,24,0.4)] p-[16px] sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto_auto] sm:gap-x-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-[32px]">
    <div className="flex items-center gap-[10px]">
      <img
        src={activityCheck}
        alt=""
        aria-hidden="true"
        width={21.5}
        height={21.5}
        className="size-[20px] shrink-0"
      />
      <p className="truncate text-[16px] font-bold leading-[18px] text-[#fdfcf9]">
        {entry.title}
      </p>
    </div>
    <p className="text-right text-[12px] font-medium leading-[14px] text-[#91a3af]">
      {entry.reference}
    </p>
    <p className="text-left text-[15px] font-normal leading-[24px] text-[#9ab5c1] sm:whitespace-nowrap lg:whitespace-normal sm:text-right sm:text-[16px]">
      {entry.statusLabel}
    </p>
    <p
      className={`text-right text-[16px] font-bold leading-[18px] ${
        entry.pointsDelta > 0 ? 'text-[#67ff7f]' : 'text-[#fdfcf9]'
      }`}
    >
      {formatPointsDelta(entry.pointsDelta)}
    </p>
    <p className="col-span-2 text-right text-[12px] font-medium leading-[14px] text-[#91a3af] sm:col-span-1 sm:whitespace-nowrap lg:whitespace-normal">
      {formatActivityDate(entry.occurredAt)}
    </p>
  </li>
);

export const Overview: React.FC = () => {
  const { user } = useAuth();
  const overview = useResource(loadOverview);

  if (overview.status === 'loading') {
    return <LoadingState label="Loading your overview" />;
  }
  if (overview.status === 'error') {
    return (
      <ErrorState
        message={errorMessage(overview.error)}
        onRetry={overview.reload}
      />
    );
  }

  const data = overview.data;
  const verified = data.member.membershipStatus === 'verified';
  const eventsBody = (
    <>
      <HudFrameAccents />
      <div className="flex flex-col gap-[8px]">
        <p className="text-[14px] font-bold leading-[16px] text-[#8a8a8a]">
          Events Attended
        </p>
        <div className="flex flex-col gap-[4px]">
          <p className="text-[20px] font-bold leading-[28px] tracking-[-0.4px] text-[#fdfcfa]">
            {data.eventsAttended}
          </p>
          <p className="text-[14px] font-bold leading-[16px] text-[#8a8a8a]">
            {data.lastEventName
              ? `Last: ${data.lastEventName}`
              : 'No events yet'}
          </p>
        </div>
      </div>
    </>
  );

  return (
    <section
      aria-labelledby="overview-heading"
      className="flex flex-col gap-[32px] pt-[8px]"
    >
      <div className="grid grid-cols-1 gap-x-[16px] gap-y-[16px] md:grid-cols-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:gap-x-[64px]">
        <div className="relative flex flex-col justify-between gap-12 md:col-span-3 lg:col-span-1 border border-[#224573] bg-[rgba(10,12,13,0.4)] px-[24px] py-[36px] shadow-[0px_0px_16px_rgba(0,140,204,0.07)] backdrop-blur-[4px] sm:px-[32px] sm:py-[48px] lg:row-span-3">
          <HudFrameAccents />

          <div className="flex flex-col items-start gap-[24px] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex w-full min-w-0 flex-col gap-[16px] sm:w-auto sm:flex-1">
              <p className="text-[20px] font-bold leading-[28px] tracking-[-0.48px] text-[#fdfcfa] sm:text-[24px] sm:leading-[32px]">
                Welcome back,
              </p>
              <div className="flex flex-col gap-[8px]">
                <h1
                  id="overview-heading"
                  className="break-words text-[30px] font-bold leading-[38px] tracking-[-0.8px] text-[#fdfcfa] sm:text-[40px] sm:leading-[48px]"
                >
                  {data.member.fullName}
                </h1>
                <p className="text-[16px] font-bold leading-[18px] text-[#8a8a8a]">
                  {data.member.membershipId}
                </p>
                {!verified && (
                  <p className="mt-2 inline-flex self-start rounded-full bg-[#fdfcfa]/10 px-4 py-1 text-[12px] font-medium text-[#fdfcfa]">
                    Membership inactive · pay your annual dues to activate your
                    ID
                  </p>
                )}
              </div>
            </div>

            <Link
              to="/id"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-[14px] bg-[#0c2633] px-[24px] py-[16px] text-[12px] font-medium leading-[14px] text-[#00b1ed] transition-colors hover:bg-[#113547]"
            >
              Show My Digital ID
            </Link>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex flex-col gap-[8px]">
              <p className="text-[18px] font-medium leading-[24px] tracking-[-0.4px] text-[#8a8a8a] sm:text-[20px] sm:leading-[28px]">
                College/Program
              </p>
              <p className="text-[20px] font-bold leading-[28px] tracking-[-0.48px] text-[#fdfcfa] sm:text-[24px] sm:leading-[32px]">
                {data.member.program}
              </p>
            </div>

            <div className="flex flex-col gap-[8px]">
              <p className="text-[18px] font-bold leading-[24px] tracking-[-0.4px] text-[#8a8a8a] sm:text-[20px] sm:leading-[28px]">
                Student ID
              </p>
              <p className="text-[20px] font-bold leading-[28px] tracking-[-0.48px] text-[#fdfcfa] sm:text-[24px] sm:leading-[32px]">
                {data.member.studentId}
              </p>
            </div>
          </div>
        </div>
        <Link
          to="/points"
          className="relative flex flex-col justify-center border border-[#224573] bg-[rgba(10,12,13,0.4)] px-[24px] py-[16px] shadow-[0px_0px_32px_0px_rgba(0,140,204,0.07)] backdrop-blur-[4px] transition-colors hover:border-[#00b1ed]/70"
        >
          <HudFrameAccents />
          <div className="flex flex-col gap-[8px]">
            <p className="text-[14px] font-bold leading-[16px] text-[#8a8a8a]">
              Total Points
            </p>
            <div className="flex flex-col gap-[4px]">
              <p className="flex items-baseline gap-1 font-bold text-[#fdfcfa]">
                <span className="text-[20px] leading-[28px] tracking-[-0.4px]">
                  {data.points}
                </span>
                <span className="text-[14px] leading-[16px]">PTS</span>
              </p>
              <p className="text-[14px] font-bold leading-[16px] text-[#8a8a8a]">
                Redeemable for partner perks
              </p>
            </div>
          </div>
        </Link>

        {user?.role === 'officer' ? (
          <Link to="/checkin" className={statLinkClass}>
            {eventsBody}
          </Link>
        ) : (
          <div className={statCardClass}>{eventsBody}</div>
        )}
        <Link to="/vouchers" className={statLinkClass}>
          <HudFrameAccents />
          <div className="flex flex-col gap-[8px]">
            <p className="text-[14px] font-bold leading-[16px] text-[#8a8a8a]">
              Active Vouchers
            </p>
            <div className="flex flex-col gap-[4px]">
              <p className="text-[20px] font-bold leading-[28px] tracking-[-0.4px] text-[#fdfcfa]">
                {data.activeVoucherCount}
              </p>
              <p className="text-[14px] font-bold leading-[16px] text-[#8a8a8a]">
                {data.activeVoucherHighlight ?? 'Claim a perk to start'}
              </p>
            </div>
          </div>
        </Link>
      </div>
      <div className="flex flex-col gap-[10px]">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-bold leading-[28px] tracking-[-0.4px] text-[#fdfcf9]">
            Recent Activity
          </h2>
          <p className="text-[12px] font-medium leading-[14px] text-[#91a3af]">
            {data.activityCount}{' '}
            {data.activityCount === 1 ? 'ACTIVITY' : 'ACTIVITIES'} RECORDED
          </p>
        </div>

        {data.recentActivity.length === 0 ? (
          <EmptyState
            title="No activity yet"
            message="Check in to an event or claim a perk to see it here."
          />
        ) : (
          <ul aria-label="Recent activity" className="flex flex-col gap-[10px]">
            {data.recentActivity.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
