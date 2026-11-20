import React, { useState } from 'react';
import { ErrorState, LoadingState, Panel, formatDate } from './ui.js';
import { portalData, type PointsEntryType } from '../../../data/index.js';
import { useResource } from '../../../lib/useResource.js';

const FILTERS = ['All', 'Check-in', 'Grant', 'Redemption'] as const;
type Filter = (typeof FILTERS)[number];

const TYPE_LABELS: Record<PointsEntryType, string> = {
  attendance: 'Check-in',
  grant: 'Grant',
  redemption: 'Redemption',
  adjustment: 'Adjustment',
};

const loadPoints = () => portalData.getPoints();

export const MobilePoints: React.FC = () => {
  const points = useResource(loadPoints);
  const [filter, setFilter] = useState<Filter>('All');

  if (points.status === 'error')
    return <ErrorState error={points.error} onRetry={points.reload} />;
  if (points.status === 'loading')
    return <LoadingState label="Loading points" />;
  const { balance, entries } = points.data;
  const lifetimeEarned = entries
    .filter((l) => l.amount > 0)
    .reduce((a, l) => a + l.amount, 0);
  const lifetimeRedeemed = -entries
    .filter((l) => l.type === 'redemption')
    .reduce((a, l) => a + l.amount, 0);
  const rows = entries.filter(
    (l) => filter === 'All' || TYPE_LABELS[l.type] === filter
  );

  const stat = (label: string, value: number) => (
    <Panel className="min-h-20">
      <p className="text-sm text-astra-gray">{label}</p>
      <p className="mt-1 text-2xl font-bold">
        {value} <span className="text-base">PTS</span>
      </p>
    </Panel>
  );

  return (
    <div className="space-y-4">
      <h2 className="sr-only">Points and ledger</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {stat('Current Balance', balance)}
        {stat('Lifetime Earned', lifetimeEarned)}
        {stat('Lifetime Redeemed', lifetimeRedeemed)}
      </div>

      <div
        role="group"
        aria-label="Filter ledger by type"
        className="flex flex-wrap gap-2 border border-astra-primary-dark p-2"
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`min-h-11 flex-1 whitespace-nowrap px-3 text-sm font-bold ${filter === f ? 'bg-astra-primary-light/20 text-astra-primary-light underline underline-offset-4' : 'text-astra-gray hover:text-astra-white'}`}
          >
            {f === 'Redemption' ? 'Redeemed' : f === 'Grant' ? 'Grants' : f}
          </button>
        ))}
      </div>

      {rows.length === 0 && (
        <Panel>
          <p role="status">No ledger entries match this filter.</p>
        </Panel>
      )}
      <ul className="space-y-3">
        {rows.map((l) => (
          <li
            key={l.id}
            className="border border-astra-primary-dark bg-black/30"
          >
            <dl className="divide-y divide-astra-primary-dark/60">
              {[
                ['Date', formatDate(l.createdAt)],
                ['Activity / Event', l.reason],
                ['Type', TYPE_LABELS[l.type]],
                [
                  'Points',
                  `${l.amount > 0 ? '+' : '−'}${Math.abs(l.amount)} PTS`,
                ],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="grid grid-cols-[8.5rem_1fr] gap-2 px-3 py-2 sm:grid-cols-[12rem_1fr]"
                >
                  <dt className="text-astra-gray">{k}</dt>
                  <dd className="min-w-0 break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
};
