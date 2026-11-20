import React from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState, Panel, btnPrimary, btnSecondary } from '@/components/member/ui';
import { useMemberQuery } from '@/features/member/MemberDataContext';

export const MemberOverview: React.FC = () => {
  const profile = useMemberQuery((s) => s.getProfile());
  const points = useMemberQuery((s) => s.getPoints());
  const vouchers = useMemberQuery((s) => s.getVouchers());

  if (profile.status === 'error') return <ErrorState error={profile.error} onRetry={profile.reload} />;
  if (profile.status === 'loading' || !profile.data) return <LoadingState label="Loading your overview" />;
  const p = profile.data;
  const active = (vouchers.data ?? []).filter((v) => v.status === 'Active');

  return (
    <div className="space-y-4">
      <h2 className="sr-only">Member overview</h2>
      <Panel className="space-y-2">
        <p className="text-lg font-bold">
          {p.duesPaid ? '✔ Active Member' : '✖ Membership not active'}
        </p>
        <p>{p.duesPaid ? 'Annual Dues Paid' : 'Annual Dues Unpaid'}</p>
        <p className="break-words">Student ID: {p.studentId}</p>
        <p className="break-words">College/Program: {p.program}</p>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel>
          {points.status === 'ready' && points.data ? (
            <>
              <p className="text-lg font-bold">Total Points: {points.data.balance} PTS</p>
              <p className="mt-1 text-sm text-astra-gray">Redeemable for partner perks</p>
            </>
          ) : (
            <p className="text-sm text-astra-gray">{points.status === 'error' ? 'Points unavailable.' : 'Loading points…'}</p>
          )}
        </Panel>
        <Panel>
          {points.data ? (
            <>
              <p className="text-lg font-bold">Events Attended: {points.data.eventsAttended}</p>
              <p className="mt-1 text-sm text-astra-gray">{points.data.lastEvent ? `Last: ${points.data.lastEvent}` : 'No events yet'}</p>
            </>
          ) : (
            <p className="text-sm text-astra-gray">{points.status === 'error' ? 'Events unavailable.' : 'Loading events…'}</p>
          )}
        </Panel>
        <Panel>
          {vouchers.status === 'ready' ? (
            <>
              <p className="text-lg font-bold">Active Vouchers: {active.length}</p>
              <p className="mt-1 text-sm text-astra-gray">{active[0]?.title ?? 'No active vouchers'}</p>
            </>
          ) : (
            <p className="text-sm text-astra-gray">{vouchers.status === 'error' ? 'Vouchers unavailable.' : 'Loading vouchers…'}</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/id" className={btnPrimary}>Show My Digital ID</Link>
        <Link to="/checkin" className={btnSecondary}>Check In to Event</Link>
        <Link to="/marketplace" className={btnSecondary}>Browse Perks</Link>
        <Link to="/vouchers" className={btnSecondary}>My Claimed Vouchers</Link>
      </div>
    </div>
  );
};
