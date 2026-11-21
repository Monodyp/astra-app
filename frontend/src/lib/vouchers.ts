import type { Voucher } from '../data/index.js';

const DEMO_VOUCHER_QR = /^demo-voucher\.v1\.[A-Za-z0-9]+$/;

export const VOUCHER_STATE_LABELS: Record<Voucher['state'], string> = {
  ready: 'Ready',
  redeemed: 'Redeemed',
  expired: 'Expired',
};

export function voucherTitle(voucher: Voucher): string {
  return voucher.reward ?? 'ASTRA partner perk';
}

export function scannableVoucherQr(voucher: Voucher): string | null {
  if (voucher.state !== 'ready' || !voucher.qrValue) return null;
  return DEMO_VOUCHER_QR.test(voucher.qrValue) ? voucher.qrValue : null;
}
