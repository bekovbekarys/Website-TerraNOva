import { tokenize, type Phrase, type Token } from './tokenize';
import { cardToString, parseCardRun, parseHoleCards } from './cards';
import type {
  ActionType,
  Card,
  HandAction,
  HandResult,
  HoleCards,
  ParsedHand,
  ParseIssue,
  Position,
  Stakes,
  StreetName,
} from './types';

// ---------------------------------------------------------------- vocabulary

const POSITION_WORDS: Record<string, Position> = {
  utg: 'UTG',
  utg1: 'UTG1',
  utg2: 'UTG2',
  lj: 'LJ',
  lojack: 'LJ',
  mp: 'MP',
  hj: 'HJ',
  hijack: 'HJ',
  co: 'CO',
  cutoff: 'CO',
  btn: 'BTN',
  bu: 'BTN',
  button: 'BTN',
  sb: 'SB',
  smallblind: 'SB',
  bb: 'BB',
  bigblind: 'BB',
  straddle: 'ST',
  straddler: 'ST',
};

type VerbKind =
  | 'raise'
  | 'bet'
  | 'call'
  | 'check'
  | 'fold'
  | 'limp'
  | 'allin'
  | 'straddle'
  | 'post'
  | 'win'
  | 'chop'
  | 'show'
  | 'muck';

const VERB_WORDS: Record<string, VerbKind> = {
  open: 'raise', opens: 'raise', opened: 'raise',
  raise: 'raise', raises: 'raise', raised: 'raise',
  reraise: 'raise', reraises: 'raise',
  make: 'raise', makes: 'raise', // "makes it 45"
  bump: 'raise', bumps: 'raise',
  bet: 'bet', bets: 'bet',
  cbet: 'bet', cbets: 'bet',
  lead: 'bet', leads: 'bet',
  donk: 'bet', donks: 'bet',
  barrel: 'bet', barrels: 'bet',
  stab: 'bet', stabs: 'bet',
  bomb: 'bet', bombs: 'bet',
  overbet: 'bet', overbets: 'bet',
  call: 'call', calls: 'call', called: 'call',
  flat: 'call', flats: 'call',
  check: 'check', checks: 'check', checked: 'check', x: 'check',
  fold: 'fold', folds: 'fold', folded: 'fold',
  limp: 'limp', limps: 'limp', limped: 'limp',
  jam: 'allin', jams: 'allin', jammed: 'allin',
  shove: 'allin', shoves: 'allin', shoved: 'allin',
  ship: 'allin', ships: 'allin',
  rip: 'allin', rips: 'allin',
  allin: 'allin',
  straddle: 'straddle', straddles: 'straddle',
  post: 'post', posts: 'post',
  win: 'win', wins: 'win', won: 'win',
  take: 'win', takes: 'win', took: 'win',
  drag: 'win', drags: 'win',
  scoop: 'win', scoops: 'win',
  chop: 'chop', chops: 'chop', chopped: 'chop',
  split: 'chop', splits: 'chop',
  show: 'show', shows: 'show', showed: 'show',
  table: 'show', tables: 'show',
  muck: 'muck', mucks: 'muck', mucked: 'muck',
};

const HERO_WORDS = new Set(['i', 'me', 'hero', 'we', 'my']);
const PRONOUN_WORDS = new Set(['he', 'she', 'they', 'villain', 'v']);
const FILLER_WORDS = new Set([
  'to', 'it', 'the', 'a', 'an', 'for', 'of', 'is', 'are', 'was', 'were', 'am',
  'goes', 'go', 'went', 'again', 'now', 'off', 'down', 'up', 'gets', 'get',
  'his', 'her', 'their', 'him', 'them', 'seat', 'guy', 'lady', 'old', 'young',
  'quickly', 'fast', 'slowly', 'tanks', 'tank', 'snap', 'and', 'then', 'so',
  'comes', 'come', 'brings', 'out', 'over', 'this', 'that', 'nl', 'here', 'there',
]);
const STREET_WORDS: Record<string, StreetName> = {
  preflop: 'preflop',
  flop: 'flop',
  turn: 'turn',
  river: 'river',
};
const GAME_WORDS: Record<string, string> = {
  nl: 'NLHE', nlh: 'NLHE', nlhe: 'NLHE', holdem: 'NLHE', nolimit: 'NLHE',
  plo: 'PLO', omaha: 'PLO',
};

// ------------------------------------------------------------- parser state

interface Actor {
  isHero: boolean;
  position: Position | undefined;
  /** Ordinal for unnamed villains: V1, V2… */
  villainOrdinal: number | undefined;
  folded: boolean;
  mucked: boolean;
  /** Committed this street. */
  committed: number;
  /** Committed across the whole hand. */
  total: number;
  /** Order of first appearance. */
  seenAt: number;
}

interface StreetState {
  name: StreetName;
  board: Card[];
  actions: { actor: Actor; type: ActionType; to?: number; allIn?: boolean; span: [number, number] }[];
  /** Last bettor/raiser (or straddler) this street. */
  aggressor: Actor | undefined;
  /** Per-actor commitments, snapshotted when the street closes. */
  commits: Map<Actor, number>;
}

