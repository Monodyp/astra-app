/**
 * Selects the live portal data adapter backed by Firebase Auth and the ASTRA API.
 * Tests can inject a fake adapter via setPortalDataSource.
 */
import type { PortalDataSource } from './contracts.js';
import { createLiveDataSource } from './live/liveSource.js';

export * from './contracts.js';

let source: PortalDataSource = createLiveDataSource();

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
