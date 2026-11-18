/**
 * Backend handoff: add data/live/ with a PortalDataSource for the API and
 * select it here. Pages, routes, and components need no changes.
 */
import type { PortalDataSource } from './contracts.js';
import { createDemoDataSource } from './demo/demoSource.js';

export * from './contracts.js';

const DEMO_LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 250;

let source: PortalDataSource = createDemoDataSource({
  latencyMs: DEMO_LATENCY_MS,
});

export function setPortalDataSource(next: PortalDataSource): PortalDataSource {
  const previous = source;
  source = next;
  return previous;
}

export const portalData: PortalDataSource = {
  restoreSession: () => source.restoreSession(),
  listSignInShortcuts: () => source.listSignInShortcuts(),
  signIn: (input) => source.signIn(input),
  signOut: () => source.signOut(),
  getOverview: () => source.getOverview(),
  getDigitalId: () => source.getDigitalId(),
  listPerks: () => source.listPerks(),
  claimPerk: (perkId) => source.claimPerk(perkId),
  listVouchers: () => source.listVouchers(),
  getVoucher: (voucherId) => source.getVoucher(voucherId),
  getCheckInStation: () => source.getCheckInStation(),
  listScanSamples: () => source.listScanSamples(),
  checkIn: (input) => source.checkIn(input),
  searchMembers: (query) => source.searchMembers(query),
  grantPoints: (input) => source.grantPoints(input),
};
