/**
 * 7-card poker hand evaluator.
 *
 * Cards are integers 0..51: (rank - 2) * 4 + suit, with suit order s,h,d,c.
 * evaluate7 returns a number where higher is better; equal numbers tie.
 * Score layout: category * 15^5 + five base-15 tiebreak digits (ranks 2..14).
 */

export const SUITS = ['s', 'h', 'd', 'c'] as const;

export function makeCard(rank: number, suit: number): number {
  return (rank - 2) * 4 + suit;
}

export function cardRank(card: number): number {
  return (card >> 2) + 2;
}

export function cardSuit(card: number): number {
  return card & 3;
}

/** "Ah" -> card int, or -1 if invalid. */
export function cardFromString(text: string): number {
  const t = text.trim();
  const m = /^(10|[2-9TJQKAtjqka])([shdcSHDC])$/.exec(t);
  if (!m) return -1;
  const rankStr = m[1]!.toUpperCase();
  const rank = rankStr === '10' ? 10 : '23456789TJQKA'.indexOf(rankStr) + 2;
  const suit = 'shdc'.indexOf(m[2]!.toLowerCase());
  if (rank < 2 || suit < 0) return -1;
  return makeCard(rank, suit);
}

export function cardToStr(card: number): string {
  return '23456789TJQKA'[cardRank(card) - 2]! + SUITS[cardSuit(card)]!;
}

const B15_4 = 15 ** 4;
const B15_5 = 15 ** 5;

export const CATEGORY_NAMES = [
  'High card',
  'Pair',
  'Two pair',
  'Three of a kind',
  'Straight',
  'Flush',
  'Full house',
  'Four of a kind',
  'Straight flush',
] as const;

export function scoreCategory(score: number): number {
  return Math.floor(score / B15_5);
}

/** Highest straight top rank in a rank bitmask (bit r set for rank r), or 0. */
function straightTop(mask: number): number {
  // wheel: A,2,3,4,5
  const wheel = (1 << 14) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5);
  for (let top = 14; top >= 6; top--) {
    const need = 0b11111 << (top - 4);
    if ((mask & need) === need) return top;
  }
  if ((mask & wheel) === wheel) return 5;
  return 0;
}

function pack(cat: number, d1: number, d2 = 0, d3 = 0, d4 = 0, d5 = 0): number {
  return cat * B15_5 + d1 * B15_4 + d2 * 15 ** 3 + d3 * 15 ** 2 + d4 * 15 + d5;
}

/** Evaluate the best 5-card hand from exactly 7 cards. Higher = better. */
export function evaluate7(cards: ArrayLike<number>): number {
  const rankCount = new Int8Array(15);
  const suitCount = new Int8Array(4);
  const suitMask = new Int32Array(4);
  let rankMask = 0;

  for (let i = 0; i < 7; i++) {
    const c = cards[i]!;
    const r = (c >> 2) + 2;
    const s = c & 3;
    rankCount[r]!++;
    suitCount[s]!++;
    suitMask[s]! |= 1 << r;
    rankMask |= 1 << r;
  }

  // flush / straight flush
  let flushSuit = -1;
  for (let s = 0; s < 4; s++) {
    if (suitCount[s]! >= 5) {
      flushSuit = s;
      break;
    }
  }
  if (flushSuit >= 0) {
    const sf = straightTop(suitMask[flushSuit]!);
    if (sf > 0) return pack(8, sf);
  }

  // multiples
  let quad = 0;
  let trip1 = 0;
  let trip2 = 0;
  let pair1 = 0;
  let pair2 = 0;
  for (let r = 14; r >= 2; r--) {
    const n = rankCount[r]!;
    if (n === 4) quad = quad || r;
    else if (n === 3) {
      if (!trip1) trip1 = r;
      else if (!trip2) trip2 = r;
    } else if (n === 2) {
      if (!pair1) pair1 = r;
      else if (!pair2) pair2 = r;
    }
  }

  if (quad) {
    let kicker = 0;
    for (let r = 14; r >= 2; r--) {
      if (r !== quad && rankCount[r]! > 0) {
        kicker = r;
        break;
      }
    }
    return pack(7, quad, kicker);
  }

  if (trip1 && (trip2 || pair1)) {
    return pack(6, trip1, Math.max(trip2, pair1));
  }

  if (flushSuit >= 0) {
    const digits: number[] = [];
    for (let r = 14; r >= 2 && digits.length < 5; r--) {
      if (suitMask[flushSuit]! & (1 << r)) digits.push(r);
    }
    return pack(5, digits[0]!, digits[1]!, digits[2]!, digits[3]!, digits[4]!);
  }

  const st = straightTop(rankMask);
  if (st > 0) return pack(4, st);

  if (trip1) {
    const kickers: number[] = [];
    for (let r = 14; r >= 2 && kickers.length < 2; r--) {
      if (r !== trip1 && rankCount[r]! > 0) kickers.push(r);
    }
    return pack(3, trip1, kickers[0] ?? 0, kickers[1] ?? 0);
  }

  if (pair1 && pair2) {
    let kicker = 0;
    for (let r = 14; r >= 2; r--) {
      if (r !== pair1 && r !== pair2 && rankCount[r]! > 0) {
        kicker = r;
        break;
      }
    }
    return pack(2, pair1, pair2, kicker);
  }

  if (pair1) {
    const kickers: number[] = [];
    for (let r = 14; r >= 2 && kickers.length < 3; r--) {
      if (r !== pair1 && rankCount[r]! > 0) kickers.push(r);
    }
    return pack(1, pair1, kickers[0] ?? 0, kickers[1] ?? 0, kickers[2] ?? 0);
  }

  const highs: number[] = [];
  for (let r = 14; r >= 2 && highs.length < 5; r--) {
    if (rankCount[r]! > 0) highs.push(r);
  }
  return pack(0, highs[0]!, highs[1]!, highs[2]!, highs[3]!, highs[4]!);
}
