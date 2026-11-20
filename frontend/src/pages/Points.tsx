import React, { useState } from 'react';
import { PageHeading } from '../components/portal/PageHeading.js';
import { Panel } from '../components/portal/Panel.js';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../components/portal/StatusViews.js';
import {
  portalData,
  type PointsEntry,
  type PointsEntryType,
} from '../data/index.js';
import {
  errorMessage,
  formatActivityDate,
  formatPointsDelta,
} from '../lib/format.js';
import { useResource } from '../lib/useResource.js';

const loadPoints = () => portalData.getPoints();

type Filter = 'all' | PointsEntryType;

const FILTERS: Array<[Filter, string]> = [
  ['all', 'All'],
  ['attendance', 'Check-ins'],
  ['grant', 'Grants'],
  ['redemption', 'Redemptions'],
  ['adjustment', 'Adjustments'],
];

const TYPE_LABELS: Record<PointsEntryType, string> = {
  attendance: 'Check-in',
  grant: 'Grant',
  redemption: 'Redemption',
  adjustment: 'Adjustment',
};

function totals(entries: PointsEntry[]) {
  let earned = 0;
  let spent = 0;
  for (const entry of entries) {
    if (entry.type === 'redemption') {
      spent -= entry.amount;
    } else if (entry.amount > 0) {
      earned += entry.amount;
    }
  }
  return { earned, spent };
}

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <Panel className="px-6 py-5">
    <p className="text-sm font-bold text-astra-gray">{label}</p>
    <p className="mt-2 flex items-baseline gap-1 font-bold">
      <span className="text-2xl">{value}</span>
      <span className="text-sm">PTS</span>
    </p>
  </Panel>
);

const EntryRow: React.FC<{ entry: PointsEntry }> = ({ entry }) => (
  <li className="grid grid-cols-2 items-center gap-x-4 gap-y-2 border border-[#1c303f] bg-[rgba(12,19,24,0.4)] p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-x-8">
    <div className="min-w-0">
      <p className="truncate font-bold">{entry.reason}</p>
      <p className="truncate text-xs text-astra-gray">{entry.reference}</p>
    </div>
    <p className="text-right text-sm text-[#9ab5c1] sm:text-left">
      {TYPE_LABELS[entry.type]}
    </p>
    <p
      className={`font-bold sm:text-right ${
        entry.amount > 0 ? 'text-[#67ff7f]' : 'text-astra-white'
      }`}
    >
      {formatPointsDelta(entry.amount)}
    </p>
    <p className="text-right text-xs text-astra-gray">
      {formatActivityDate(entry.createdAt)}
    </p>
  </li>
);

export const Points: React.FC = () => {
  const points = useResource(loadPoints);
  const [filter, setFilter] = useState<Filter>('all');

  if (points.status === 'loading') {
    return <LoadingState label="Loading your points" />;
  }
  if (points.status === 'error') {
    return (
      <ErrorState
        message={errorMessage(points.error)}
        onRetry={points.reload}
      />
    );
  }

  const { balance, entries } = points.data;
  const { earned, spent } = totals(entries);
  const shown = entries.filter(
    (entry) => filter === 'all' || entry.type === filter
  );

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Rewards"
        title="Points"
        description="Every point you earned and spent, newest first."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Current Balance" value={balance} />
        <Stat label="Lifetime Earned" value={earned} />
        <Stat label="Spent on Perks" value={spent} />
      </div>

      <div
        role="group"
        aria-label="Filter the ledger by type"
        className="flex gap-1 overflow-x-auto border-b border-astra-primary-dark [scrollbar-width:none]"
      >
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-bold transition-colors ${
              filter === value
                ? 'border-astra-primary-light text-astra-primary-light'
                : 'border-transparent text-astra-gray hover:text-astra-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title="No entries"
          message={
            entries.length === 0
              ? 'Check in to an event or receive a grant to earn points.'
              : 'No ledger entries match this filter.'
          }
        />
      ) : (
        <ul aria-label="Points ledger" className="flex flex-col gap-[10px]">
          {shown.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
};
