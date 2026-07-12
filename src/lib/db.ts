/**
 * Minimal promise-based IndexedDB wrapper. Two stores: sessions and hands.
 * No external dependencies — the schema is simple enough that a thin
 * hand-rolled layer is clearer than a library.
 */

import type { ParsedHand } from './parser';

export interface Session {
  id: string;
  startedAt: number; // epoch ms
  endedAt?: number;
  stakes: string; // display label, e.g. "1/2"
  location: string;
  buyIn: number;
  cashOut?: number;
  notes?: string;
}

export interface HandRecord {
  id: string;
  sessionId?: string;
  loggedAt: number;
  parsed: ParsedHand;
}

const DB_NAME = 'felt-notes';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | undefined;

export function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('sessions')) {
          const s = db.createObjectStore('sessions', { keyPath: 'id' });
          s.createIndex('startedAt', 'startedAt');
        }
        if (!db.objectStoreNames.contains('hands')) {
          const h = db.createObjectStore('hands', { keyPath: 'id' });
          h.createIndex('sessionId', 'sessionId');
          h.createIndex('loggedAt', 'loggedAt');
        }
      };
      req.onsuccess = () => {
        req.result.onversionchange = () => req.result.close();
        resolve(req.result);
      };
      req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
    });
  }
  return dbPromise;
}

type StoreName = 'sessions' | 'hands';

async function tx<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = run(t.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error(`IndexedDB ${mode} on ${store} failed`));
  });
}

export const db = {
  async putSession(session: Session): Promise<void> {
    await tx('sessions', 'readwrite', (s) => s.put(session));
  },
  async getSession(id: string): Promise<Session | undefined> {
    return tx<Session | undefined>('sessions', 'readonly', (s) => s.get(id) as IDBRequest<Session | undefined>);
  },
  async allSessions(): Promise<Session[]> {
    const list = await tx<Session[]>('sessions', 'readonly', (s) => s.getAll() as IDBRequest<Session[]>);
    return list.sort((a, b) => b.startedAt - a.startedAt);
  },
  async deleteSession(id: string): Promise<void> {
    await tx('sessions', 'readwrite', (s) => s.delete(id));
  },

  async putHand(hand: HandRecord): Promise<void> {
    await tx('hands', 'readwrite', (s) => s.put(hand));
  },
  async getHand(id: string): Promise<HandRecord | undefined> {
    return tx<HandRecord | undefined>('hands', 'readonly', (s) => s.get(id) as IDBRequest<HandRecord | undefined>);
  },
  async allHands(): Promise<HandRecord[]> {
    const list = await tx<HandRecord[]>('hands', 'readonly', (s) => s.getAll() as IDBRequest<HandRecord[]>);
    return list.sort((a, b) => b.loggedAt - a.loggedAt);
  },
  async handsForSession(sessionId: string): Promise<HandRecord[]> {
    const db_ = await openDB();
    return new Promise((resolve, reject) => {
      const t = db_.transaction('hands', 'readonly');
      const idx = t.objectStore('hands').index('sessionId');
      const req = idx.getAll(sessionId) as IDBRequest<HandRecord[]>;
      req.onsuccess = () => resolve(req.result.sort((a, b) => a.loggedAt - b.loggedAt));
      req.onerror = () => reject(req.error ?? new Error('IndexedDB query failed'));
    });
  },
  async deleteHand(id: string): Promise<void> {
    await tx('hands', 'readwrite', (s) => s.delete(id));
  },

  async wipeAll(): Promise<void> {
    await tx('sessions', 'readwrite', (s) => s.clear());
    await tx('hands', 'readwrite', (s) => s.clear());
  },
};

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}
