/**
 * Monte Carlo all-in equity, hero hand vs villain hand-or-range.
 * Deterministic for a given seed (mulberry32 PRNG).
 */

import { evaluate7 } from './evaluator';
import type { Combo } from './range';

export interface EquityResult {
  win: number;
  tie: number;
  lose: number;
  /** Equity percentage 0..100 (ties count half). */
  equity: number;
  iterations: number;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface EquityOptions {
  iterations?: number;
  seed?: number;
  /** Called every `progressEvery` iterations with fraction complete. */
  onProgress?: (fraction: number) => void;
  progressEvery?: number;
}

/**
 * hero: two card ints. villainRange: combos (pre-parsed). board: 0-5 card ints.
 * Throws on card conflicts between hero and board, or an empty live range.
 */
export function equityVsRange(
  hero: Combo,
  villainRange: Combo[],
  board: number[],
  options: EquityOptions = {},
): EquityResult {
  const iterations = options.iterations ?? 100_000;
  const rand = mulberry32(options.seed ?? 0x5eed);
  const progressEvery = options.progressEvery ?? 20_000;

  const used = new Set<number>([hero[0], hero[1], ...board]);
  if (used.size !== 2 + board.length) {
    throw new Error('Duplicate cards between hero hand and board.');
  }
  const live = villainRange.filter(
    ([a, b]) => !used.has(a) && !used.has(b),
  );
  if (live.length === 0) {
    throw new Error('No villain combos remain after removing hero/board cards.');
  }

  // deck excluding hero + board (villain combo removed per-iteration)
  const baseDeck: number[] = [];
  for (let c = 0; c < 52; c++) {
    if (!used.has(c)) baseDeck.push(c);
  }

  const need = 5 - board.length;
  const heroHand = new Int32Array(7);
  const villHand = new Int32Array(7);
  heroHand[0] = hero[0];
  heroHand[1] = hero[1];
  for (let i = 0; i < board.length; i++) {
    heroHand[2 + i] = board[i]!;
    villHand[2 + i] = board[i]!;
  }

  let win = 0;
  let tie = 0;
  let lose = 0;
  const deck = baseDeck.slice();

  for (let it = 0; it < iterations; it++) {
    const combo = live[Math.floor(rand() * live.length)]!;
    villHand[0] = combo[0];
    villHand[1] = combo[1];

    // partial Fisher–Yates over the deck, skipping villain's cards
    let filled = 0;
    let cursor = deck.length;
    while (filled < need) {
      const j = Math.floor(rand() * cursor);
      const card = deck[j]!;
      // swap to the end so it can't be drawn again this iteration
      deck[j] = deck[cursor - 1]!;
      deck[cursor - 1] = card;
      cursor -= 1;
      if (card === combo[0] || card === combo[1]) continue;
      heroHand[2 + board.length + filled] = card;
      villHand[2 + board.length + filled] = card;
      filled += 1;
    }

    const hs = evaluate7(heroHand);
    const vs = evaluate7(villHand);
    if (hs > vs) win += 1;
    else if (hs < vs) lose += 1;
    else tie += 1;

    if (options.onProgress && (it + 1) % progressEvery === 0) {
      options.onProgress((it + 1) / iterations);
    }
  }

  return {
    win,
    tie,
    lose,
    equity: ((win + tie / 2) / iterations) * 100,
    iterations,
  };
}
