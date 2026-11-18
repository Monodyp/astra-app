import { env } from '../config/env.js';
import { firebaseAdmin } from '../lib/firebase.js';
import { normalizeSrCode } from '../services/members.js';

export type LedgerEntryType = 'attendance' | 'grant' | 'redemption' | 'adjustment';

export interface LedgerEntry {
  id: string;
  memberId: string;
  amount: number;
  reason: string;
  type: LedgerEntryType;
  referenceId: string;
  createdBy: string;
  createdAt: Date;
}

export interface CreateLedgerEntry {
  id: string;
  memberId: string;
  amount: number;
  reason: string;
  type: LedgerEntryType;
  referenceId: string;
  createdBy: string;
  createdAt?: Date;
}

export class DuplicateLedgerEntryError extends Error {
  statusCode = 409;

  constructor() {
    super('Ledger entry already exists');
    this.name = 'DuplicateLedgerEntryError';
  }
}

export interface LedgerRepository {
  create(entry: CreateLedgerEntry): Promise<LedgerEntry>;
  listByMember(memberId: string): Promise<LedgerEntry[]>;
  getBalance(memberId: string): Promise<number>;
}

function normalizeEntry(entry: CreateLedgerEntry): LedgerEntry {
  return {
    ...entry,
    memberId: normalizeSrCode(entry.memberId),
    createdAt: entry.createdAt ?? new Date(),
  };
}

export class InMemoryLedgerRepository implements LedgerRepository {
  private readonly entries = new Map<string, LedgerEntry>();

  async create(input: CreateLedgerEntry): Promise<LedgerEntry> {
    const entry = normalizeEntry(input);
    if (this.entries.has(entry.id)) throw new DuplicateLedgerEntryError();
    this.entries.set(entry.id, entry);
    return entry;
  }

  async listByMember(memberId: string): Promise<LedgerEntry[]> {
    const normalized = normalizeSrCode(memberId);
    return [...this.entries.values()]
      .filter((entry) => entry.memberId === normalized)
      .sort((a, b) => {
        const byDate = b.createdAt.getTime() - a.createdAt.getTime();
        return byDate || b.id.localeCompare(a.id);
      });
  }

  async getBalance(memberId: string): Promise<number> {
    const entries = await this.listByMember(memberId);
    return entries.reduce((balance, entry) => balance + entry.amount, 0);
  }

  clear(): void {
    this.entries.clear();
  }

  snapshot(): LedgerEntry[] {
    return [...this.entries.values()].map((entry) => ({
      ...entry,
      createdAt: new Date(entry.createdAt),
    }));
  }

  restore(entries: LedgerEntry[]): void {
    this.entries.clear();
    for (const entry of entries) {
      this.entries.set(entry.id, {
        ...entry,
        createdAt: new Date(entry.createdAt),
      });
    }
  }
}

export class FirestoreLedgerRepository implements LedgerRepository {
  private readonly collection = firebaseAdmin.firestore().collection('pointsLedger');

  async create(input: CreateLedgerEntry): Promise<LedgerEntry> {
    const entry = normalizeEntry(input);
    const ref = this.collection.doc(entry.id);
    try {
      await ref.create({
        memberId: entry.memberId,
        amount: entry.amount,
        reason: entry.reason,
        type: entry.type,
        referenceId: entry.referenceId,
        createdBy: entry.createdBy,
        createdAt: entry.createdAt,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 6) {
        throw new DuplicateLedgerEntryError();
      }
      throw error;
    }
    return entry;
  }

  async listByMember(memberId: string): Promise<LedgerEntry[]> {
    const snapshot = await this.collection
      .where('memberId', '==', normalizeSrCode(memberId))
      .get();
    return snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.() ?? new Date(data.createdAt);
        return {
          id: doc.id,
          memberId: data.memberId,
          amount: data.amount,
          reason: data.reason,
          type: data.type,
          referenceId: data.referenceId,
          createdBy: data.createdBy,
          createdAt,
        } satisfies LedgerEntry;
      })
      .sort((a, b) => {
        const byDate = b.createdAt.getTime() - a.createdAt.getTime();
        return byDate || b.id.localeCompare(a.id);
      });
  }

  async getBalance(memberId: string): Promise<number> {
    const entries = await this.listByMember(memberId);
    return entries.reduce((balance, entry) => balance + entry.amount, 0);
  }
}

export function createLedgerRepository(): LedgerRepository {
  if (env.NODE_ENV === 'test' || env.POINTS_LEDGER_STORAGE === 'memory') {
    return new InMemoryLedgerRepository();
  }
  return new FirestoreLedgerRepository();
}

export const ledgerRepository = createLedgerRepository();

export function resetLedgerRepository(): void {
  if (ledgerRepository instanceof InMemoryLedgerRepository) {
    ledgerRepository.clear();
  }
}
