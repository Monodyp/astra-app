import { ServiceUnavailableError, type MemberDataSource } from './types';

/** Used when fixture mode is off: the backend member routes are stubs, so every call says so. */
export const unavailableSource: MemberDataSource = {
  kind: 'unavailable',
  getProfile: () => Promise.reject(new ServiceUnavailableError('Member sign-in')),
  getPoints: () => Promise.reject(new ServiceUnavailableError('Points')),
  getLedger: () => Promise.reject(new ServiceUnavailableError('Points history')),
  getPerks: () => Promise.reject(new ServiceUnavailableError('The perks marketplace')),
  getVouchers: () => Promise.reject(new ServiceUnavailableError('Vouchers')),
  getVoucher: () => Promise.reject(new ServiceUnavailableError('Vouchers')),
  getScans: () => Promise.resolve([]),
  claimPerk: () => Promise.reject(new ServiceUnavailableError('Voucher claiming')),
  checkIn: () => Promise.reject(new ServiceUnavailableError('Event check-in')),
  searchMembers: () => Promise.reject(new ServiceUnavailableError('Member search')),
  grantPoints: () => Promise.reject(new ServiceUnavailableError('Point grants')),
};
