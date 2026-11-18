import { randomUUID, createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { firebaseAdmin } from '../lib/firebase.js';
import { normalizeSrCode } from '../services/members.js';
import {
  InMemoryLedgerRepository,
  ledgerRepository,
  type CreateLedgerEntry,
  type LedgerEntry,
} from './ledgerRepository.js';
import {
  InMemoryPerkRepository,
  perkRepository,
  type Perk,
} from './perkRepository.js';
import {
  InMemoryVoucherRepository,
  voucherRepository,
  type MarkUsedResult,
  type Voucher,
} from './voucherRepository.js';

export interface RedemptionsIdempotencyRecord {
  memberId: string;
  perkId: string;
  voucherId: string;
  idempotencyKey: string;
  createdAt: Date;
}

export interface RedemptionLock {
  version: number;
}

export interface RedemptionTransaction {
  perks: {
    getById(id: string): Promise<Perk | null>;
    decrementStock(id: string): Promise<boolean>;
  };
  vouchers: {
    create(voucher: Voucher): Promise<Voucher>;
    getById(id: string): Promise<Voucher | null>;
    getByCode(code: string): Promise<Voucher | null>;
    listByMember(memberId: string): Promise<Voucher[]>;
    markUsed(id: string, partnerName: string): Promise<MarkUsedResult>;
  };
  ledger: {
    listByMember(memberId: string): Promise<LedgerEntry[]>;
    create(entry: CreateLedgerEntry): Promise<LedgerEntry>;
  };
  lock: {
    get(memberId: string): Promise<RedemptionLock | null>;
    set(memberId: string, lock: RedemptionLock): Promise<void>;
  };
  idempotency: {
    get(memberId: string, key: string): Promise<RedemptionsIdempotencyRecord | null>;
    set(memberId: string, key: string, record: RedemptionsIdempotencyRecord): Promise<void>;
  };
}

export interface RedemptionUnitOfWork {
  runInTransaction<T>(work: (tx: RedemptionTransaction) => Promise<T>): Promise<T>;
  injectNextFailure(error: Error): void;
  reset(): void;
}

export function redemptionIdempotencyId(memberId: string, idempotencyKey: string): string {
  const normalized = normalizeSrCode(memberId);
  return `redemption_${normalized}_${idempotencyKey}`;
}

export function redemptionLockId(memberId: string): string {
  return `redemptionLock_${normalizeSrCode(memberId)}`;
}

class InMemoryRedemptionUnitOfWork implements RedemptionUnitOfWork {
  private tail: Promise<void> = Promise.resolve();
  private readonly locks = new Map<string, RedemptionLock>();
  private readonly idempotency = new Map<string, RedemptionsIdempotencyRecord>();
  private injectedFailure: Error | null = null;

  injectNextFailure(error: Error): void {
    this.injectedFailure = error;
  }

  reset(): void {
    this.injectedFailure = null;
    this.locks.clear();
    this.idempotency.clear();
  }

  async runInTransaction<T>(work: (tx: RedemptionTransaction) => Promise<T>): Promise<T> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;

    const perkStore = perkRepository instanceof InMemoryPerkRepository ? perkRepository : null;
    const voucherStore = voucherRepository instanceof InMemoryVoucherRepository ? voucherRepository : null;
    const ledgerStore = ledgerRepository instanceof InMemoryLedgerRepository ? ledgerRepository : null;
    if (!perkStore || !voucherStore || !ledgerStore) {
      release();
      throw new Error('In-memory unit of work requires memory repositories');
    }

    const snapshots = {
      perks: perkStore.snapshot(),
      vouchers: voucherStore.snapshot(),
      ledger: ledgerStore.snapshot(),
      locks: new Map(this.locks),
      idempotency: new Map(this.idempotency),
    };

    const tx: RedemptionTransaction = {
      perks: {
        getById: (id) => perkStore.getById(id),
        decrementStock: (id) => perkStore.decrementStock(id),
      },
      vouchers: {
        create: (voucher) => voucherStore.create(voucher),
        getById: (id) => voucherStore.getById(id),
        getByCode: (code) => voucherStore.getByCode(code),
        listByMember: (memberId) => voucherStore.listByMember(normalizeSrCode(memberId)),
        markUsed: (id, partnerName) => voucherStore.markUsed(id, partnerName),
      },
      ledger: {
        listByMember: (memberId) => ledgerStore.listByMember(normalizeSrCode(memberId)),
        create: (entry) => ledgerStore.create(entry),
      },
      lock: {
        get: async (memberId) => this.locks.get(redemptionLockId(memberId)) ?? null,
        set: async (memberId, lock) => {
          this.locks.set(redemptionLockId(memberId), { ...lock });
        },
      },
      idempotency: {
        get: async (memberId, key) => {
          const record = this.idempotency.get(redemptionIdempotencyId(memberId, key));
          return record ? { ...record } : null;
        },
        set: async (memberId, key, record) => {
          this.idempotency.set(redemptionIdempotencyId(memberId, key), { ...record });
        },
      },
    };

    try {
      const result = await work(tx);
      if (this.injectedFailure) {
        const failure = this.injectedFailure;
        this.injectedFailure = null;
        throw failure;
      }
      return result;
    } catch (error) {
      perkStore.restore(snapshots.perks);
      voucherStore.restore(snapshots.vouchers);
      ledgerStore.restore(snapshots.ledger);
      this.locks.clear();
      for (const [id, lock] of snapshots.locks) this.locks.set(id, lock);
      this.idempotency.clear();
      for (const [id, record] of snapshots.idempotency) this.idempotency.set(id, record);
      throw error;
    } finally {
      release();
    }
  }
}

