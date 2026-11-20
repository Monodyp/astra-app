import React from 'react';
import { Link } from 'react-router-dom';
import {
  ErrorState,
  LoadingState,
  Panel,
  btnPrimary,
  btnSecondary,
} from '../../../components/mobile/ui.js';
import { useAuth } from '../../../context/AuthContext.js';
import { portalData } from '../../../data/index.js';
import { useResource } from '../../../lib/useResource.js';

const loadOverview = () => portalData.getOverview();

export const MobileOverview: React.FC = () => {
  const { user } = useAuth();
  const overview = useResource(loadOverview);

  if (overview.status === 'error')
    return <ErrorState error={overview.error} onRetry={overview.reload} />;
  if (overview.status === 'loading')
    return <LoadingState label="Loading your overview" />;
  const o = overview.data;
  const duesPaid = o.member.membershipStatus === 'verified';

  return (
    <div className="space-y-4">
      <h2 className="sr-only">Member overview</h2>
      <Panel className="space-y-2">
        <p className="text-lg font-bold">
          {duesPaid ? '✔ Active Member' : '✖ Membership not active'}
        </p>
        <p>{duesPaid ? 'Annual Dues Paid' : 'Annual Dues Unpaid'}</p>
        <p className="break-words">Student ID: {o.member.studentId}</p>
        <p className="break-words">College/Program: {o.member.program}</p>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel>
          <p className="text-lg font-bold">Total Points: {o.points} PTS</p>
          <p className="mt-1 text-sm text-astra-gray">
            Redeemable for partner perks
          </p>
        </Panel>
        <Panel>
          <p className="text-lg font-bold">
            Events Attended: {o.eventsAttended}
          </p>
          <p className="mt-1 text-sm text-astra-gray">
            {o.lastEventName ? `Last: ${o.lastEventName}` : 'No events yet'}
          </p>
        </Panel>
        <Panel>
          <p className="text-lg font-bold">
            Active Vouchers: {o.activeVoucherCount}
          </p>
          <p className="mt-1 text-sm text-astra-gray">
            {o.activeVoucherHighlight ?? 'No active vouchers'}
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/id" className={btnPrimary}>
          Show My Digital ID
        </Link>
        <Link
          to={user?.role === 'officer' ? '/checkin' : '/id'}
          className={btnSecondary}
        >
          Check In to Event
        </Link>
        <Link to="/marketplace" className={btnSecondary}>
          Browse Perks
        </Link>
        <Link to="/vouchers" className={btnSecondary}>
          My Claimed Vouchers
        </Link>
      </div>
    </div>
  );
};
