import { JWT } from 'google-auth-library';

const TTL_MS = 60_000;
let cache: { codes: Set<string>; at: number } | null = null;

const norm = (v: unknown) => String(v ?? '').trim().toUpperCase();

async function loadOfficerCodes(): Promise<Set<string>> {
  const sheetId = process.env.OFFICERS_SHEET_ID;
  const range = process.env.OFFICERS_SHEET_RANGE;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!sheetId || !range || !email || !key) return new Set();

  const auth = new JWT({
    email,
    key: key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const res = await auth.request<{ values?: string[][] }>({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}`,
    method: 'GET',
    timeout: 10_000,
    retry: false,
  });

  const rows = res.data.values ?? [];
  const wanted = (process.env.OFFICERS_SR_COLUMN ?? 'sr_code').trim().toLowerCase();
  const col = (rows[0] ?? []).findIndex((h) => h.trim().toLowerCase() === wanted);
  if (col === -1) return new Set();

  return new Set(rows.slice(1).map((r) => norm(r[col])).filter(Boolean));
}

export async function isOfficerSrCode(srCode: string): Promise<boolean> {
  if (!process.env.OFFICERS_SHEET_ID) return false; // feature off, e.g. in tests
  try {
    if (!cache || Date.now() - cache.at > TTL_MS) {
      cache = { codes: await loadOfficerCodes(), at: Date.now() };
    }
    return cache.codes.has(norm(srCode));
  } catch (error) {
    console.error('OFFICER_SHEET_ERROR', error instanceof Error ? error.message : error);
    return false; // fail closed: never grant officer on error
  }
}