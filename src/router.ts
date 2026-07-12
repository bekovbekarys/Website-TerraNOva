/**
 * Tiny hash router. Routes: #/ (ledger), #/log, #/hands, #/stats,
 * #/equity, #/data. Query params after '?' inside the hash, e.g.
 * #/equity?hero=AhKs&board=Jh7d2c.
 */

import { useSyncExternalStore } from 'react';

export type RouteId = 'ledger' | 'log' | 'hands' | 'stats' | 'equity' | 'data';

export interface Route {
  id: RouteId;
  params: URLSearchParams;
}

const ROUTE_PATHS: Record<string, RouteId> = {
  '': 'ledger',
  '/': 'ledger',
  '/log': 'log',
  '/hands': 'hands',
  '/stats': 'stats',
  '/equity': 'equity',
  '/data': 'data',
};

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const qIndex = raw.indexOf('?');
  const path = qIndex === -1 ? raw : raw.slice(0, qIndex);
  const query = qIndex === -1 ? '' : raw.slice(qIndex + 1);
  const id = ROUTE_PATHS[path] ?? 'ledger';
  return { id, params: new URLSearchParams(query) };
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

function getSnapshot(): string {
  return window.location.hash;
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getSnapshot);
  return parseHash(hash);
}

export function navigate(path: string): void {
  window.location.hash = path;
}

export function hrefFor(id: RouteId): string {
  return id === 'ledger' ? '#/' : `#/${id}`;
}
