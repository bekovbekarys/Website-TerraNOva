/**
 * Structured hand model produced by the shorthand parser.
 * Pure data — everything is JSON-serializable so hands can be stored
 * in IndexedDB and exported verbatim.
 */

export type Suit = 's' | 'h' | 'd' | 'c';
/** 2..14, where 11=J, 12=Q, 13=K, 14=A */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  rank: Rank;
  suit: Suit;
}

/**
 * Hole cards may be exact ("AhKs") or abstract ("AKs", "AKo", "QQ", "AK").
 * Abstract cards are legal input — live players often don't remember suits.
 */
export type HoleCards =
  | { kind: 'exact'; cards: [Card, Card] }
  | { kind: 'abstract'; ranks: [Rank, Rank]; suited: 'suited' | 'offsuit' | 'any' };

export type Position =
  | 'UTG'
  | 'UTG1'
  | 'UTG2'
  | 'LJ'
  | 'MP'
  | 'HJ'
  | 'CO'
  | 'BTN'
  | 'SB'
  | 'BB'
  | 'ST'; // straddle seat

export const POSITIONS: readonly Position[] = [
  'UTG',
  'UTG1',
  'UTG2',
  'LJ',
  'MP',
  'HJ',
  'CO',
  'BTN',
  'SB',
  'BB',
  'ST',
];

/** 'HERO', a Position for a known villain seat, or 'V1'/'V2'… for unnamed villains. */
export type ActorId = string;

export type ActionType =
  | 'post' // blind or straddle post
  | 'straddle'
  | 'limp'
  | 'check'
  | 'bet'
  | 'call'
  | 'raise'
  | 'fold';

export interface HandAction {
  actor: ActorId;
  type: ActionType;
  /**
   * Total amount the actor is committed to on this street after the action
   * ("raise to"). For bets this equals the bet size. Absent for check/fold.
   */
  to?: number;
  allIn?: boolean;
  /** Character span in the original input, for highlighting. */
  span: [number, number];
}

export type StreetName = 'preflop' | 'flop' | 'turn' | 'river';

export interface StreetData {
  street: StreetName;
  /** Cards dealt at the start of this street (0 preflop, 3 flop, 1 turn/river). */
  board: Card[];
  actions: HandAction[];
  /** Pot size after this street's action completes (includes dead blinds). */
  potAfter: number;
}

export interface HandResult {
  winners: ActorId[];
  /** True if the hand text indicates cards were shown / went to showdown. */
  showdown: boolean;
  /** Cards shown at showdown, by actor. */
  shown?: Record<ActorId, HoleCards>;
  /** Total pot awarded (after refunding any uncalled bet). */
  pot: number;
  /** Hero's net result for the hand (positive = won money). */
  heroNet?: number;
}

export interface ParseIssue {
  severity: 'error' | 'warning';
  message: string;
  /** Character offsets into the original input string. */
  start: number;
  end: number;
}

export interface Stakes {
  sb: number;
  bb: number;
  straddle?: number;
}

export interface ParsedHand {
  /** The raw input, kept verbatim so the user always owns the source of truth. */
  raw: string;
  stakes?: Stakes;
  game: string; // 'NLHE' unless the text says otherwise (e.g. 'PLO')
  /** Effective stack in the hand's money unit (chips or bb — see `unit`). */
  effectiveStack?: number;
  /** 'chips' normally; 'bb' if the input used bb-denominated amounts. */
  unit: 'chips' | 'bb';
  heroPosition?: Position;
  heroCards?: HoleCards;
  /** All actors seen, in order of first appearance. */
  players: ActorId[];
  streets: StreetData[];
  /** Total the hero put in across all streets (after uncalled-bet refund). */
  heroInvested: number;
  result?: HandResult;
  issues: ParseIssue[];
  /** True when there are no error-severity issues. */
  ok: boolean;
}