class Ctx {
  raw: string;
  issues: ParseIssue[] = [];
  stakes: Stakes | undefined;
  game = 'NLHE';
  unit: 'chips' | 'bb' = 'chips';
  effectiveStack: number | undefined;
  heroCards: HoleCards | undefined;
  heroCardsSpan: [number, number] | undefined;
  actors: Actor[] = [];
  hero: Actor;
  streets: StreetState[] = [];
  currentBet = 0;
  lastNonHeroActor: Actor | undefined;
  lastAggressorEver: Actor | undefined;
  lastActorMentioned: Actor | undefined;
  sawAction = false;
  /** Result accumulation. */
  winners: Actor[] | undefined;
  chop = false;
  showdown = false;
  shown = new Map<Actor, HoleCards>();
  statedPot: number | undefined;
  approximatePot = false;
  /** Exact cards seen so far, for duplicate detection. card string -> first span. */
  seenCards = new Map<string, [number, number]>();
  headerDone = false;

  constructor(raw: string) {
    this.raw = raw;
    this.hero = {
      isHero: true,
      position: undefined,
      villainOrdinal: undefined,
      folded: false,
      mucked: false,
      committed: 0,
      total: 0,
      seenAt: 0,
    };
    this.actors.push(this.hero);
    this.streets.push({ name: 'preflop', board: [], actions: [], aggressor: undefined, commits: new Map() });
  }

  error(message: string, start: number, end: number) {
    this.issues.push({ severity: 'error', message, start, end });
  }
  warn(message: string, start: number, end: number) {
    this.issues.push({ severity: 'warning', message, start, end });
  }

  get street(): StreetState {
    return this.streets[this.streets.length - 1]!;
  }

  blindInit(pos: Position): number {
    if (!this.stakes) return 0;
    const scale = this.unit === 'bb' ? this.stakes.bb : 1;
    if (pos === 'SB') return this.stakes.sb / scale;
    if (pos === 'BB') return this.stakes.bb / scale;
    if (pos === 'ST' && this.stakes.straddle !== undefined) return this.stakes.straddle / scale;
    return 0;
  }

  /** Dead money from blinds whose seats never act in the logged hand. */
  deadBlinds(): number {
    if (!this.stakes) return 0;
    const scale = this.unit === 'bb' ? this.stakes.bb : 1;
    let dead = 0;
    const hasPos = (p: Position) => this.actors.some((a) => a.position === p);
    if (!hasPos('SB')) dead += this.stakes.sb / scale;
    if (!hasPos('BB')) dead += this.stakes.bb / scale;
    if (this.stakes.straddle !== undefined && !hasPos('ST')) {
      const straddleActed = this.streets[0]!.actions.some((a) => a.type === 'straddle');
      if (!straddleActed) dead += this.stakes.straddle / scale;
    }
    return dead;
  }

  potSoFar(): number {
    let pot = this.deadBlinds();
    for (const s of this.streets) {
      if (s === this.street) {
        for (const a of this.actors) pot += a.committed;
      } else {
        for (const v of s.commits.values()) pot += v;
      }
    }
    return pot;
  }

  closeStreet() {
    const s = this.street;
    for (const a of this.actors) {
      if (a.committed > 0) s.commits.set(a, a.committed);
      a.committed = 0;
    }
    this.currentBet = 0;
  }

  startStreet(name: StreetName) {
    this.closeStreet();
    this.streets.push({ name, board: [], actions: [], aggressor: undefined, commits: new Map() });
  }

  actorId(a: Actor): string {
    if (a.isHero) return 'HERO';
    if (a.position) return a.position;
    return `V${a.villainOrdinal ?? 1}`;
  }

  getPositionActor(pos: Position, span: [number, number]): Actor {
    if (this.hero.position === pos) return this.hero;
    const existing = this.actors.find((a) => a.position === pos);
    if (existing) return existing;
    // adopt an unnamed villain if there is exactly one
    const unnamed = this.actors.filter((a) => !a.isHero && !a.position);
    if (unnamed.length === 1) {
      const a = unnamed[0]!;
      a.position = pos;
      this.applyBlind(a);
      return a;
    }
    const actor: Actor = {
      isHero: false,
      position: pos,
      villainOrdinal: undefined,
      folded: false,
      mucked: false,
      committed: 0,
      total: 0,
      seenAt: this.actors.length,
    };
    this.actors.push(actor);
    this.applyBlind(actor);
    void span;
    return actor;
  }

  makeUnnamedVillain(): Actor {
    const ordinal = this.actors.filter((a) => !a.isHero && !a.position).length + 1;
    const actor: Actor = {
      isHero: false,
      position: undefined,
      villainOrdinal: ordinal,
      folded: false,
      mucked: false,
      committed: 0,
      total: 0,
      seenAt: this.actors.length,
    };
    this.actors.push(actor);
    return actor;
  }

  /** Seed SB/BB/ST actors with their posted blind (preflop only, before they act). */
  applyBlind(actor: Actor) {
    if (this.street.name !== 'preflop') return;
    if (!actor.position || actor.committed > 0 || actor.total > 0) return;
    const init = this.blindInit(actor.position);
    if (init > 0) {
      actor.committed = init;
      actor.total = init;
    }
  }

  resolvePronoun(span: [number, number]): Actor {
    const candidates = this.actors.filter((a) => !a.isHero && !a.folded);
    if (candidates.length === 1) return candidates[0]!;
    if (candidates.length === 0) {
      const any = this.actors.filter((a) => !a.isHero);
      if (any.length === 1) return any[0]!;
      if (any.length > 1) return any[any.length - 1]!;
      return this.makeUnnamedVillain();
    }
    const pick =
      (this.lastAggressorEver && !this.lastAggressorEver.isHero && !this.lastAggressorEver.folded
        ? this.lastAggressorEver
        : undefined) ??
      (this.lastNonHeroActor && !this.lastNonHeroActor.folded ? this.lastNonHeroActor : undefined) ??
      candidates[candidates.length - 1]!;
    this.warn(
      `Ambiguous pronoun with ${candidates.length} villains in the hand — assuming ${this.actorId(pick)}. Name the seat (e.g. "UTG bets") to be exact.`,
      span[0],
      span[1],
    );
    return pick;
  }