class FirestoreRedemptionUnitOfWork implements RedemptionUnitOfWork {
  private injectedFailure: Error | null = null;

  injectNextFailure(error: Error): void {
    this.injectedFailure = error;
  }

  reset(): void {
    this.injectedFailure = null;
  }

  async runInTransaction<T>(work: (tx: RedemptionTransaction) => Promise<T>): Promise<T> {
    const db = firebaseAdmin.firestore();
    const result = await db.runTransaction(async (firestoreTx) => {
      const tx: RedemptionTransaction = {
        perks: {
          getById: async (id) => {
            const ref = db.collection('perks').doc(id);
            const snapshot = await firestoreTx.get(ref);
            if (!snapshot.exists) return null;
            return { id: snapshot.id, ...snapshot.data() } as Perk;
          },
          decrementStock: async (id) => {
            const ref = db.collection('perks').doc(id);
            const snapshot = await firestoreTx.get(ref);
            if (!snapshot.exists) return false;
            const perk = snapshot.data() as Perk;
            if (perk.stock === null) return true;
            if (perk.stock <= 0) return false;
            firestoreTx.update(ref, { stock: perk.stock - 1 });
            return true;
          },
        },
        vouchers: {
          create: async (voucher) => {
            const ref = db.collection('vouchers').doc(voucher.id);
            firestoreTx.create(ref, {
              code: voucher.code,
              status: voucher.status,
              partnerName: voucher.partnerName,
              reward: voucher.reward,
              expiresAt: voucher.expiresAt,
              memberId: voucher.memberId,
              perkId: voucher.perkId,
              pointsCost: voucher.pointsCost,
              instructions: voucher.instructions,
              redeemedAt: voucher.redeemedAt,
              createdAt: voucher.createdAt,
              idempotencyKey: voucher.idempotencyKey,
            });
            return voucher;
          },
          getById: async (id) => {
            const snapshot = await firestoreTx.get(db.collection('vouchers').doc(id));
            if (!snapshot.exists) return null;
            return { id: snapshot.id, ...snapshot.data() } as Voucher;
          },
          getByCode: async (code) => {
            const snapshot = await firestoreTx.get(
              db.collection('vouchers').where('code', '==', code.toUpperCase()).limit(1)
            );
            if (snapshot.empty) return null;
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as Voucher;
          },
          listByMember: async (memberId) => {
            const snapshot = await firestoreTx.get(
              db.collection('vouchers').where('memberId', '==', normalizeSrCode(memberId))
            );
            return snapshot.docs
              .map((doc) => ({ id: doc.id, ...doc.data() } as Voucher))
              .sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
          },
          markUsed: async (id, partnerName) => {
            const ref = db.collection('vouchers').doc(id);
            const snapshot = await firestoreTx.get(ref);
            if (!snapshot.exists) return { ok: false, reason: 'not_found' };
            const voucher = { id: snapshot.id, ...snapshot.data() } as Voucher;
            if (voucher.partnerName.toLowerCase() !== partnerName.toLowerCase()) {
              return { ok: false, reason: 'wrong_partner' };
            }
            if (voucher.status === 'used') return { ok: false, reason: 'already_used' };
            if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
              return { ok: false, reason: 'expired' };
            }
            if (voucher.status !== 'active') return { ok: false, reason: 'already_used' };
            firestoreTx.update(ref, { status: 'used', redeemedAt: new Date() });
            return { ok: true };
          },
        },
        ledger: {
          listByMember: async (memberId) => {
            const snapshot = await firestoreTx.get(
              db.collection('pointsLedger').where('memberId', '==', normalizeSrCode(memberId))
            );
            return snapshot.docs.map((doc) => ({
              id: doc.id,
              memberId: doc.data().memberId,
              amount: doc.data().amount,
              reason: doc.data().reason,
              type: doc.data().type,
              referenceId: doc.data().referenceId,
              createdBy: doc.data().createdBy,
              createdAt: doc.data().createdAt?.toDate?.() ?? new Date(doc.data().createdAt),
            }));
          },
          create: async (entry) => {
            const normalizedMemberId = normalizeSrCode(entry.memberId);
            const id = entry.id;
            const ref = db.collection('pointsLedger').doc(id);
            firestoreTx.create(ref, {
              memberId: normalizedMemberId,
              amount: entry.amount,
              reason: entry.reason,
              type: entry.type,
              referenceId: entry.referenceId,
              createdBy: entry.createdBy,
              createdAt: entry.createdAt ?? new Date(),
            });
            return { ...entry, memberId: normalizedMemberId, createdAt: entry.createdAt ?? new Date() };
          },
        },
        lock: {
          get: async (memberId) => {
            const snapshot = await firestoreTx.get(
              db.collection('redemptionLocks').doc(redemptionLockId(memberId))
            );
            if (!snapshot.exists) return null;
            return { version: snapshot.data()?.version as number };
          },
          set: async (memberId, lock) => {
            firestoreTx.set(
              db.collection('redemptionLocks').doc(redemptionLockId(memberId)),
              { version: lock.version }
            );
          },
        },
        idempotency: {
          get: async (memberId, key) => {
            const snapshot = await firestoreTx.get(
              db.collection('redemptionIdempotency').doc(redemptionIdempotencyId(memberId, key))
            );
            if (!snapshot.exists) return null;
            const data = snapshot.data();
            return {
              memberId: data?.memberId,
              perkId: data?.perkId,
              voucherId: data?.voucherId,
              idempotencyKey: data?.idempotencyKey,
              createdAt: data?.createdAt?.toDate?.() ?? new Date(data?.createdAt),
            };
          },
          set: async (memberId, key, record) => {
            firestoreTx.set(
              db.collection('redemptionIdempotency').doc(redemptionIdempotencyId(memberId, key)),
              record
            );
          },
        },
      };
      return work(tx);
    });

    if (this.injectedFailure) {
      const failure = this.injectedFailure;
      this.injectedFailure = null;
      throw failure;
    }
    return result;
  }
}

export function createRedemptionUnitOfWork(): RedemptionUnitOfWork {
  if (env.NODE_ENV === 'test' || env.POINTS_LEDGER_STORAGE === 'memory') {
    return new InMemoryRedemptionUnitOfWork();
  }
  return new FirestoreRedemptionUnitOfWork();
}

export const redemptionUnitOfWork = createRedemptionUnitOfWork();

export function injectRedemptionFailure(error: Error): void {
  redemptionUnitOfWork.injectNextFailure(error);
}

export function resetRedemptionUnitOfWork(): void {
  redemptionUnitOfWork.reset();
}
