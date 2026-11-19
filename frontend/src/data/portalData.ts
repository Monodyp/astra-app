export type VoucherStatus = 'ready' | 'redeemed' | 'expired';

export type PerkArtworkKind = 'discount' | 'stickers' | 'cafe';

export type PerkCategory =
  | 'all'
  | 'discounts'
  | 'merch'
  | 'workshops'
  | 'checkin'
  | 'opportunities';

export interface MarketplacePerk {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  pointsCost: number;
  category: Exclude<PerkCategory, 'all'>;
  artworkKind: PerkArtworkKind;
  bannerTag: string;
  bannerHeadline: string;
  bannerSubline?: string;
  ticketNumber?: string;
  dialogTitle: string;
  expirationLabel: string;
  terms: string[];
}

export interface ClaimedVoucher {
  id: string;
  title: string;
  description: string;
  code: string;
  status: VoucherStatus;
  dateLabel: string;
  expirationLabel: string;
  artworkKind: PerkArtworkKind;
  artworkLabel: string;
  artworkTitle: string;
  useCafeIcon?: boolean;
  dialogEyebrow: string;
  dialogTitle: string;
  terms: string[];
}

export const DEFAULT_VOUCHER_TERMS = [
  'Valid for one redemption by an active member.',
  'Show your digital ID together with this voucher.',
  'Cannot be combined with other partner offers.',
];

export const INITIAL_PERKS: MarketplacePerk[] = [
  {
    id: 'perk-partner-10',
    eyebrow: 'FEATURED PARTNER PERK',
    title: '10% Off All Tech Workshops & Merchandise',
    description: 'A little boost for your next big idea.',
    pointsCost: 100,
    category: 'discounts',
    artworkKind: 'discount',
    bannerTag: 'PARTNER EXCLUSIVE',
    bannerHeadline: '10%',
    bannerSubline: 'OFF YOUR NEXT BUILD',
    ticketNumber: '01',
    dialogTitle: 'Voucher Claimed: Partner Perk',
    expirationLabel: '31 August 2027',
    terms: DEFAULT_VOUCHER_TERMS,
  },
  {
    id: 'perk-sticker-pack',
    eyebrow: 'MERCH / COLLECTIBLES',
    title: 'ASTRA Official Dev Sticker Pack',
    description: 'Make your setup unmistakably yours.',
    pointsCost: 50,
    category: 'merch',
    artworkKind: 'stickers',
    bannerTag: 'ASTRA ORIGINALS',
    bannerHeadline: 'BUILD. LEARN. SHIP.',
    dialogTitle: 'Voucher Claimed: Dev Sticker Pack',
    expirationLabel: '31 August 2027',
    terms: DEFAULT_VOUCHER_TERMS,
  },
  {
    id: 'perk-campus-cafe',
    eyebrow: 'FOOD & DRINK',
    title: 'Campus Cafe Free Beverage',
    description: 'A well-earned break between builds.',
    pointsCost: 50,
    category: 'discounts',
    artworkKind: 'cafe',
    bannerTag: 'CAMPUS CAFE',
    bannerHeadline: 'One on us.',
    bannerSubline: 'FUEL YOUR NEXT IDEA',
    dialogTitle: 'Voucher Claimed: Campus Cafe',
    expirationLabel: '31 August 2027',
    terms: DEFAULT_VOUCHER_TERMS,
  },
];

export const INITIAL_VOUCHERS: ClaimedVoucher[] = [
  {
    id: 'voucher-98214',
    title: 'Partner Discount Pass',
    description: '10% Off All Tech Workshops & Merchandise',
    code: 'ASTR-PRK-98214',
    status: 'ready',
    dateLabel: 'Valid until 31 Aug 2027',
    expirationLabel: '31 August 2027',
    artworkKind: 'discount',
    artworkLabel: 'PARTNER',
    artworkTitle: '10% OFF',
    dialogEyebrow: 'REDEMPTION / PARTNER PERK',
    dialogTitle: 'Voucher Claimed: Partner Perk',
    terms: DEFAULT_VOUCHER_TERMS,
  },
  {
    id: 'voucher-67420',
    title: 'ASTRA Official Dev Sticker Pack',
    description: 'Make your setup unmistakably yours.',
    code: 'ASTR-PRK-67420',
    status: 'ready',
    dateLabel: 'Valid until 31 Aug 2027',
    expirationLabel: '31 August 2027',
    artworkKind: 'stickers',
    artworkLabel: 'MERCH',
    artworkTitle: 'ASTRA ORIGINALS',
    dialogEyebrow: 'REDEMPTION / MERCH & COLLECTIBLES',
    dialogTitle: 'Voucher Claimed: Dev Sticker Pack',
    terms: DEFAULT_VOUCHER_TERMS,
  },
  {
    id: 'voucher-51807',
    title: 'Campus Cafe Free Beverage',
    description: 'A well-earned break between builds.',
    code: 'ASTR-PRK-51807',
    status: 'ready',
    dateLabel: 'Valid until 31 Aug 2027',
    expirationLabel: '31 August 2027',
    artworkKind: 'cafe',
    artworkLabel: 'MERCH',
    artworkTitle: 'COFFEE BREAK',
    dialogEyebrow: 'REDEMPTION / FOOD & DRINK',
    dialogTitle: 'Voucher Claimed: Campus Cafe',
    terms: DEFAULT_VOUCHER_TERMS,
  },
  {
    id: 'voucher-98214-used',
    title: 'Partner Discount Pass',
    description: '10% Off All Tech Workshops & Merchandise',
    code: 'ASTR-PRK-98214',
    status: 'redeemed',
    dateLabel: 'Valid until 31 Aug 2027',
    expirationLabel: '31 August 2027',
    artworkKind: 'discount',
    artworkLabel: 'PARTNER',
    artworkTitle: '10% OFF',
    dialogEyebrow: 'REDEMPTION / PARTNER PERK',
    dialogTitle: 'Voucher Claimed: Partner Perk',
    terms: DEFAULT_VOUCHER_TERMS,
  },
  {
    id: 'voucher-66319',
    title: 'ASTRA Official Dev Sticker Pack',
    description: 'Make your setup unmistakably yours.',
    code: 'ASTR-PRK-66319',
    status: 'redeemed',
    dateLabel: 'Used 08 Mar 2026',
    expirationLabel: '31 August 2027',
    artworkKind: 'stickers',
    artworkLabel: 'MERCH',
    artworkTitle: 'ASTRA ORIGINALS',
    dialogEyebrow: 'REDEMPTION / MERCH & COLLECTIBLES',
    dialogTitle: 'Voucher Claimed: Dev Sticker Pack',
    terms: DEFAULT_VOUCHER_TERMS,
  },
  {
    id: 'voucher-50412',
    title: 'Campus Cafe Free Beverage',
    description: 'A well-earned break between builds.',
    code: 'ASTR-PRK-50412',
    status: 'expired',
    dateLabel: 'Expired 28 Feb 2026',
    expirationLabel: '28 February 2026',
    artworkKind: 'cafe',
    artworkLabel: 'MERCH',
    artworkTitle: 'COFFEE BREAK',
    useCafeIcon: true,
    dialogEyebrow: 'REDEMPTION / FOOD & DRINK',
    dialogTitle: 'Voucher Claimed: Campus Cafe',
    terms: DEFAULT_VOUCHER_TERMS,
  },
];
