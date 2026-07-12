/**
 * App-wide data store: loads sessions and hands from IndexedDB once,
 * exposes write-through mutations. Small enough that context + state
 * beats any state library.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { db, newId, type HandRecord, type Session } from './lib/db';
import type { ParsedHand } from './lib/parser';
import type { ExportFile } from './lib/export';

export interface Store {
  ready: boolean;
  loadError: string | undefined;
  sessions: Session[];
  hands: HandRecord[];
  activeSession: Session | undefined;
  startSession(data: { stakes: string; location: string; buyIn: number; notes?: string }): Promise<Session>;
  updateSession(session: Session): Promise<void>;
  endSession(id: string, cashOut: number, endedAt?: number): Promise<void>;
  deleteSession(id: string): Promise<void>;
  addHand(parsed: ParsedHand, sessionId: string | undefined): Promise<HandRecord>;
  deleteHand(id: string): Promise<void>;
  importData(data: ExportFile, mode: 'merge' | 'replace'): Promise<void>;
  wipe(): Promise<void>;
}

const StoreContext = createContext<Store | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [hands, setHands] = useState<HandRecord[]>([]);

  const refresh = useCallback(async () => {
    const [s, h] = await Promise.all([db.allSessions(), db.allHands()]);
    setSessions(s);
    setHands(h);
  }, []);

  useEffect(() => {
    refresh()
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Could not open local storage.');
      })
      .finally(() => setReady(true));
  }, [refresh]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.endedAt === undefined),
    [sessions],
  );

  const store = useMemo<Store>(
    () => ({
      ready,
      loadError,
      sessions,
      hands,
      activeSession,
      async startSession(data) {
        const session: Session = {
          id: newId(),
          startedAt: Date.now(),
          stakes: data.stakes,
          location: data.location,
          buyIn: data.buyIn,
          ...(data.notes ? { notes: data.notes } : {}),
        };
        await db.putSession(session);
        await refresh();
        return session;
      },
      async updateSession(session) {
        await db.putSession(session);
        await refresh();
      },
      async endSession(id, cashOut, endedAt) {
        const session = await db.getSession(id);
        if (!session) throw new Error('Session not found.');
        session.cashOut = cashOut;
        session.endedAt = endedAt ?? Date.now();
        await db.putSession(session);
        await refresh();
      },
      async deleteSession(id) {
        // unlink hands rather than deleting them — logged hands stay yours
        const linked = await db.handsForSession(id);
        for (const hand of linked) {
          delete hand.sessionId;
          await db.putHand(hand);
        }
        await db.deleteSession(id);
        await refresh();
      },
      async addHand(parsed, sessionId) {
        const record: HandRecord = {
          id: newId(),
          loggedAt: Date.now(),
          parsed,
          ...(sessionId ? { sessionId } : {}),
        };
        await db.putHand(record);
        await refresh();
        return record;
      },
      async deleteHand(id) {
        await db.deleteHand(id);
        await refresh();
      },
      async importData(data, mode) {
        if (mode === 'replace') await db.wipeAll();
        for (const s of data.sessions) await db.putSession(s);
        for (const h of data.hands) await db.putHand(h);
        await refresh();
      },
      async wipe() {
        await db.wipeAll();
        await refresh();
      },
    }),
    [ready, loadError, sessions, hands, activeSession, refresh],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore outside StoreProvider');
  return store;
}