  registerExactCards(cards: Card[], span: [number, number]) {
    for (const c of cards) {
      const key = cardToString(c);
      const first = this.seenCards.get(key);
      if (first) {
        this.error(`Card ${key} appears twice — a deck has only one of each card.`, span[0], span[1]);
      } else {
        this.seenCards.set(key, span);
      }
    }
  }
}

// ----------------------------------------------------------------- helpers

function spanOf(tokens: Token[], from: number, to: number): [number, number] {
  const a = tokens[from];
  const b = tokens[Math.min(to, tokens.length - 1)];
  if (!a || !b) return [0, 0];
  return [a.start, b.end];
}

function isVerb(t: Token): VerbKind | undefined {
  if (t.kind === 'nbet') return 'raise';
  if (t.kind !== 'word') return undefined;
  return VERB_WORDS[t.norm];
}

function isPosition(t: Token): Position | undefined {
  if (t.kind !== 'word') return undefined;
  return POSITION_WORDS[t.norm];
}

/** "big blind" / "small blind" as two words. Returns [position, tokensConsumed]. */
function positionAt(tokens: Token[], i: number): [Position, number] | undefined {
  const t = tokens[i];
  if (!t) return undefined;
  const single = isPosition(t);
  if (single) return [single, 1];
  const next = tokens[i + 1];
  if (t.kind === 'word' && next?.kind === 'word' && next.norm === 'blind') {
    if (t.norm === 'big') return ['BB', 2];
    if (t.norm === 'small') return ['SB', 2];
  }
  return undefined;
}

/** Try to read hole cards from one or more tokens starting at i. */
function holeCardsAt(tokens: Token[], i: number): { cards: HoleCards; consumed: number; span: [number, number] } | undefined {
  const t = tokens[i];
  if (!t) return undefined;
  if (t.kind === 'cards') {
    const run = parseCardRun(t.text);
    if (run && run.length === 2) {
      const hc = parseHoleCards(t.text);
      if (hc) return { cards: hc, consumed: 1, span: [t.start, t.end] };
      return undefined; // duplicate card, caller reports
    }
    // maybe two single-card tokens: "Ah Ks"
    const next = tokens[i + 1];
    if (run && run.length === 1 && next?.kind === 'cards') {
      const run2 = parseCardRun(next.text);
      if (run2 && run2.length === 1) {
        const hc = parseHoleCards(t.text + next.text);
        if (hc) return { cards: hc, consumed: 2, span: [t.start, next.end] };
      }
    }
    return undefined;
  }
  if (t.kind === 'word') {
    // abstract notation (AKs, QQ) or ambiguous lowercase card words
    const hc = parseHoleCards(t.text);
    if (hc) return { cards: hc, consumed: 1, span: [t.start, t.end] };
  }
  return undefined;
}

// --------------------------------------------------------- betting actions

function applyAction(
  ctx: Ctx,
  actor: Actor,
  verb: VerbKind,
  amount: number | undefined,
  allIn: boolean,
  span: [number, number],
) {
  ctx.sawAction = true;
  ctx.headerDone = true;
  const street = ctx.street;
  const record = (type: ActionType, to?: number, isAllIn?: boolean) => {
    const action: StreetState['actions'][number] = { actor, type, span };
    if (to !== undefined) action.to = to;
    if (isAllIn) action.allIn = true;
    street.actions.push(action);
  };

  if (actor.folded && verb !== 'show' && verb !== 'muck' && verb !== 'win' && verb !== 'chop') {
    ctx.error(`${ctx.actorId(actor)} already folded and cannot act again.`, span[0], span[1]);
    return;
  }

  const commitTo = (to: number) => {
    const added = Math.max(0, to - actor.committed);
    actor.committed += added;
    actor.total += added;
  };

  switch (verb) {
    case 'straddle': {
      const to = amount ?? (ctx.stakes ? ctx.blindInit('BB') * 2 : undefined);
      if (to === undefined) {
        ctx.warn('Straddle size unknown — pot will be approximate.', span[0], span[1]);
        ctx.approximatePot = true;
        record('straddle');
        return;
      }
      commitTo(to);
      ctx.currentBet = Math.max(ctx.currentBet, to);
      street.aggressor = actor;
      record('straddle', to);
      return;
    }
    case 'post': {
      if (amount !== undefined) commitTo(amount);
      record('post', amount);
      return;
    }
    case 'limp': {
      const to = Math.max(ctx.currentBet, actor.committed);
      commitTo(to);
      record('limp', to);
      return;
    }
    case 'check': {
      if (ctx.currentBet > actor.committed + 1e-9) {
        ctx.error(
          `${ctx.actorId(actor)} cannot check facing a bet of ${ctx.currentBet} — that action is out of order.`,
          span[0],
          span[1],
        );
        return;
      }
      record('check');
      return;
    }
    case 'call': {
      if (ctx.currentBet <= actor.committed + 1e-9) {
        if (street.name === 'preflop') {
          const to = Math.max(ctx.currentBet, actor.committed);
          commitTo(to);
          record('limp', to);
        } else {
          ctx.warn(`Nothing to call here — treating it as a check.`, span[0], span[1]);
          record('check');
        }
        return;
      }
      commitTo(ctx.currentBet);
      record('call', actor.committed, allIn);
      return;
    }
    case 'fold': {
      actor.folded = true;
      record('fold');
      return;
    }
    case 'bet':
    case 'raise':
    case 'allin': {
      let to = amount;
      let isAllIn = allIn || verb === 'allin';
      if (verb === 'allin' && to === undefined) {
        if (ctx.effectiveStack !== undefined) {
          to = ctx.effectiveStack;
        } else {
          ctx.warn(
            'All-in with no size and no effective stack given — pot from here is approximate.',
            span[0],
            span[1],
          );
          ctx.approximatePot = true;
          record(ctx.currentBet > 0 ? 'raise' : 'bet', undefined, true);
          street.aggressor = actor;
          ctx.lastAggressorEver = actor;
          return;
        }
      }
      if (to === undefined) {
        ctx.warn('Bet with no amount — pot from here is approximate.', span[0], span[1]);
        ctx.approximatePot = true;
        record(ctx.currentBet > 0 ? 'raise' : 'bet', undefined, isAllIn);
        street.aggressor = actor;
        ctx.lastAggressorEver = actor;
        return;
      }
      if (ctx.currentBet > 0 && to <= ctx.currentBet + 1e-9) {
        if (isAllIn) {
          // short all-in: a call for less
          commitTo(to);
          record('call', to, true);
          return;
        }
        if (to < ctx.currentBet - 1e-9) {
          ctx.error(
            `Raise to ${to} is below the current bet of ${ctx.currentBet}.`,
            span[0],
            span[1],
          );
          return;
        }
        // to == currentBet: effectively a call
        commitTo(to);
        record('call', to, isAllIn);
        return;
      }
      const type: ActionType = ctx.currentBet > 0 || street.name === 'preflop' ? 'raise' : 'bet';
      commitTo(to);
      ctx.currentBet = Math.max(ctx.currentBet, to);
      street.aggressor = actor;
      ctx.lastAggressorEver = actor;
      record(type, to, isAllIn);
      return;
    }
    case 'win':
    case 'chop':
    case 'show':
    case 'muck':
      // handled by caller
      return;
    default:
      return;
  }
}

