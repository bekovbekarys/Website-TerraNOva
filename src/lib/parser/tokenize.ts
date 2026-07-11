/**
 * Tokenizer for poker shorthand. Splits input into phrases (comma /
 * period / newline separated) of typed tokens, each carrying its exact
 * character span in the original string so errors can point at the
 * offending fragment.
 */

export type TokenKind =
  | 'stakes' // 1/2, $1/$3, 1/2/5
  | 'number' // 15, $15, 15bb, 2.5, 2k
  | 'cards' // AhKs, Jh7d2c, Qd (exact card runs)
  | 'nbet' // 3bet, 4-bets …
  | 'checkcheck' // x/x, xx
  | 'word';

export interface Token {
  kind: TokenKind;
  /** Raw text as typed. */
  text: string;
  /** Normalized (lowercase, apostrophes/hyphens/plus stripped, contractions expanded). */
  norm: string;
  start: number;
  end: number;
  /** Numeric value for 'number' tokens (k-multiplier applied). */
  value?: number;
  /** True when a 'number' token had a "bb" suffix. */
  bb?: boolean;
  /** Stakes values for 'stakes' tokens. */
  stakesValues?: number[];
}

const STAKES_RE = /^\$?\d+(?:\.\d+)?\/\$?\d+(?:\.\d+)?(?:\/\$?\d+(?:\.\d+)?)?$/;
const NUMBER_RE = /^\$?(\d+(?:\.\d+)?)(k)?(bb)?$/i;
const NBET_RE = /^([2-9])-?bets?$/i;
const CARDRUN_RE = /^(?:(?:10|[2-9TJQKAtjqka])[shdcSHDC])+$/;
const CHECKCHECK_RE = /^(?:x\/x|xx)$/i;

/** All-lowercase strings that match the card pattern but are English words. */
const AMBIGUOUS_CARD_WORDS = new Set(['as', 'ah', 'ad', 'ac']);

const CONTRACTIONS: Record<string, string> = {
  hes: 'he',
  shes: 'she',
  im: 'i',
  ive: 'i',
  id: 'i',
  ill: 'i',
  theyre: 'they',
  whos: 'who',
  its: 'it',
  dont: 'dont',
};

export function normalizeWord(text: string): string {
  const lower = text.toLowerCase().replace(/[''`+-]/g, '');
  return CONTRACTIONS[lower] ?? lower;
}

function classify(text: string, start: number, end: number): Token {
  const base: Token = { kind: 'word', text, norm: normalizeWord(text), start, end };
  if (CHECKCHECK_RE.test(text)) return { ...base, kind: 'checkcheck' };
  if (STAKES_RE.test(text)) {
    const stakesValues = text
      .split('/')
      .map((part) => Number.parseFloat(part.replace('$', '')));
    return { ...base, kind: 'stakes', stakesValues };
  }
  const nbet = NBET_RE.exec(text);
  if (nbet) return { ...base, kind: 'nbet' };
  const num = NUMBER_RE.exec(text);
  if (num) {
    const value = Number.parseFloat(num[1]!) * (num[2] ? 1000 : 1);
    const token: Token = { ...base, kind: 'number', value };
    if (num[3]) token.bb = true;
    return token;
  }
  if (CARDRUN_RE.test(text)) {
    const isAmbiguous = text === text.toLowerCase() && AMBIGUOUS_CARD_WORDS.has(text.toLowerCase());
    if (!isAmbiguous) return { ...base, kind: 'cards' };
  }
  return base;
}

export interface Phrase {
  tokens: Token[];
  start: number;
  end: number;
}

const CHUNK_RE = /[A-Za-z0-9$+./'-]+/y;

/**
 * Split the input into phrases of tokens. Phrase boundaries are commas,
 * periods (except decimals, which are consumed inside number chunks),
 * semicolons, colons and newlines. Parenthesized asides are skipped.
 */
export function tokenize(input: string): Phrase[] {
  const phrases: Phrase[] = [];
  let current: Token[] = [];

  const endPhrase = () => {
    if (current.length > 0) {
      phrases.push({
        tokens: current,
        start: current[0]!.start,
        end: current[current.length - 1]!.end,
      });
    }
    current = [];
  };

  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;
    if (ch === '\n' || ch === ',' || ch === ';' || ch === ':' || ch === '.' || ch === '!' || ch === '?') {
      endPhrase();
      i += 1;
      continue;
    }
    if (ch === '(') {
      // skip parenthetical asides entirely: "(93)" pot notes, "(sigh)" etc.
      const close = input.indexOf(')', i);
      i = close === -1 ? input.length : close + 1;
      continue;
    }
    if (/\s/.test(ch) || ch === ')' || ch === '"' || ch === '—' || ch === '–') {
      i += 1;
      continue;
    }
    CHUNK_RE.lastIndex = i;
    const m = CHUNK_RE.exec(input);
    if (!m || m.index !== i) {
      i += 1; // unknown character; skip it
      continue;
    }
    let chunk = m[0];
    const rawLen = chunk.length;
    // trailing periods/apostrophes/hyphens are sentence punctuation, not part of the token
    const trimmed = chunk.replace(/[.'-]+$/, '');
    const trailingPeriod = trimmed.length !== chunk.length && chunk.slice(trimmed.length).includes('.');
    chunk = trimmed;
    if (chunk.length > 0) {
      current.push(classify(chunk, i, i + chunk.length));
    }
    if (trailingPeriod) endPhrase();
    i += rawLen;
  }
  endPhrase();
  return phrases;
}
