export function storedDate(value: unknown): Date | undefined {
  if (value === null || value === undefined) return undefined;
  const raw = typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function'
    ? value.toDate()
    : value;
  const date = raw instanceof Date ? new Date(raw.getTime())
    : typeof raw === 'string' || typeof raw === 'number' ? new Date(raw) : null;
  if (!date || !Number.isFinite(date.getTime())) throw new TypeError('Invalid stored date');
  return date;
}

export function requiredStoredDate(value: unknown): Date {
  const date = storedDate(value);
  if (!date) throw new TypeError('Missing required stored date');
  return date;
}
