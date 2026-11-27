import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ErrorState,
  LoadingState,
  btnPrimary,
} from '../../../components/mobile/ui.js';
import { useAuth } from '../../../context/AuthContext.js';
import { portalData, type PointsEntryType } from '../../../data/index.js';
import {
  formatActivityDate,
  formatPointsDelta,
} from '../../../lib/format.js';
import { useResource } from '../../../lib/useResource.js';

const loadPoints = () => portalData.getPoints();

const FILTERS = [
  'All',
  'Check-in',
  'Grant',
  'Redemption',
  'Adjustment',
] as const;
type Filter = (typeof FILTERS)[number];

const TYPE_LABELS: Record<PointsEntryType, string> = {
  attendance: 'Check-in',
  grant: 'Grant',
  redemption: 'Redemption',
  adjustment: 'Adjustment',
};

const FILTER_TYPES: Record<Exclude<Filter, 'All'>, PointsEntryType> = {
  'Check-in': 'attendance',
  Grant: 'grant',
  Redemption: 'redemption',
  Adjustment: 'adjustment',
};

const TIERS = [
  { name: 'Novice', min: 0 },
  { name: 'Bronze', min: 500 },
  { name: 'Silver', min: 1500 },
  { name: 'Gold', min: 3000 },
] as const;

function tierProgress(lifetimeEarned: number) {
  let index = 0;
  for (let i = 0; i < TIERS.length; i += 1) {
    if (lifetimeEarned >= TIERS[i].min) index = i;
  }
  const current = TIERS[index];
  const next = TIERS[index + 1];
  const percent = next
    ? Math.min(
        100,
        Math.round(
          ((lifetimeEarned - current.min) / (next.min - current.min)) * 100
        )
      )
    : 100;
  return { current, next, percent };
}

export const DesktopPoints: React.FC = () => {
  const points = useResource(loadPoints);
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('All');

  if (points.status === 'loading') {
    return <LoadingState label="Loading points" />;
  }
  if (points.status === 'error') {
    return <ErrorState error={points.error} onRetry={points.reload} />;
  }

  const { balance, entries } = points.data;
  const lifetimeEarned = entries
    .filter((entry) => entry.amount > 0)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const lifetimeSpent = -entries
    .filter((entry) => entry.type === 'redemption')
    .reduce((sum, entry) => sum + entry.amount, 0);
  const rows = entries.filter(
    (entry) => filter === 'All' || entry.type === FILTER_TYPES[filter]
  );
  const { current, next, percent } = tierProgress(lifetimeEarned);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold">Points &amp; Ledger</h2>
          <p className="mt-2 text-sm text-astra-gray">
            Your point balance, tier progress, and every point earned or spent.
          </p>
        </div>
        {user?.role === 'officer' && (
          <Link
            to="/officer/grant-points"
            className={btnPrimary + ' w-auto px-6'}
          >
            Grant Points
          </Link>
        )}
      </div>

      <section
        aria-label="Points balance"
        className="border border-astra-primary-dark bg-black/30 p-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-astra-gray">Total points balance</p>
            <p className="mt-1 text-5xl font-bold">
              {balance} <span className="text-2xl text-astra-gray">PTS</span>
            </p>
          </div>
          <dl className="flex gap-10">
            <div>
              <dt className="text-sm text-astra-gray">Lifetime Earned</dt>
              <dd className="mt-1 text-2xl font-bold text-astra-primary-light">
                {formatPointsDelta(lifetimeEarned)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-astra-gray">Spent on Perks</dt>
              <dd className="mt-1 text-2xl font-bold">
                {formatPointsDelta(-lifetimeSpent)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 border-t border-astra-primary-dark pt-5">
          <div className="flex items-baseline justify-between text-sm">
            <p className="font-bold">
              Tier: {current.name}
              {next && (
                <span className="ml-2 font-normal text-astra-gray">
                  {next.name} at {next.min} PTS earned
                </span>
              )}
            </p>
            <p className="text-astra-gray" aria-live="polite">
              {next
                ? `${next.min - lifetimeEarned} PTS to ${next.name}`
                : 'Top tier reached'}
            </p>
          </div>
          <div
            role="progressbar"
            aria-label={`${current.name} tier progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-3 h-3 border border-astra-primary-dark bg-black/60"
          >
            <div
              className="h-full bg-astra-primary-light"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </section>

      <nav
        role="group"
        aria-label="Filter ledger by type"
        className="border-b border-astra-primary-dark"
      >
        <div className="flex gap-8">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
              className={`border-b-2 px-1 py-3 text-sm font-bold ${
                filter === item
                  ? 'border-astra-primary-light text-astra-primary-light'
                  : 'border-transparent text-astra-gray hover:text-astra-white'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </nav>

      {rows.length === 0 ? (
        <p
          role="status"
          className="border border-astra-primary-dark p-8 text-center text-astra-gray"
        >
          No ledger entries match this filter.
        </p>
      ) : (
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Points ledger, newest first</caption>
          <thead>
            <tr className="border-b border-astra-primary-dark text-sm text-astra-gray">
              <th scope="col" className="py-3 pr-4 font-bold">
                Activity
              </th>
              <th scope="col" className="py-3 pr-4 font-bold">
                Type
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-bold">
                Points
              </th>
              <th scope="col" className="py-3 text-right font-bold">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-astra-primary-dark/60 align-top"
              >
                <td className="py-4 pr-4">
                  <p className="font-bold">{entry.reason}</p>
                  <p className="break-all text-xs text-astra-gray">
                    {entry.reference}
                  </p>
                </td>
                <td className="py-4 pr-4 text-sm text-astra-gray">
                  {TYPE_LABELS[entry.type]}
                </td>
                <td
                  className={`py-4 pr-4 text-right font-bold ${
                    entry.amount > 0 ? 'text-astra-primary-light' : ''
                  }`}
                >
                  {formatPointsDelta(entry.amount)}
                </td>
                <td className="py-4 text-right text-sm text-astra-gray">
                  {formatActivityDate(entry.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
 </table>
      )}
    </div>
  );
};
