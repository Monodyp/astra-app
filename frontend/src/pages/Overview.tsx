import React from 'react';
import { Link } from 'react-router-dom';
import activityCheck from '../assets/astra-portal/activity-check.svg';
import hudCornerPlus from '../assets/astra-portal/hud-corner-plus.svg';
import { usePortal } from '../context/PortalContext.js';

const RECENT_ACTIVITIES = [
  {
    id: 'act-1',
    name: 'Yohan Leonor',
    studentId: '24-000000',
    action: 'Checked in',
    points: '+100 pts',
    time: '2:42 PM',
  },
  {
    id: 'act-2',
    name: 'Vince',
    studentId: '24-000000',
    action: 'Checked in',
    points: '+100 pts',
    time: '2:42 PM',
  },
  {
    id: 'act-3',
    name: 'Ryan',
    studentId: '24-000000',
    action: 'Checked in',
    points: '+100 pts',
    time: '2:42 PM',
  },
  {
    id: 'act-4',
    name: 'Sam',
    studentId: '24-000000',
    action: 'Checked in',
    points: '+100 pts',
    time: '2:42 PM',
  },
  {
    id: 'act-5',
    name: 'Charles Michael',
    studentId: '24-000000',
    action: 'Checked in',
    points: '+100 pts',
    time: '2:42 PM',
  },
];

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

export const Overview: React.FC = () => {
  const { pointsBalance, vouchers } = usePortal();
  const activeVouchersCount = vouchers.filter(
    (v) => v.status === 'ready'
  ).length;

  return (
    <section
      aria-labelledby="overview-heading"
      className="flex flex-col gap-[32px] pt-[8px]"
    >
      {/* Hero HUD Grid */}
      <div className="grid grid-cols-1 gap-x-[48px] gap-y-[16px] lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:gap-x-[64px]">
        {/* Main Member Card Panel (spans 3 metric rows on lg) */}
        <div className="relative flex flex-col justify-between gap-12 border border-[#224573] bg-[rgba(10,12,13,0.4)] px-[24px] py-[36px] shadow-[0px_0px_16px_rgba(0,140,204,0.07)] backdrop-blur-[4px] sm:px-[32px] sm:py-[48px] lg:row-span-3">
          <HudFrameAccents />

          <div className="flex flex-wrap items-center justify-between gap-[24px]">
            <div className="flex min-w-0 flex-1 flex-col gap-[16px]">
              <p className="text-[20px] font-bold leading-[28px] tracking-[-0.48px] text-[#fdfcfa] sm:text-[24px] sm:leading-[32px]">
                Welcome back,
              </p>
              <div className="flex flex-col gap-[8px]">
                <h1
                  id="overview-heading"
                  className="text-[30px] font-bold leading-[38px] tracking-[-0.8px] text-[#fdfcfa] sm:text-[40px] sm:leading-[48px]"
                >
                  Fernandez, Menard Troy V.
                </h1>
                <p className="text-[16px] font-bold leading-[18px] text-[#8a8a8a]">
                  ASTR1D-XXXX
                </p>
              </div>
            </div>

            <Link
              to="/id"
              className="inline-flex shrink-0 items-center justify-center rounded-[14px] bg-[#0c2633] px-[24px] py-[16px] text-[12px] font-medium leading-[14px] text-[#00b1ed] transition-colors hover:bg-[#113547]"
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
                BS Computer Science
              </p>
            </div>

            <div className="flex flex-col gap-[8px]">
              <p className="text-[18px] font-bold leading-[24px] tracking-[-0.4px] text-[#8a8a8a] sm:text-[20px] sm:leading-[28px]">
                Student ID
              </p>
              <p className="text-[20px] font-bold leading-[28px] tracking-[-0.48px] text-[#fdfcfa] sm:text-[24px] sm:leading-[32px]">
                2024-XXXXX
              </p>
            </div>
          </div>
        </div>

        {/* Stat 1: Total Points */}
        <Link
          to="/marketplace"
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
                  {pointsBalance}
                </span>
                <span className="text-[14px] leading-[16px]">PTS</span>
              </p>
              <p className="text-[14px] font-bold leading-[16px] text-[#8a8a8a]">
                Redeemable for partner perks
              </p>
            </div>
          </div>
        </Link>

        {/* Stat 2: Events Attended */}
        <Link
          to="/checkin"
          className="relative flex flex-col justify-center border border-[#224573] bg-[rgba(10,12,13,0.4)] px-[24px] py-[16px] shadow-[0px_0px_16px_rgba(0,140,204,0.07)] backdrop-blur-[4px] transition-colors hover:border-[#00b1ed]/70"
        >
          <HudFrameAccents />
          <div className="flex flex-col gap-[8px]">
            <p className="text-[14px] font-bold leading-[16px] text-[#8a8a8a]">
              Events Attended
            </p>
            <div className="flex flex-col gap-[4px]">
              <p className="text-[20px] font-bold leading-[28px] tracking-[-0.4px] text-[#fdfcfa]">
                6
              </p>
              <p className="text-[14px] font-bold leading-[16px] text-[#8a8a8a]">
                Last: Intro to Cloud
              </p>
            </div>
          </div>
        </Link>

        {/* Stat 3: Active Vouchers */}
        <Link
          to="/vouchers"
          className="relative flex flex-col justify-center border border-[#224573] bg-[rgba(10,12,13,0.4)] px-[24px] py-[16px] shadow-[0px_0px_16px_rgba(0,140,204,0.07)] backdrop-blur-[4px] transition-colors hover:border-[#00b1ed]/70"
        >
          <HudFrameAccents />
          <div className="flex flex-col gap-[8px]">
            <p className="text-[14px] font-bold leading-[16px] text-[#8a8a8a]">
              Active Vouchers
            </p>
            <div className="flex flex-col gap-[4px]">
              <p className="text-[20px] font-bold leading-[28px] tracking-[-0.4px] text-[#fdfcfa]">
                {activeVouchersCount}
              </p>
              <p className="text-[14px] font-bold leading-[16px] text-[#8a8a8a]">
                Partner Discount Pass
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="flex flex-col gap-[10px]">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-bold leading-[28px] tracking-[-0.4px] text-[#fdfcf9]">
            Recent Activity
          </h2>
          <p className="text-[12px] font-medium leading-[14px] text-[#91a3af]">
            {RECENT_ACTIVITIES.length} ACTIVITIES RECORDED
          </p>
        </div>

        <div className="flex flex-col gap-[10px]">
          {RECENT_ACTIVITIES.map((activity) => (
            <div
              key={activity.id}
              className="grid grid-cols-2 items-center gap-x-4 gap-y-2 border border-[#1c303f] bg-[rgba(12,19,24,0.4)] p-[16px] sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-x-[32px]"
            >
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
                  {activity.name}
                </p>
              </div>
              <p className="text-right text-[12px] font-medium leading-[14px] text-[#91a3af]">
                {activity.studentId}
              </p>
              <p className="text-left text-[15px] font-normal leading-[24px] text-[#9ab5c1] sm:text-right sm:text-[16px]">
                {activity.action}
              </p>
              <p className="text-right text-[16px] font-bold leading-[18px] text-[#67ff7f]">
                {activity.points}
              </p>
              <p className="col-span-2 text-right text-[12px] font-medium leading-[14px] text-[#91a3af] sm:col-span-1">
                {activity.time}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