// -------------------------------------------------------------- phrase parse

function parseHeaderPhrase(ctx: Ctx, phrase: Phrase): boolean {
  const tokens = phrase.tokens;
  let recognized = false;
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t.kind === 'stakes' && !ctx.stakes) {
      const v = t.stakesValues!;
      if (v.length >= 2) {
        const stakes: Stakes = { sb: v[0]!, bb: v[1]! };
        if (v[2] !== undefined) stakes.straddle = v[2];
        ctx.stakes = stakes;
        // preflop opens against the posted big blind (or straddle)
        if (ctx.street.name === 'preflop' && !ctx.sawAction) {
          ctx.currentBet = Math.max(ctx.blindInit('BB'), ctx.stakes.straddle !== undefined ? ctx.blindInit('ST') : 0);
          ctx.applyBlind(ctx.hero);
        }
        recognized = true;
        i += 1;
        continue;
      }
    }
    if (t.kind === 'word' && GAME_WORDS[t.norm]) {
      ctx.game = GAME_WORDS[t.norm]!;
      recognized = true;
      i += 1;
      continue;
    }
    if (t.kind === 'number') {
      const next = tokens[i + 1];
      const isEff =
        (next?.kind === 'word' && (next.norm === 'eff' || next.norm === 'effective' || next.norm === 'deep' || next.norm === 'stacks')) ||
        (i > 0 && tokens[i - 1]?.kind === 'word' && ['eff', 'effective', 'stacks'].includes(tokens[i - 1]!.norm));
      if (isEff) {
        let value = t.value!;
        if (t.bb && ctx.unit === 'chips' && ctx.stakes) value = value * ctx.stakes.bb;
        ctx.effectiveStack = value;
        recognized = true;
        i += next && next.kind === 'word' && ['eff', 'effective', 'deep', 'stacks'].includes(next.norm) ? 2 : 1;
        // consume a following "stacks" word too ("300 effective stacks")
        const after = tokens[i];
        if (after?.kind === 'word' && (after.norm === 'stacks' || after.norm === 'stack')) i += 1;
        continue;
      }
    }
    const pos = positionAt(tokens, i);
    if (pos && !ctx.heroCards) {
      // "BTN AhKs" — hero seat, maybe followed by cards
      if (ctx.hero.position === undefined) {
        ctx.hero.position = pos[0];
        ctx.applyBlind(ctx.hero);
      }
      recognized = true;
      i += pos[1];
      continue;
    }
    const hc = holeCardsAt(tokens, i);
    if (hc && !ctx.heroCards) {
      ctx.heroCards = hc.cards;
      ctx.heroCardsSpan = hc.span;
      if (hc.cards.kind === 'exact') ctx.registerExactCards(hc.cards.cards, hc.span);
      recognized = true;
      i += hc.consumed;
      continue;
    }
    // duplicate exact hole cards like "AhAh"
    if (t.kind === 'cards' && !ctx.heroCards) {
      const run = parseCardRun(t.text);
      if (run && run.length === 2 && cardToString(run[0]!) === cardToString(run[1]!)) {
        ctx.error(
          `Hole cards "${t.text}" use the same card twice — that's impossible.`,
          t.start,
          t.end,
        );
        recognized = true;
        i += 1;
        continue;
      }
    }
    if (t.kind === 'word' && (FILLER_WORDS.has(t.norm) || HERO_WORDS.has(t.norm) || t.norm === 'with' || t.norm === 'eff' || t.norm === 'effective' || t.norm === 'stakes' || t.norm === 'game')) {
      i += 1;
      continue;
    }
    return recognized && i > 0 ? recognized : false;
  }
  return recognized;
}

