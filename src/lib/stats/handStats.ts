/**
 * Honest statistics from parsed hands. Every rate is reported with its
 * sample size, and money aggregates only include hands whose result can
 * actually be valued in chips (bb-denominated hands are converted when
 * stakes are known, otherwise excluded and counted as such).
 */

import type { ParsedHand, Position, StreetName } from '../parser';

/** Postflop acting order, first-to-act first. Used for in/out of position. */
const SEAT_ORDER: Position[] = ['SB', 'BB', 'ST', 'UTG', 'UTG1', 'UTG2', 'LJ', 'MP', 'HJ', 'CO', 'BTN'];

export function seatIndex(pos: Position | undefined): number {
  if (!pos) return -1;
  return SEAT_ORDER.indexOf(pos);
}

export interface HandFacts {
  vpip: boolean;
  pfr: boolean;
  limped: boolean;
  threeBetOpp: boolean;
  threeBet: boolean;
  faced3Bet: boolean;
  foldedTo3Bet: boolean;
  called3Bet: boolean;
  called3BetOOP: boolean;
  cbetOpp: boolean;
  cbet: boolean;
  /** Hero action counts per street. */
  agg: Record<StreetName, { bets: number; raises: number; calls: number; checks: number; folds: number }>;
  wentToShowdown: boolean;
  wonAtShowdown: boolean;
  showdown: boolean | undefined;
  riverCall: boolean;
  riverCallLost: boolean;
  /** Hero net in chips, when computable. */
  netChips: number | undefined;
  hasResult: boolean;
  position: Position | undefined;
}

export function factsForHand(hand: ParsedHand): HandFacts {
  const facts: HandFacts = {
    vpip: false,
    pfr: false,
    limped: false,
    threeBetOpp: false,
    threeBet: false,
    faced3Bet: false,
    foldedTo3Bet: false,
    called3Bet: false,
    called3BetOOP: false,
    cbetOpp: false,
    cbet: false,
    agg: {
      preflop: { bets: 0, raises: 0, calls: 0, checks: 0, folds: 0 },
      flop: { bets: 0, raises: 0, calls: 0, checks: 0, folds: 0 },
      turn: { bets: 0, raises: 0, calls: 0, checks: 0, folds: 0 },
      river: { bets: 0, raises: 0, calls: 0, checks: 0, folds: 0 },
    },
    wentToShowdown: false,
    wonAtShowdown: false,
    showdown: undefined,
    riverCall: false,
    riverCallLost: false,
    netChips: undefined,
    hasResult: hand.result !== undefined,
    position: hand.heroPosition,
  };

  const preflop = hand.streets.find((s) => s.street === 'preflop');
  let lastPreflopAggressor: string | undefined;
  if (preflop) {
    let raiseCount = 0;
    let heroActed = false;
    let heroRaiseAt = -1; // raise count level of hero's last raise
    let facedReRaise = false;
    let reRaiser: string | undefined;
    for (const a of preflop.actions) {
      const isHero = a.actor === 'HERO';
      if (a.type === 'raise') {
        raiseCount += 1;
        lastPreflopAggressor = a.actor;
      }
      if (isHero) {
        if (a.type === 'limp' || a.type === 'call' || a.type === 'raise' || a.type === 'bet') facts.vpip = true;
        if (a.type === 'raise') facts.pfr = true;
        if (a.type === 'limp') facts.limped = true;
        if (!heroActed && (a.type === 'limp' || a.type === 'call' || a.type === 'raise' || a.type === 'fold' || a.type === 'check' || a.type === 'bet')) {
          heroActed = true;
          if (raiseCount === 1 && a.type !== 'raise') facts.threeBetOpp = true;
          if (a.type === 'raise' && raiseCount === 2) {
            facts.threeBetOpp = true;
            facts.threeBet = true;
          }
        }
        if (facedReRaise) {
          // hero's response to being 3bet (or 4bet)
          facts.faced3Bet = true;
          if (a.type === 'fold') facts.foldedTo3Bet = true;
          if (a.type === 'call') {
            facts.called3Bet = true;
            const heroSeat = seatIndex(hand.heroPosition);
            const villSeat = seatIndex(reRaiser as Position);
            if (heroSeat !== -1 && villSeat !== -1 && heroSeat < villSeat) {
              facts.called3BetOOP = true;
            }
          }
          facedReRaise = false;
        }
        if (a.type === 'raise') heroRaiseAt = raiseCount;
      } else if (a.type === 'raise' && heroRaiseAt > 0 && raiseCount === heroRaiseAt + 1) {
        facedReRaise = true;
        reRaiser = a.actor;
      }
    }
  }

  // c-bet: hero was the last preflop aggressor and gets the first crack at the flop
  const flop = hand.streets.find((s) => s.street === 'flop');
  if (flop && lastPreflopAggressor === 'HERO') {
    let priorBet = false;
    for (const a of flop.actions) {
      if (a.actor === 'HERO') {
        if (!priorBet) {
          facts.cbetOpp = true;
          facts.cbet = a.type === 'bet';
        }
        break;
      }
      if (a.type === 'bet' || a.type === 'raise') {
        priorBet = true;
      }
    }
  }

  // aggression + river calls
  let heroFolded = false;
  for (const street of hand.streets) {
    const bucket = facts.agg[street.street];
    for (const a of street.actions) {
      if (a.actor !== 'HERO') continue;
      if (a.type === 'bet') bucket.bets += 1;
      else if (a.type === 'raise') bucket.raises += 1;
      else if (a.type === 'call' || a.type === 'limp') bucket.calls += 1;
      else if (a.type === 'check') bucket.checks += 1;
      else if (a.type === 'fold') {
        bucket.folds += 1;
        heroFolded = true;
      }
      if (street.street === 'river' && a.type === 'call') facts.riverCall = true;
    }
  }

  if (hand.result) {
    facts.showdown = hand.result.showdown;
    if (hand.result.showdown && !heroFolded) {
      facts.wentToShowdown = true;
      facts.wonAtShowdown = hand.result.winners.includes('HERO');
    }
    if (facts.riverCall && hand.result.showdown && !hand.result.winners.includes('HERO')) {
      facts.riverCallLost = true;
    }
    const net = hand.result.heroNet;
    if (net !== undefined) {
      if (hand.unit === 'chips') facts.netChips = net;
      else if (hand.stakes) facts.netChips = net * hand.stakes.bb;
    }
  }

  return facts;
}

