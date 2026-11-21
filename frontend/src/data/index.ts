/**
 * Selects between live backend API data and offline demo data.
 * Default (no env flag set) = LIVE data.
 * Explicit 'demo' or vitest runner = DEMO data.
 */
import type { PortalDataSource } from './contracts.js';
import { createDemoDataSource } from './demo/demoSource.js';
import { createLiveDataSource } from './live/liveSource.js';

export * from './contracts.js';

const DEMO_LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 250;

/**
 * Resolves the active data source mode.
 * - In automated test runs (vitest), always defaults to demo for speed and isolation.
 * - If VITE_PORTAL_DATA_SOURCE is explicitly 'demo', uses demo.
 * - If VITE_PORTAL_DATA_SOURCE is omitted or 'live', defaults to LIVE!
 */
export function resolveDataSourceMode(
  env: { MODE?: string; VITE_PORTAL_DATA_SOURCE?: string } = import.meta.env
): 'demo' | 'live' {
  if (env.MODE === 'test') {
    return 'demo';
  }
  if (env.VITE_PORTAL_DATA_SOURCE === 'demo') {
    return 'demo';
  }
  return 'live';
}

export function createConfiguredDataSource(): PortalDataSource {
  return resolveDataSourceMode() === 'live'
    ? createLiveDataSource()
    : createDemoDataSource({ latencyMs: DEMO_LATENCY_MS });
}

let source: PortalDataSource = createConfiguredDataSource();

export function setPortalDataSource(next: PortalDataSource): PortalDataSource {
  const previous = source;
  source = next;
  return previous;
}

export function resetPortalDataSource(): void {
  source = createConfiguredDataSource();
}

export const portalData: PortalDataSource = {
  restoreSession: () => source.restoreSession(),
  listSignInShortcuts: () => source.listSignInShortcuts(),
  signIn: (input) => source.signIn(input),
  signOut: () => source.signOut(),
  getOverview: () => source.getOverview(),
  getDigitalId: () => source.getDigitalId(),
  getPoints: () => source.getPoints(),
  listPerks: () => source.listPerks(),
  claimPerk: (perkId, options) => source.claimPerk(perkId, options),
  listVouchers: () => source.listVouchers(),
  getVoucher: (voucherId) => source.getVoucher(voucherId),
  getCheckInStation: () => source.getCheckInStation(),
  listScanSamples: () => source.listScanSamples(),
  checkIn: (input) => source.checkIn(input),
  searchMembers: (query) => source.searchMembers(query),
  grantPoints: (input) => source.grantPoints(input),
};
