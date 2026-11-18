import { createSeedRecords, type DemoRecords } from './fixtures.js';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const RECORDS_KEY = 'astra-demo:records';
export const SESSION_KEY = 'astra-demo:session';

interface StoredSession {
  memberId: string;
}

export function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

export function createTabStorage(): KeyValueStorage {
  try {
    const storage = window.sessionStorage;
    const probe = `${RECORDS_KEY}:probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return createMemoryStorage();
  }
}

export class DemoStore {
  private readonly storage: KeyValueStorage;

  constructor(storage: KeyValueStorage) {
    this.storage = storage;
  }

  read(): DemoRecords {
    const raw = this.storage.getItem(RECORDS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as DemoRecords;
        if (parsed.version === 1) {
          return parsed;
        }
      } catch {}
    }
    const seed = createSeedRecords();
    this.write(seed);
    return seed;
  }

  write(records: DemoRecords): void {
    this.storage.setItem(RECORDS_KEY, JSON.stringify(records));
  }

  update<T>(change: (records: DemoRecords) => T): T {
    const records = this.read();
    const result = change(records);
    this.write(records);
    return result;
  }

  readSessionMemberId(): string | null {
    const raw = this.storage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as StoredSession;
      return typeof parsed.memberId === 'string' ? parsed.memberId : null;
    } catch {
      return null;
    }
  }

  writeSession(memberId: string): void {
    const session: StoredSession = { memberId };
    this.storage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  clearSession(): void {
    this.storage.removeItem(SESSION_KEY);
  }

  reset(): void {
    this.storage.removeItem(RECORDS_KEY);
    this.clearSession();
  }
}
