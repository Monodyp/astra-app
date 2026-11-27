import type { Voucher } from '../data/index.js';

export function voucherTitle(voucher: Voucher): string {
  return voucher.reward ?? 'Perk details unavailable';
}

const DEMO_VOUCHER_QR = /^demo-voucher\.v1\.[A-Za-z0-9]+$/;

export const VOUCHER_STATE_LABELS: Record<Voucher['state'], string> = {
  ready: 'Ready',
  redeemed: 'Redeemed',
  expired: 'Expired',
};

export function scannableVoucherQr(voucher: Voucher): string | null {
  if (voucher.state !== 'ready' || !voucher.qrValue) return null;
  return DEMO_VOUCHER_QR.test(voucher.qrValue) ? voucher.qrValue : null;
}

export function scannableVoucherBarcode(voucher: Voucher): string | null {
  // Partner scanner support is unverified; barcodes share the demo QR restriction.
  if (!scannableVoucherQr(voucher)) return null;
  return /^[\x20-\x7E]{1,64}$/.test(voucher.code) ? voucher.code : null;
}