function parseStreetPhrase(ctx: Ctx, phrase: Phrase): void {
  const tokens = phrase.tokens;
  const streetTok = tokens[0]!;
  const name = STREET_WORDS[streetTok.norm]!;
  ctx.headerDone = true;

  if (name === 'preflop') return; // "preflop:" label — actions follow in later phrases

  const existing = ctx.streets.find((s) => s.name === name);
  if (existing) {
    ctx.error(`The ${name} was already given earlier in this hand.`, streetTok.start, streetTok.end);
    return;
  }
  // enforce street order: flop -> turn -> river
  const order: StreetName[] = ['preflop', 'flop', 'turn', 'river'];
  const prevIdx = order.indexOf(ctx.street.name);
  const newIdx = order.indexOf(name);
  if (newIdx <= prevIdx) {
    ctx.error(`The ${name} cannot come after the ${ctx.street.name}.`, streetTok.start, streetTok.end);
    return;
  }
  // implicitly create skipped streets (e.g. "Board" runouts handled per street)
  for (let s = prevIdx + 1; s < newIdx; s++) {
    ctx.startStreet(order[s]!);
  }
  ctx.startStreet(name);

  // collect board cards, skipping filler ("comes", "is", "a", "the")
  const cards: Card[] = [];
  let i = 1;
  let cardSpan: [number, number] | undefined;
  let junkStart: number | undefined;
  let junkEnd: number | undefined;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t.kind === 'cards' || (t.kind === 'word' && parseCardRun(t.text))) {
      const run = parseCardRun(t.text)!;
      cards.push(...run);
      cardSpan = cardSpan ? [cardSpan[0], t.end] : [t.start, t.end];
      i += 1;
      continue;
    }
    if (t.kind === 'word' && FILLER_WORDS.has(t.norm)) {
      i += 1;
      continue;
    }
    junkStart ??= t.start;
    junkEnd = t.end;
    i += 1;
  }
  if (junkStart !== undefined && junkEnd !== undefined) {
    ctx.error(
      `Couldn't read this as ${name} cards: "${ctx.raw.slice(junkStart, junkEnd)}".`,
      junkStart,
      junkEnd,
    );
  }
  const expected = name === 'flop' ? 3 : 1;
  if (cards.length === 0) {
    if (junkStart === undefined) {
      ctx.error(`The ${name} needs ${expected === 3 ? 'three cards' : 'one card'} (e.g. "${name === 'flop' ? 'Flop Jh7d2c' : name === 'turn' ? 'Turn 5s' : 'River Qd'}").`, streetTok.start, phrase.end);
    }
    return;
  }
  if (cards.length !== expected) {
    ctx.error(
      `The ${name} should be ${expected === 3 ? 'three cards' : 'one card'}, got ${cards.length}.`,
      cardSpan?.[0] ?? streetTok.start,
      cardSpan?.[1] ?? phrase.end,
    );
    return;
  }
  ctx.street.board = cards;
  if (cardSpan) ctx.registerExactCards(cards, cardSpan);
}

/** Actor words at position i. Returns [actor, consumed] or undefined. */
function actorAt(ctx: Ctx, tokens: Token[], i: number): [Actor, number] | undefined {
  let idx = i;
  let t = tokens[idx];
  if (!t) return undefined;
  if (t.kind === 'word' && t.norm === 'the') {
    idx += 1;
    t = tokens[idx];
    if (!t) return undefined;
  }
  if (t.kind === 'word' && HERO_WORDS.has(t.norm)) return [ctx.hero, idx - i + 1];
  if (t.kind === 'word' && PRONOUN_WORDS.has(t.norm)) {
    // "villain"/"he": if a verb follows (or "is"), it's an actor reference
    const actor = ctx.resolvePronoun([t.start, t.end]);
    return [actor, idx - i + 1];
  }
  const pos = positionAt(tokens, idx);
  if (pos) {
    // only treat a position as an actor when a verb follows (otherwise it
    // may be a trailing modifier like "I call BTN")
    return [ctx.getPositionActor(pos[0], [t.start, t.end]), idx - i + pos[1]];
  }
  return undefined;
}

