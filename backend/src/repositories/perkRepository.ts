import { env } from '../config/env.js';
import { firebaseAdmin } from '../lib/firebase.js';

export interface Perk {
  id: string;
  partnerName: string;
  title: string;
  pointsCost: number;
  isActive: boolean;
  stock: number | null;
  availableFrom?: Date;
  availableUntil?: Date;
  validityDays: number;
  instructions: string;
}

export interface PerkRepository {
  listActive(now?: Date): Promise<Perk[]>;
  getById(id: string): Promise<Perk | null>;
  decrementStock(id: string): Promise<boolean>;
  clear(): void;
}

function normalizePerk(perk: Perk): Perk {
  return {
    ...perk,
    availableFrom: perk.availableFrom ? new Date(perk.availableFrom) : undefined,
    availableUntil: perk.availableUntil ? new Date(perk.availableUntil) : undefined,
  };
}

export class InMemoryPerkRepository implements PerkRepository {
  private readonly perks = new Map<string, Perk>();

  constructor(seed = false) {
    if (seed) {
      for (const perk of memorySeedPerks) this.perks.set(perk.id, normalizePerk(perk));
    }
  }

  async listActive(now = new Date()): Promise<Perk[]> {
    return [...this.perks.values()].filter((perk) => {
      if (!perk.isActive) return false;
      if (perk.availableFrom && perk.availableFrom > now) return false;
      if (perk.availableUntil && perk.availableUntil < now) return false;
      if (perk.stock === 0) return false;
      return true;
    });
  }

  async getById(id: string): Promise<Perk | null> {
    const perk = this.perks.get(id);
    return perk ? normalizePerk(perk) : null;
  }

  async decrementStock(id: string): Promise<boolean> {
    const perk = this.perks.get(id);
    if (!perk) return false;
    if (perk.stock === null) return true;
    if (perk.stock <= 0) return false;
    perk.stock -= 1;
    return true;
  }

  clear(): void {
    this.perks.clear();
  }

  snapshot(): Perk[] {
    return [...this.perks.values()].map(normalizePerk);
  }

  restore(perks: Perk[]): void {
    this.perks.clear();
    for (const perk of perks) this.perks.set(perk.id, normalizePerk(perk));
  }

  seed(perks: Perk[]): void {
    for (const perk of perks) this.perks.set(perk.id, normalizePerk(perk));
  }
}

export class FirestorePerkRepository implements PerkRepository {
  private readonly collection = firebaseAdmin.firestore().collection('perks');

  async listActive(now = new Date()): Promise<Perk[]> {
    const snapshot = await this.collection
      .where('isActive', '==', true)
      .get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Perk))
      .filter((perk) => {
        const from = perk.availableFrom ? new Date(perk.availableFrom) : undefined;
        const until = perk.availableUntil ? new Date(perk.availableUntil) : undefined;
        if (from && from > now) return false;
        if (until && until < now) return false;
        if (perk.stock === 0) return false;
        return true;
      });
  }

  async getById(id: string): Promise<Perk | null> {
    const snapshot = await this.collection.doc(id).get();
    if (!snapshot.exists) return null;
    return { id: snapshot.id, ...snapshot.data() } as Perk;
  }

  async decrementStock(id: string): Promise<boolean> {
    const db = firebaseAdmin.firestore();
    return db.runTransaction(async (tx) => {
      const ref = this.collection.doc(id);
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) return false;
      const perk = snapshot.data() as Perk;
      if (perk.stock === null) return true;
      if (perk.stock <= 0) return false;
      tx.update(ref, { stock: perk.stock - 1 });
      return true;
    });
  }

  clear(): void {
    throw new Error('Firestore perk repository cannot be cleared in application code');
  }
}

export const memorySeedPerks: Perk[] = [
  {
    id: 'cold-brew',
    partnerName: 'NexCafe',
    title: 'Free Cold Brew',
    pointsCost: 500,
    isActive: true,
    stock: 10,
    validityDays: 30,
    instructions: 'Present this voucher to a NexCafe partner.',
  },
  {
    id: 'pastry',
    partnerName: 'BeanBrew',
    title: '20% Off Pastry',
    pointsCost: 100,
    isActive: true,
    stock: null,
    validityDays: 14,
    instructions: 'Present this voucher to a BeanBrew partner.',
  },
];

export function createPerkRepository(): PerkRepository {
  if (env.NODE_ENV === 'test' || env.POINTS_LEDGER_STORAGE === 'memory') {
    return new InMemoryPerkRepository(env.NODE_ENV !== 'production');
  }
  return new FirestorePerkRepository();
}

export const perkRepository = createPerkRepository();

export function resetPerkRepository(): void {
  if (perkRepository instanceof InMemoryPerkRepository) {
    perkRepository.clear();
  }
}

export function seedPerks(perks: Perk[]): void {
  if (perkRepository instanceof InMemoryPerkRepository) {
    perkRepository.seed(perks);
  }
}