export interface Rate {
  count: number;
  opportunities: number;
  /** Percentage 0..100, or undefined when there were no opportunities. */
  pct: number | undefined;
}

function rate(count: number, opportunities: number): Rate {
  return {
    count,
    opportunities,
    pct: opportunities > 0 ? (count / opportunities) * 100 : undefined,
  };
}

export interface HandAggregates {
  hands: number;
  vpip: Rate;
  pfr: Rate;
  threeBet: Rate;
  foldTo3Bet: Rate;
  cbet: Rate;
  limpRate: Rate;
  /** Aggression frequency % per street: (bets+raises) / all hero actions. */
  afq: Record<Exclude<StreetName, 'preflop'>, Rate>;
  wentToShowdown: Rate;
  wonAtShowdown: Rate;
  /** Money split, chips only. */
  showdownWinnings: number;
  nonShowdownWinnings: number;
  handsWithMoney: number;
  handsExcludedFromMoney: number;
  byPosition: Partial<Record<Position, { hands: number; net: number; handsWithMoney: number }>>;
  facts: HandFacts[];
}

export function aggregateHands(hands: ParsedHand[]): HandAggregates {
  const facts = hands.map(factsForHand);
  const n = facts.length;

  const count = (f: (x: HandFacts) => boolean) => facts.filter(f).length;

  const threeBetOpps = count((f) => f.threeBetOpp);
  const faced3 = count((f) => f.faced3Bet);
  const cbetOpps = count((f) => f.cbetOpp);
  const vpipHands = count((f) => f.vpip);

  const afq = (street: Exclude<StreetName, 'preflop'>): Rate => {
    let aggressive = 0;
    let total = 0;
    for (const f of facts) {
      const b = f.agg[street];
      aggressive += b.bets + b.raises;
      total += b.bets + b.raises + b.calls + b.checks + b.folds;
    }
    return rate(aggressive, total);
  };

  let showdownWinnings = 0;
  let nonShowdownWinnings = 0;
  let handsWithMoney = 0;
  let handsWithResult = 0;
  const byPosition: HandAggregates['byPosition'] = {};

  for (const f of facts) {
    if (f.hasResult) handsWithResult += 1;
    if (f.position) {
      const slot = (byPosition[f.position] ??= { hands: 0, net: 0, handsWithMoney: 0 });
      slot.hands += 1;
      if (f.netChips !== undefined) {
        slot.net += f.netChips;
        slot.handsWithMoney += 1;
      }
    }
    if (f.netChips === undefined) continue;
    handsWithMoney += 1;
    if (f.showdown) showdownWinnings += f.netChips;
    else nonShowdownWinnings += f.netChips;
  }

  const sawShowdownOpp = count((f) => f.hasResult);

  return {
    hands: n,
    vpip: rate(vpipHands, n),
    pfr: rate(count((f) => f.pfr), n),
    threeBet: rate(count((f) => f.threeBet), threeBetOpps),
    foldTo3Bet: rate(count((f) => f.foldedTo3Bet), faced3),
    cbet: rate(count((f) => f.cbet), cbetOpps),
    limpRate: rate(count((f) => f.limped), vpipHands),
    afq: { flop: afq('flop'), turn: afq('turn'), river: afq('river') },
    wentToShowdown: rate(count((f) => f.wentToShowdown), sawShowdownOpp),
    wonAtShowdown: rate(count((f) => f.wonAtShowdown), count((f) => f.wentToShowdown)),
    showdownWinnings,
    nonShowdownWinnings,
    handsWithMoney,
    handsExcludedFromMoney: handsWithResult - handsWithMoney,
    byPosition,
    facts,
  };
}
