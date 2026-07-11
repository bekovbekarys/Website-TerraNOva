import type { Card, HoleCards, Rank, Suit } from './types';

export const RANK_CHARS = '23456789TJQKA';
export const SUIT_CHARS = 'shdc';

export function rankFromChar(ch: string): Rank | undefined {
  const i = RANK_CHARS.indexOf(ch.toUpperCase());
  return i === -1 ? undefined : ((i + 2) as Rank);
}

export function rankToChar(rank: Rank): string {
  return RANK_CHARS[rank - 2] ?? '?';
}

export function suitFromChar(ch: string): Suit | undefined {
  const lower = ch.toLowerCase();
  return SUIT_CHARS.includes(lower) ? (lower as Suit) : undefined;
}

export function cardToString(card: Card): string {
  return rankToChar(card.rank) + card.suit;
}

export const SUIT_GLYPHS: Record<Suit, string> = {
  s: '♠', // ♠
  h: '♥', // ♥
  d: '♦', // ♦
  c: '♣', // ♣
};

/** "Ah" -> {rank:14, suit:'h'}. Accepts "10h" for "Th" and uppercase suits. */
export function parseCard(text: string): Card | undefined {
  const m = /^(10|[2-9TJQKAtjqka])([shdcSHDC])$/.exec(text.trim());
  if (!m) return undefined;
  const rank = m[1] === '10' ? (10 as Rank) : rankFromChar(m[1]!);
  const suit = suitFromChar(m[2]!);
  if (rank === undefined || suit === undefined) return undefined;
  return { rank, suit };
}

/**
 * Parse a run of concatenated exact cards: "Jh7d2c", "AhKs", "Qd".
 * Returns undefined unless the entire string is consumed.
 */
export function parseCardRun(text: string): Card[] | undefined {
  const cards: Card[] = [];
  const re = /(10|[2-9TJQKAtjqka])([shdcSHDC])/gy;
  let idx = 0;
  while (idx < text.length) {
    re.lastIndex = idx;
    const m = re.exec(text);
    if (!m || m.index !== idx) return undefined;
    const card = parseCard(m[0]);
    if (!card) return undefined;
    cards.push(card);
    idx = re.lastIndex;
  }
  return cards.length > 0 ? cards : undefined;
}

/**
 * Parse hole-card notation, exact or abstract:
 * "AhKs" -> exact; "AKs" -> abstract suited; "AKo" -> abstract offsuit;
 * "AK" -> abstract any; "QQ" -> pair.
 */
export function parseHoleCards(text: string): HoleCards | undefined {
  const t = text.trim();
  const exact = parseCardRun(t);
  if (exact && exact.length === 2) {
    if (cardKey(exact[0]!) === cardKey(exact[1]!)) return undefined; // duplicate card
    return { kind: 'exact', cards: [exact[0]!, exact[1]!] };
  }
  const m = /^([2-9TJQKAtjqka])([2-9TJQKAtjqka])([so])?$/.exec(t);
  if (!m) return undefined;
  const r1 = rankFromChar(m[1]!);
  const r2 = rankFromChar(m[2]!);
  if (r1 === undefined || r2 === undefined) return undefined;
  const hi = Math.max(r1, r2) as Rank;
  const lo = Math.min(r1, r2) as Rank;
  const mod = m[3]?.toLowerCase();
  if (hi === lo && mod) return undefined; // "AAs" is nonsense
  return {
    kind: 'abstract',
    ranks: [hi, lo],
    suited: mod === 's' ? 'suited' : mod === 'o' ? 'offsuit' : 'any',
  };
}

export function cardKey(card: Card): string {
  return cardToString(card);
}

export function holeCardsToString(hc: HoleCards): string {
  if (hc.kind === 'exact') return hc.cards.map(cardToString).join('');
  const [hi, lo] = hc.ranks;
  const base = rankToChar(hi) + rankToChar(lo);
  if (hi === lo) return base;
  return hc.suited === 'suited' ? base + 's' : hc.suited === 'offsuit' ? base + 'o' : base;
}

/** Every exact card mentioned in a HoleCards value (empty for abstract). */
export function exactCardsOf(hc: HoleCards | undefined): Card[] {
  return hc && hc.kind === 'exact' ? [...hc.cards] : [];
}
