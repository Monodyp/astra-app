import { isDataError } from '../data/index.js';

const timeFormat = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});
const shortDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const longDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const activityDateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return 'Date unavailable';
  return shortDateFormat.format(new Date(iso));
}

export function formatLongDate(iso: string | null | undefined): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return 'Date unavailable';
  return longDateFormat.format(new Date(iso));
}

export function formatActivityDate(iso: string): string {
  return `${activityDateFormat.format(new Date(iso))} · ${formatTime(iso)}`;
}

export function formatPointsDelta(delta: number): string {
  return `${delta > 0 ? '+' : delta < 0 ? '-' : ''}${Math.abs(delta)} pts`;
}

export function errorMessage(error: unknown): string {
  return isDataError(error)
    ? error.message
    : 'The portal could not load this information. Try again.';
}
