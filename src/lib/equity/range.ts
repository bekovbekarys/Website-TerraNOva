/**
 * Range notation parser: "AA", "22+", "TT-77", "AKs", "AQo+", "A2s+",
 * "T9s-65s", "KQ", exact combos like "AhKh", and "random"/"any".
 * Comma- or space-separated lists. Produces a deduplicated list of
 * two-card combos (card ints, hi first).
 */

import { cardFromString, makeCard } from './evaluator';

export type Combo = [number, number];

const RANKS = '23456789TJQKA';

function rankOf(ch: string): number {
  const i = RANKS.indexOf(ch.toUpperCase());
  return i === -1 ? -1 : i + 2;
}

function pairCombos(rank: number, out: Combo[]) {
  for (let a = 0; a < 4; a++) {
    for (let b = a + 1; b < 4; b++) {
      out.push([makeCard(rank, a), makeCard(rank, b)]);
    }
  }
}

function unpairedCombos(hi: number, lo: number, kind: 'suited' | 'offsuit' | 'any', out: Combo[]) {
  for (let a = 0; a < 4; a++) {
    for (let b = 0; b < 4; b++) {
      if (kind === 'suited' && a !== b) continue;
      if (kind === 'offsuit' && a === b) continue;
      out.push([makeCard(hi, a), makeCard(lo, b)]);
    }
  }
}

function allCombos(): Combo[] {
  const out: Combo[] = [];
  for (let a = 0; a < 52; a++) {
    for (let b = a + 1; b < 52; b++) out.push([a, b]);
  }
  return out;
}

export interface RangeParseResult {
  combos: Combo[];
  /** Terms that could not be understood. */
  errors: string[];
}

export function parseRange(text: string): RangeParseResult {
  const errors: string[] = [];
  const out: Combo[] = [];
  const terms = text
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (terms.length === 0) return { combos: [], errors: ['empty range'] };

  for (const term of terms) {
    if (!parseTerm(term, out)) errors.push(term);
  }

  // dedupe
  const seen = new Set<number>();
  const combos: Combo[] = [];
  for (const [a, b] of out) {
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    const key = hi * 52 + lo;
    if (!seen.has(key)) {
      seen.add(key);
      combos.push([hi, lo]);
    }
  }
  return { combos, errors };
}

function parseTerm(term: string, out: Combo[]): boolean {
  const t = term.trim();
  const lower = t.toLowerCase();
  if (lower === 'random' || lower === 'any' || lower === '*') {
    out.push(...allCombos());
    return true;
  }

  // exact combo: AhKh
  if (/^(10|[2-9TJQKAtjqka])[shdcSHDC](10|[2-9TJQKAtjqka])[shdcSHDC]$/.test(t)) {
    const m = /^((?:10|[2-9TJQKAtjqka])[shdcSHDC])((?:10|[2-9TJQKAtjqka])[shdcSHDC])$/.exec(t)!;
    const c1 = cardFromString(m[1]!);
    const c2 = cardFromString(m[2]!);
    if (c1 < 0 || c2 < 0 || c1 === c2) return false;
    out.push([c1, c2]);
    return true;
  }

  // dash range: TT-77 or T9s-65s
  const dash = /^([2-9TJQKAtjqka]{2}[so]?)-([2-9TJQKAtjqka]{2}[so]?)$/.exec(t);
  if (dash) {
    return parseDashRange(dash[1]!, dash[2]!, out);
  }

  // single class with optional +
  const m = /^([2-9TJQKAtjqka])([2-9TJQKAtjqka])([so])?(\+)?$/.exec(t);
  if (!m) return false;
  const r1 = rankOf(m[1]!);
  const r2 = rankOf(m[2]!);
  if (r1 < 0 || r2 < 0) return false;
  const hi = Math.max(r1, r2);
  const lo = Math.min(r1, r2);
  const kind: 'suited' | 'offsuit' | 'any' =
    m[3]?.toLowerCase() === 's' ? 'suited' : m[3]?.toLowerCase() === 'o' ? 'offsuit' : 'any';
  const plus = m[4] === '+';

  if (hi === lo) {
    if (m[3]) return false; // "TTs" is nonsense
    if (plus) {
      for (let r = hi; r <= 14; r++) pairCombos(r, out);
    } else {
      pairCombos(hi, out);
    }
    return true;
  }

  if (!plus) {
    unpairedCombos(hi, lo, kind, out);
    return true;
  }
  // plus semantics: connectors walk both ranks up (T9s+ -> T9,JT,QJ,KQ,AK);
  // otherwise the low card walks up to just below the high card (A2s+ -> A2..AK)
  if (hi - lo === 1) {
    for (let h = hi, l = lo; h <= 14; h++, l++) unpairedCombos(h, l, kind, out);
  } else {
    for (let l = lo; l < hi; l++) unpairedCombos(hi, l, kind, out);
  }
  return true;
}

function parseDashRange(fromTerm: string, toTerm: string, out: Combo[]): boolean {
  const pf = /^([2-9TJQKAtjqka])([2-9TJQKAtjqka])([so])?$/.exec(fromTerm);
  const pt = /^([2-9TJQKAtjqka])([2-9TJQKAtjqka])([so])?$/.exec(toTerm);
  if (!pf || !pt) return false;
  const f1 = rankOf(pf[1]!);
  const f2 = rankOf(pf[2]!);
  const t1 = rankOf(pt[1]!);
  const t2 = rankOf(pt[2]!);
  const fHi = Math.max(f1, f2);
  const fLo = Math.min(f1, f2);
  const tHi = Math.max(t1, t2);
  const tLo = Math.min(t1, t2);
  const kindF = pf[3]?.toLowerCase();
  const kindT = pt[3]?.toLowerCase();
  if (kindF !== kindT) return false;
  const kind: 'suited' | 'offsuit' | 'any' =
    kindF === 's' ? 'suited' : kindF === 'o' ? 'offsuit' : 'any';

  // pairs: TT-77
  if (fHi === fLo && tHi === tLo) {
    if (kindF) return false;
    const top = Math.max(fHi, tHi);
    const bot = Math.min(fHi, tHi);
    for (let r = bot; r <= top; r++) pairCombos(r, out);
    return true;
  }
  // same-gap runs: T9s-65s
  if (fHi - fLo !== tHi - tLo) return false;
  const top = Math.max(fHi, tHi);
  const bot = Math.min(fHi, tHi);
  const gap = fHi - fLo;
  for (let h = bot; h <= top; h++) {
    unpairedCombos(h, h - gap, kind, out);
  }
  return true;
}