function parseActionPhrase(ctx: Ctx, phrase: Phrase): void {
  const tokens = phrase.tokens;

  // whole phrase is check words: "check check", "x/x", "checks through"
  const allChecks =
    tokens.length > 0 &&
    tokens.every(
      (t) =>
        t.kind === 'checkcheck' ||
        (t.kind === 'word' && (VERB_WORDS[t.norm] === 'check' || t.norm === 'through' || t.norm === 'around' || t.norm === 'behind')),
    );
  if (allChecks) {
    const checkTokens = tokens.filter((t) => t.kind === 'checkcheck' || VERB_WORDS[t.norm] === 'check');
    const active = ctx.actors.filter((a) => !a.folded);
    const span: [number, number] = [phrase.start, phrase.end];
    const isThrough = tokens.some((t) => t.kind === 'checkcheck' || t.norm === 'through' || t.norm === 'around');
    const count = isThrough || checkTokens.length >= active.length ? active.length : checkTokens.length;
    for (let k = 0; k < count; k++) {
      applyAction(ctx, active[k]!, 'check', undefined, false, span);
    }
    return;
  }

  let i = 0;
  while (i < tokens.length) {
    // skip connectors
    while (i < tokens.length && tokens[i]!.kind === 'word' && (tokens[i]!.norm === 'and' || tokens[i]!.norm === 'then')) i += 1;
    if (i >= tokens.length) break;
    const segStart = i;

    // ---- special forms ----
    const first = tokens[i]!;
    // "folds to me" / "folds around" / "checks to me"
    if (first.kind === 'word' && (VERB_WORDS[first.norm] === 'fold' || VERB_WORDS[first.norm] === 'check')) {
      const rest = tokens.slice(i + 1);
      const restNorms = rest.map((t) => t.norm);
      if (restNorms[0] === 'to' || restNorms[0] === 'around') {
        if (VERB_WORDS[first.norm] === 'fold') {
          // "folds to me": nobody we track acted — no-op
          i = tokens.length;
          continue;
        }
        // "checks to me": all active non-hero players check
        const span: [number, number] = [first.start, phrase.end];
        for (const a of ctx.actors.filter((a) => !a.isHero && !a.folded)) {
          applyAction(ctx, a, 'check', undefined, false, span);
        }
        i = tokens.length;
        continue;
      }
    }
    // "everyone folds" / "both fold" / "all fold" / "blinds fold"
    if (first.kind === 'word' && ['everyone', 'everybody', 'both', 'all', 'blinds', 'rest', 'others'].includes(first.norm)) {
      const next = tokens[i + 1];
      if (next && isVerb(next) === 'fold') {
        const span: [number, number] = [first.start, next.end];
        if (first.norm === 'blinds') {
          i += 2;
          continue; // blinds are dead money already
        }
        const keeper = ctx.lastAggressorEver ?? ctx.hero;
        for (const a of ctx.actors) {
          if (a !== keeper && !a.folded) a.folded = true;
        }
        ctx.sawAction = true;
        ctx.headerDone = true;
        void span;
        i += 2;
        continue;
      }
    }

    // ---- generic segment: [actor] verb [modifiers] ----
    let actor: Actor | undefined;
    let consumed = 0;
    const actorHit = actorAt(ctx, tokens, i);
    if (actorHit) {
      const verbAfter = tokens[i + actorHit[1]];
      const isActorAlsoVerb = first.kind === 'word' && VERB_WORDS[first.norm] !== undefined;
      if (!isActorAlsoVerb || (verbAfter && isVerb(verbAfter))) {
        actor = actorHit[0];
        consumed = actorHit[1];
      }
    }
    let vi = i + consumed;
    let verbTok = tokens[vi];
    // allow "is"/"goes" before "all in": "he is all in"
    while (verbTok && verbTok.kind === 'word' && ['is', 'goes', 'moves', 'snap', 'just', 'now'].includes(verbTok.norm)) {
      vi += 1;
      verbTok = tokens[vi];
    }
    // "all in" as two words
    let verb: VerbKind | undefined;
    if (verbTok && verbTok.kind === 'word' && verbTok.norm === 'all' && tokens[vi + 1]?.norm === 'in') {
      verb = 'allin';
      vi += 2;
    } else if (verbTok) {
      verb = isVerb(verbTok);
      if (verb) vi += 1;
    }

    if (!verb) {
      // Unrecognized segment: consume to end of phrase, report exact span.
      const span = spanOf(tokens, segStart, tokens.length - 1);
      ctx.error(
        `Couldn't understand "${ctx.raw.slice(span[0], span[1])}" — expected something like "UTG opens 15" or "I call".`,
        span[0],
        span[1],
      );
      return;
    }

    // modifiers: amount, "all in", trailing position, "with" cards, result payload
    let amount: number | undefined;
    let allIn = false;
    let shownCards: HoleCards | undefined;
    let shownSpan: [number, number] | undefined;
    while (vi < tokens.length) {
      const t = tokens[vi]!;
      if (t.kind === 'word' && (t.norm === 'and' || t.norm === 'then')) break;
      if (t.kind === 'number') {
        if (amount === undefined) {
          amount = t.value;
          if (t.bb) ctx.unit = 'bb';
        }
        vi += 1;
        continue;
      }
      if (t.kind === 'word' && t.norm === 'pot' && amount === undefined && (verb === 'bet' || verb === 'raise')) {
        amount = ctx.potSoFar();
        vi += 1;
        continue;
      }
      if (t.kind === 'word' && t.norm === 'all' && tokens[vi + 1]?.norm === 'in') {
        allIn = true;
        vi += 2;
        continue;
      }
      if (t.kind === 'word' && t.norm === 'allin') {
        allIn = true;
        vi += 1;
        continue;
      }
      if (t.kind === 'word' && (t.norm === 'from' || t.norm === 'in' || t.norm === 'on')) {
        let pi = vi + 1;
        if (tokens[pi]?.norm === 'the') pi += 1;
        const pos = positionAt(tokens, pi);
        if (pos) {
          assignPosition(ctx, actor ?? ctx.lastActorMentioned, pos[0]);
          vi = pi + pos[1];
          continue;
        }
        vi += 1;
        continue;
      }
      if (t.kind === 'word' && t.norm === 'with') {
        const hc = holeCardsAt(tokens, vi + 1);
        if (hc) {
          if ((actor ?? ctx.hero).isHero && !ctx.heroCards) {
            ctx.heroCards = hc.cards;
            ctx.heroCardsSpan = hc.span;
            if (hc.cards.kind === 'exact') ctx.registerExactCards(hc.cards.cards, hc.span);
          }
          vi += 1 + hc.consumed;
          continue;
        }
        vi += 1;
        continue;
      }
      // bare position right after a hero verb: "I call BTN"
      {
        const pos = positionAt(tokens, vi);
        if (pos) {
          assignPosition(ctx, actor, pos[0]);
          vi += pos[1];
          continue;
        }
      }
      // shown cards after "shows"
      if (verb === 'show') {
        const hc = holeCardsAt(tokens, vi);
        if (hc) {
          shownCards = hc.cards;
          shownSpan = hc.span;
          vi += hc.consumed;
          continue;
        }
      }
      if (t.kind === 'word' && (FILLER_WORDS.has(t.norm) || HERO_WORDS.has(t.norm) || t.norm === 'pot' || t.norm === 'me')) {
        vi += 1;
        continue;
      }
      // tolerate stray descriptive words inside an otherwise-parsed segment
      vi += 1;
    }

    const span = spanOf(tokens, segStart, vi - 1 >= segStart ? vi - 1 : segStart);

    // result verbs
    if (verb === 'win' || verb === 'chop' || verb === 'show' || verb === 'muck') {
      const subject = actor ?? ctx.lastActorMentioned ?? ctx.hero;
      applyResultVerb(ctx, subject, verb, amount, shownCards, shownSpan, span);
      ctx.lastActorMentioned = subject;
      i = vi;
      continue;
    }

    const subject = actor ?? ctx.lastActorMentioned;
    if (!subject) {
      ctx.error(
        `Couldn't tell who acts in "${ctx.raw.slice(span[0], span[1])}".`,
        span[0],
        span[1],
      );
      i = vi;
      continue;
    }
    applyAction(ctx, subject, verb, amount, allIn, span);
    ctx.lastActorMentioned = subject;
    if (!subject.isHero) ctx.lastNonHeroActor = subject;
    i = vi;
  }
}

