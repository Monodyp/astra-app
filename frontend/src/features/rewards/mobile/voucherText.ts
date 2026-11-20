import type { Voucher } from '../../../data/index.js';

export const VOUCHER_STATUS: Record<
  Voucher['state'],
  'Active' | 'Redeemed' | 'Expired'
> = {
  ready: 'Active',
  redeemed: 'Redeemed',
  expired: 'Expired',
};

export function voucherTitle(voucher: Voucher): string {
  return voucher.reward ?? 'Perk details unavailable';
}
