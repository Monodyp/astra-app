import { env } from '../config/env.js';
import { firebaseAdmin } from '../lib/firebase.js';

export type VoucherStatus = 'active' | 'used' | 'expired';

export interface Voucher {
  id: string;
  code: string;
  status: VoucherStatus;
  partnerName: string;
  reward: string;
  expiresAt?: Date;
  memberId?: string;
  perkId?: string;
  pointsCost?: number;
  instructions?: string;
  redeemedAt?: Date;
  createdAt: Date;
  idempotencyKey?: string;
}

export type MarkUsedResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'wrong_partner' | 'expired' | 'already_used' };

export interface VoucherRepository {
  create(voucher: Voucher): Promise<Voucher>;
  getById(id: string): Promise<Voucher | null>;
  getByCode(code: string): Promise<Voucher | null>;
  listByMember(memberId: string): Promise<Voucher[]>;
  markUsed(id: string, partnerName: string): Promise<MarkUsedResult>;
  clear(): void;
}

function normalizeVoucher(voucher: Voucher): Voucher {
  return {
    ...voucher,
    expiresAt: voucher.expiresAt ? new Date(voucher.expiresAt) : undefined,
    redeemedAt: voucher.redeemedAt ? new Date(voucher.redeemedAt) : undefined,
    createdAt: new Date(voucher.createdAt),
  };
}

export class InMemoryVoucherRepository implements VoucherRepository {
  private readonly vouchers = new Map<string, Voucher>();

  async create(voucher: Voucher): Promise<Voucher> {
    const normalized = normalizeVoucher(voucher);
    this.vouchers.set(normalized.id, normalized);
    return normalizeVoucher(normalized);
  }

  async getById(id: string): Promise<Voucher | null> {
    const voucher = this.vouchers.get(id);
    return voucher ? normalizeVoucher(voucher) : null;
  }

  async getByCode(code: string): Promise<Voucher | null> {
    const normalizedCode = code.toUpperCase();
    for (const voucher of this.vouchers.values()) {
      if (voucher.code.toUpperCase() === normalizedCode) {
        return normalizeVoucher(voucher);
      }
    }
    return null;
  }

  async listByMember(memberId: string): Promise<Voucher[]> {
    return [...this.vouchers.values()]
      .filter((voucher) => voucher.memberId === memberId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markUsed(id: string, partnerName: string): Promise<MarkUsedResult> {
    const voucher = this.vouchers.get(id);
    if (!voucher) return { ok: false, reason: 'not_found' };
    if (voucher.partnerName.toLowerCase() !== partnerName.toLowerCase()) {
      return { ok: false, reason: 'wrong_partner' };
    }
    if (voucher.status === 'used') return { ok: false, reason: 'already_used' };
    if (voucher.expiresAt && voucher.expiresAt < new Date()) {
      return { ok: false, reason: 'expired' };
    }
    if (voucher.status !== 'active') return { ok: false, reason: 'already_used' };
    voucher.status = 'used';
    voucher.redeemedAt = new Date();
    return { ok: true };
  }

  clear(): void {
    this.vouchers.clear();
  }

  snapshot(): Voucher[] {
    return [...this.vouchers.values()].map(normalizeVoucher);
  }

  restore(vouchers: Voucher[]): void {
    this.vouchers.clear();
    for (const voucher of vouchers) this.vouchers.set(voucher.id, normalizeVoucher(voucher));
  }
}

export class FirestoreVoucherRepository implements VoucherRepository {
  private readonly collection = firebaseAdmin.firestore().collection('vouchers');

  async create(voucher: Voucher): Promise<Voucher> {
    const normalized = normalizeVoucher(voucher);
    await this.collection.doc(normalized.id).set({
      code: normalized.code,
      status: normalized.status,
      partnerName: normalized.partnerName,
      reward: normalized.reward,
      expiresAt: normalized.expiresAt,
      memberId: normalized.memberId,
      perkId: normalized.perkId,
      pointsCost: normalized.pointsCost,
      instructions: normalized.instructions,
      redeemedAt: normalized.redeemedAt,
      createdAt: normalized.createdAt,
      idempotencyKey: normalized.idempotencyKey,
    });
    return normalized;
  }

  async getById(id: string): Promise<Voucher | null> {
    const snapshot = await this.collection.doc(id).get();
    if (!snapshot.exists) return null;
    return normalizeVoucher({ id: snapshot.id, ...snapshot.data() } as Voucher);
  }

  async getByCode(code: string): Promise<Voucher | null> {
    const snapshot = await this.collection
      .where('code', '==', code.toUpperCase())
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return normalizeVoucher({ id: doc.id, ...doc.data() } as Voucher);
  }

  async listByMember(memberId: string): Promise<Voucher[]> {
    const snapshot = await this.collection
      .where('memberId', '==', memberId)
      .get();
    return snapshot.docs
      .map((doc) => normalizeVoucher({ id: doc.id, ...doc.data() } as Voucher))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markUsed(id: string, partnerName: string): Promise<MarkUsedResult> {
    const db = firebaseAdmin.firestore();
    return db.runTransaction(async (tx) => {
      const ref = this.collection.doc(id);
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) return { ok: false, reason: 'not_found' };
      const voucher = normalizeVoucher({ id: snapshot.id, ...snapshot.data() } as Voucher);
      if (voucher.partnerName.toLowerCase() !== partnerName.toLowerCase()) {
        return { ok: false, reason: 'wrong_partner' };
      }
      if (voucher.status === 'used') return { ok: false, reason: 'already_used' };
      if (voucher.expiresAt && voucher.expiresAt < new Date()) {
        return { ok: false, reason: 'expired' };
      }
      if (voucher.status !== 'active') return { ok: false, reason: 'already_used' };
      tx.update(ref, {
        status: 'used',
        isRedeemed: true,
        redeemedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true };
    });
  }

  clear(): void {
    throw new Error('Firestore voucher repository cannot be cleared in application code');
  }
}

export function createVoucherRepository(): VoucherRepository {
  if (env.NODE_ENV === 'test' || env.POINTS_LEDGER_STORAGE === 'memory') {
    return new InMemoryVoucherRepository();
  }
  return new FirestoreVoucherRepository();
}

export const voucherRepository = createVoucherRepository();

export function resetVoucherRepository(): void {
  if (voucherRepository instanceof InMemoryVoucherRepository) {
    voucherRepository.clear();
  }
}