function assignPosition(ctx: Ctx, actor: Actor | undefined, pos: Position) {
  if (!actor) return;
  if (actor.isHero) {
    if (ctx.hero.position === undefined) {
      ctx.hero.position = pos;
      ctx.applyBlind(ctx.hero);
    }
    return;
  }
  if (actor.position === undefined) {
    // merge with an existing actor of that position if present
    const existing = ctx.actors.find((a) => a !== actor && a.position === pos);
    if (!existing) {
      actor.position = pos;
      ctx.applyBlind(actor);
    }
  }
}

function applyResultVerb(
  ctx: Ctx,
  actor: Actor,
  verb: VerbKind,
  amount: number | undefined,
  shownCards: HoleCards | undefined,
  shownSpan: [number, number] | undefined,
  span: [number, number],
) {
  ctx.headerDone = true;
  switch (verb) {
    case 'win':
      ctx.winners = [actor];
      if (amount !== undefined) ctx.statedPot = amount;
      break;
    case 'chop':
      ctx.chop = true;
      ctx.showdown = true;
      break;
    case 'show':
      ctx.showdown = true;
      if (shownCards) {
        ctx.shown.set(actor, shownCards);
        if (shownCards.kind === 'exact' && shownSpan) ctx.registerExactCards(shownCards.cards, shownSpan);
      }
      break;
    case 'muck':
      ctx.showdown = true;
      actor.mucked = true;
      break;
    default:
      break;
  }
  void span;
}

// ------------------------------------------------------------------ finalize

