/**
 * Rule-based leak detection. Every rule has a minimum sample size —
 * a flag that fires on six hands is noise dressed up as insight, so
 * below the threshold we say nothing at all.
 */

import type { HandAggregates } from './handStats';
import type { Session } from '../db';
import { isFinished, sessionHours, sessionProfit } from './sessionStats';

export interface LeakFlag {
  id: string;
  severity: 'leak' | 'note';
  title: string;
  /** Plain-language explanation with the actual numbers behind it. */
  detail: string;
  sample: string;
}

export function findLeaks(agg: HandAggregates, sessions: Session[]): LeakFlag[] {
  const flags: LeakFlag[] = [];
  const f = agg.facts;

  // 1. Calling 3-bets out of position and losing
  const called3oop = f.filter((x) => x.called3BetOOP);
  const withMoney = called3oop.filter((x) => x.netChips !== undefined);
  if (called3oop.length >= 5 && withMoney.length >= 5) {
    const losers = withMoney.filter((x) => x.netChips! < 0);
    const net = withMoney.reduce((s, x) => s + x.netChips!, 0);
    if (losers.length / withMoney.length >= 0.65 && net < 0) {
      flags.push({
        id: 'call-3bet-oop',
        severity: 'leak',
        title: 'Calling 3-bets out of position',
        detail: `You called a 3-bet out of position ${called3oop.length} times and lost money in ${losers.length} of the ${withMoney.length} with a recorded result, for a total of ${fmt(net)}. Out of position with a capped range, these calls rarely pay — fold more, or 4-bet your strongest hands.`,
        sample: `${withMoney.length} hands`,
      });
    }
  }

  // 2. Loose-passive preflop
  if (agg.hands >= 30 && agg.vpip.pct !== undefined && agg.pfr.pct !== undefined) {
    const gap = agg.vpip.pct - agg.pfr.pct;
    if (agg.vpip.pct > 35 && gap > 18) {
      flags.push({
        id: 'loose-passive',
        severity: 'leak',
        title: 'Playing too many hands passively',
        detail: `You voluntarily played ${agg.vpip.pct.toFixed(0)}% of ${agg.hands} logged hands but raised only ${agg.pfr.pct.toFixed(0)}% — a ${gap.toFixed(0)}-point gap. Wide calling ranges out of position bleed money in live games. Fold the bottom of that range and raise the top.`,
        sample: `${agg.hands} hands`,
      });
    }
  }

  // 3. Too tight (only worth flagging with a lot of data)
  if (agg.hands >= 40 && agg.vpip.pct !== undefined && agg.vpip.pct < 15) {
    flags.push({
      id: 'too-tight',
      severity: 'note',
      title: 'Possibly too tight for live games',
      detail: `You played only ${agg.vpip.pct.toFixed(0)}% of ${agg.hands} logged hands. Live full-ring games are soft enough that a very tight range leaves value on the table — though if you only log interesting hands, this number may just reflect what you choose to write down.`,
      sample: `${agg.hands} hands`,
    });
  }

  // 4. Over-folding to 3-bets
  if (agg.foldTo3Bet.opportunities >= 8 && agg.foldTo3Bet.pct !== undefined && agg.foldTo3Bet.pct > 70) {
    flags.push({
      id: 'overfold-3bet',
      severity: 'leak',
      title: 'Over-folding to 3-bets',
      detail: `You folded to a 3-bet ${agg.foldTo3Bet.count} of ${agg.foldTo3Bet.opportunities} times (${agg.foldTo3Bet.pct.toFixed(0)}%). Observant opponents can 3-bet you with anything. Defend more of your opening range, especially in position.`,
      sample: `${agg.foldTo3Bet.opportunities} 3-bets faced`,
    });
  }

  // 5. Never 3-betting
  if (agg.threeBet.opportunities >= 15 && agg.threeBet.pct !== undefined && agg.threeBet.pct < 3) {
    flags.push({
      id: 'no-3bet',
      severity: 'leak',
      title: 'Almost never 3-betting',
      detail: `You 3-bet ${agg.threeBet.count} of ${agg.threeBet.opportunities} chances (${agg.threeBet.pct.toFixed(1)}%). Flat-calling every open lets the raiser realize their equity cheaply and caps your range. Add your strongest hands, then some blockers.`,
      sample: `${agg.threeBet.opportunities} opportunities`,
    });
  }

  // 6. Giving up after raising preflop
  if (agg.cbet.opportunities >= 10 && agg.cbet.pct !== undefined && agg.cbet.pct < 40) {
    flags.push({
      id: 'low-cbet',
      severity: 'note',
      title: 'Rarely following through on the flop',
      detail: `After raising preflop you continuation-bet only ${agg.cbet.count} of ${agg.cbet.opportunities} flops (${agg.cbet.pct.toFixed(0)}%). Checking back that often makes your raises easy to play against. Many of these boards are profitable small c-bets.`,
      sample: `${agg.cbet.opportunities} flops as the raiser`,
    });
  }

  // 7. Paying off rivers
  const riverCalls = f.filter((x) => x.riverCall && x.hasResult && x.showdown);
  if (riverCalls.length >= 5) {
    const lost = riverCalls.filter((x) => x.riverCallLost);
    if (lost.length / riverCalls.length >= 0.7) {
      flags.push({
        id: 'river-payoff',
        severity: 'leak',
        title: 'Paying off river bets',
        detail: `Of ${riverCalls.length} river calls that went to showdown, you lost ${lost.length} (${((lost.length / riverCalls.length) * 100).toFixed(0)}%). Live players under-bluff rivers; a big river bet is usually exactly what it looks like. Make the disciplined fold.`,
        sample: `${riverCalls.length} river calls`,
      });
    }
  }

  // 8. Limping too much
  if (agg.limpRate.opportunities >= 20 && agg.limpRate.pct !== undefined && agg.limpRate.pct > 40) {
    flags.push({
      id: 'limp-heavy',
      severity: 'note',
      title: 'Limping a lot',
      detail: `${agg.limpRate.count} of the ${agg.limpRate.opportunities} hands you chose to play (${agg.limpRate.pct.toFixed(0)}%) started with a limp. Open-limping surrenders the initiative; raising or folding is almost always better.`,
      sample: `${agg.limpRate.opportunities} hands played`,
    });
  }

  // 9. Fatigue: long sessions lose, short sessions win
  const done = sessions.filter(isFinished);
  const long = done.filter((s) => sessionHours(s) >= 6);
  const short = done.filter((s) => sessionHours(s) < 6);
  if (long.length >= 5 && short.length >= 5) {
    const rate = (list: typeof done) => {
      const hours = list.reduce((s, x) => s + sessionHours(x), 0);
      const profit = list.reduce((s, x) => s + sessionProfit(x), 0);
      return hours > 0 ? profit / hours : 0;
    };
    const longRate = rate(long);
    const shortRate = rate(short);
    if (longRate < 0 && shortRate > 0) {
      flags.push({
        id: 'fatigue',
        severity: 'leak',
        title: 'Long sessions are costing you',
        detail: `In ${short.length} sessions under six hours you made ${fmt(shortRate)}/hr; in ${long.length} sessions of six hours or more you lost ${fmt(Math.abs(longRate))}/hr. The game does not get better after hour six — you get worse. Set a stop time before you sit down.`,
        sample: `${done.length} sessions`,
      });
    }
  }

  return flags;
}

function fmt(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(n))}`;
}
