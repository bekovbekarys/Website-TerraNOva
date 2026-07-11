/**
 * Web Worker for the Monte Carlo equity engine so long simulations
 * never block the UI thread.
 */

import { equityVsRange, type EquityResult } from './montecarlo';
import { parseRange } from './range';
import { cardFromString } from './evaluator';

export interface EquityRequest {
  id: number;
  heroCards: [string, string]; // "Ah", "Ks"
  villain: string; // range notation
  board: string[]; // ["Jh","7d","2c"]
  iterations: number;
}

export type EquityResponse =
  | { id: number; type: 'progress'; fraction: number }
  | { id: number; type: 'result'; result: EquityResult }
  | { id: number; type: 'error'; message: string };

self.onmessage = (e: MessageEvent<EquityRequest>) => {
  const { id, heroCards, villain, board, iterations } = e.data;
  const post = (msg: EquityResponse) => (self as unknown as Worker).postMessage(msg);
  try {
    const hero: [number, number] = [cardFromString(heroCards[0]), cardFromString(heroCards[1])];
    if (hero[0] < 0 || hero[1] < 0) throw new Error('Invalid hero cards.');
    if (hero[0] === hero[1]) throw new Error('Hero cards are the same card.');
    const range = parseRange(villain);
    if (range.errors.length > 0) {
      throw new Error(`Couldn't read range term(s): ${range.errors.join(', ')}`);
    }
    const boardCards = board.map((b) => {
      const c = cardFromString(b);
      if (c < 0) throw new Error(`Invalid board card: ${b}`);
      return c;
    });
    const result = equityVsRange(hero, range.combos, boardCards, {
      iterations,
      seed: (Date.now() ^ (id * 2654435761)) >>> 0,
      onProgress: (fraction) => post({ id, type: 'progress', fraction }),
      progressEvery: 10_000,
    });
    post({ id, type: 'result', result });
  } catch (err) {
    post({ id, type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