function finalize(ctx: Ctx): ParsedHand {
  ctx.closeStreet();

  // refund the uncalled portion of the final bet/raise
  for (let si = ctx.streets.length - 1; si >= 0; si--) {
    const s = ctx.streets[si]!;
    const hasBet = s.actions.some((a) => a.type === 'bet' || a.type === 'raise');
    if (!hasBet || !s.aggressor) continue;
    const aggCommit = s.commits.get(s.aggressor) ?? 0;
    let maxOther = 0;
    for (const [a, v] of s.commits) {
      if (a !== s.aggressor) maxOther = Math.max(maxOther, v);
    }
    const excess = aggCommit - maxOther;
    if (excess > 1e-9) {
      s.commits.set(s.aggressor, maxOther);
      s.aggressor.total -= excess;
    }
    break;
  }

  // pots per street
  const dead = ctx.deadBlinds();
  let running = dead;
  const streets = ctx.streets.map((s) => {
    let sum = 0;
    for (const v of s.commits.values()) sum += v;
    running += sum;
    return {
      street: s.name,
      board: s.board,
      actions: s.actions.map((a) => {
        const out: HandAction = { actor: ctx.actorId(a.actor), type: a.type, span: a.span };
        if (a.to !== undefined) out.to = round2(a.to);
        if (a.allIn) out.allIn = true;
        return out;
      }),
      potAfter: round2(running),
    };
  });
  const totalPot = running;

  // result
  let result: HandResult | undefined;
  const active = ctx.actors.filter((a) => !a.folded && !a.mucked);
  let winners: Actor[] | undefined = ctx.winners;
  if (!winners) {
    if (ctx.chop) {
      winners = ctx.actors.filter((a) => !a.folded);
    } else if (active.length === 1 && ctx.sawAction) {
      winners = [active[0]!];
    }
  }
  if (winners && winners.length > 0) {
    const pot = ctx.statedPot ?? totalPot;
    if (ctx.statedPot !== undefined && totalPot > 0 && Math.abs(ctx.statedPot - totalPot) / Math.max(ctx.statedPot, totalPot) > 0.5) {
      ctx.warn(
        `You said the pot was ${ctx.statedPot} but the actions add up to about ${round2(totalPot)} — double-check the sizes.`,
        0,
        ctx.raw.length,
      );
    }
    const showdown =
      ctx.showdown || (ctx.actors.filter((a) => !a.folded).length > 1 && ctx.winners !== undefined);
    const heroNet = winners.includes(ctx.hero)
      ? pot / winners.length - ctx.hero.total
      : -ctx.hero.total;
    result = {
      winners: winners.map((w) => ctx.actorId(w)),
      showdown,
      pot: round2(pot),
      heroNet: round2(heroNet),
    };
    if (ctx.shown.size > 0) {
      const shown: Record<string, HoleCards> = {};
      for (const [a, hc] of ctx.shown) shown[ctx.actorId(a)] = hc;
      result.shown = shown;
    }
  } else if (ctx.sawAction) {
    const survivors = ctx.actors.filter((a) => !a.folded);
    if (survivors.length > 1) {
      ctx.warn(
        'No result given — say who won (e.g. "I win", "he takes it", "chop") so this hand counts toward your profit stats.',
        Math.max(0, ctx.raw.trimEnd().length - 1),
        ctx.raw.trimEnd().length,
      );
    }
  }

  if (!ctx.stakes && ctx.sawAction) {
    ctx.warn('Stakes unknown — blinds are not counted in the pot. Start with e.g. "1/2" to fix.', 0, Math.min(ctx.raw.length, 10));
  }
  if (!ctx.sawAction) {
    ctx.error('No poker actions found in this text.', 0, ctx.raw.length);
  }

  const errorsExist = ctx.issues.some((i) => i.severity === 'error');

  const hand: ParsedHand = {
    raw: ctx.raw,
    game: ctx.game,
    unit: ctx.unit,
    players: ctx.actors.map((a) => ctx.actorId(a)),
    streets,
    heroInvested: round2(ctx.hero.total),
    issues: ctx.issues,
    ok: !errorsExist,
  };
  if (ctx.stakes) hand.stakes = ctx.stakes;
  if (ctx.effectiveStack !== undefined) hand.effectiveStack = ctx.effectiveStack;
  if (ctx.hero.position !== undefined) hand.heroPosition = ctx.hero.position;
  if (ctx.heroCards) hand.heroCards = ctx.heroCards;
  if (result) hand.result = result;
  return hand;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --------------------------------------------------------------------- main

export function parseHand(raw: string): ParsedHand {
  const ctx = new Ctx(raw);
  if (raw.trim().length === 0) {
    ctx.error('Nothing to parse — type a hand first.', 0, raw.length);
    return {
      raw,
      game: 'NLHE',
      unit: 'chips',
      players: [],
      streets: [],
      heroInvested: 0,
      issues: ctx.issues,
      ok: false,
    };
  }

  const phrases = tokenize(raw);

  // pre-scan: any bb-suffixed amount puts the whole hand in bb units
  for (const p of phrases) {
    for (const t of p.tokens) {
      if (t.kind === 'number' && t.bb) ctx.unit = 'bb';
    }
  }

  for (const phrase of phrases) {
    if (phrase.tokens.length === 0) continue;
    const first = phrase.tokens[0]!;

    if (first.kind === 'word' && STREET_WORDS[first.norm] && first.norm !== 'preflop') {
      parseStreetPhrase(ctx, phrase);
      continue;
    }
    if (first.kind === 'word' && first.norm === 'preflop') {
      // "Preflop: ..." label — drop the label, parse the rest as actions
      const rest: Phrase = { tokens: phrase.tokens.slice(1), start: phrase.start, end: phrase.end };
      if (rest.tokens.length > 0) parseActionPhrase(ctx, rest);
      continue;
    }
    if (first.kind === 'word' && first.norm === 'board') {
      parseBoardPhrase(ctx, phrase);
      continue;
    }

    if (!ctx.headerDone) {
      const hasVerbToken = phrase.tokens.some((t) => isVerb(t) !== undefined && !(t.kind === 'word' && t.norm === 'straddle' && phrase.tokens.some((x) => x.kind === 'stakes')));
      if (!hasVerbToken && parseHeaderPhrase(ctx, phrase)) continue;
    }

    parseActionPhrase(ctx, phrase);
  }

  return finalize(ctx);
}

/** "Board Ts9c4c2s2h" — deal 3/4/5 cards across flop/turn/river at once. */
function parseBoardPhrase(ctx: Ctx, phrase: Phrase): void {
  const cards: Card[] = [];
  let span: [number, number] | undefined;
  for (const t of phrase.tokens.slice(1)) {
    const run = parseCardRun(t.text);
    if (run) {
      cards.push(...run);
      span = span ? [span[0], t.end] : [t.start, t.end];
    } else if (!(t.kind === 'word' && (FILLER_WORDS.has(t.norm) || t.norm === 'runs' || t.norm === 'runout'))) {
      ctx.error(`Couldn't read "${t.text}" as board cards.`, t.start, t.end);
      return;
    }
  }
  if (cards.length < 3 || cards.length > 5) {
    ctx.error(`A board is 3 to 5 cards, got ${cards.length}.`, phrase.start, phrase.end);
    return;
  }
  if (span) ctx.registerExactCards(cards, span);
  const chunks: [StreetName, Card[]][] = [['flop', cards.slice(0, 3)]];
  if (cards.length >= 4) chunks.push(['turn', cards.slice(3, 4)]);
  if (cards.length === 5) chunks.push(['river', cards.slice(4, 5)]);
  for (const [name, chunk] of chunks) {
    if (ctx.streets.some((s) => s.name === name)) continue;
    ctx.startStreet(name);
    ctx.street.board = chunk;
  }
}
