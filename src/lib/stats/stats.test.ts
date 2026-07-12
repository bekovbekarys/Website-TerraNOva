import { describe, it, expect } from 'vitest';
import { parseHand } from '../parser';
import { factsForHand, aggregateHands } from './handStats';
import { findLeaks } from './leaks';
import {
  summarizeSessions,
  profitSeries,
  byStake,
  byWeekday,
  byLength,
} from './sessionStats';
import { validateExportData, parseExportFile, buildExport } from '../export';
import type { Session } from '../db';

const CANONICAL =
  '1/2 NL, 300 eff. BTN AhKs. UTG opens 15, I 3bet 45, he calls. Flop Jh7d2c, he checks, I cbet 40, he calls. Turn 5s, check check. River Qd, he bets 90, I fold.';

describe('hand facts', () => {
  it('reads vpip / pfr / 3bet / cbet from the canonical hand', () => {
    const f = factsForHand(parseHand(CANONICAL));
    expect(f.vpip).toBe(true);
    expect(f.pfr).toBe(true);
    expect(f.threeBetOpp).toBe(true);
    expect(f.threeBet).toBe(true);
    expect(f.cbetOpp).toBe(true);
    expect(f.cbet).toBe(true);
    expect(f.netChips).toBe(-85);
    expect(f.agg.river.folds).toBe(1);
  });

  it('limp is vpip but not pfr', () => {
    const f = factsForHand(parseHand('1/3. SB A5s. I limp, BB checks. Flop Ah8h3c, I bet 4, he folds.'));
    expect(f.vpip).toBe(true);
    expect(f.pfr).toBe(false);
    expect(f.limped).toBe(true);
  });

  it('big blind check is not vpip', () => {
    const f = factsForHand(parseHand('1/2. BB 7h2c. UTG limps, I check. Flop Ah8h3c, I check, he checks.'));
    expect(f.vpip).toBe(false);
  });

  it('detects folding to a 3bet', () => {
    const f = factsForHand(parseHand('1/2. CO AhQh. I open 10, BTN 3bets 30, I fold.'));
    expect(f.faced3Bet).toBe(true);
    expect(f.foldedTo3Bet).toBe(true);
    expect(f.called3Bet).toBe(false);
  });

  it('detects calling a 3bet out of position', () => {
    const f = factsForHand(
      parseHand('1/2. MP 9h9c. I open 10, BTN 3bets 30, I call. Flop Ah8s2c, I check, he bets 40, I fold.'),
    );
    expect(f.called3Bet).toBe(true);
    expect(f.called3BetOOP).toBe(true);
    expect(f.netChips).toBe(-30);
  });

  it('calling a 3bet in position is not OOP', () => {
    const f = factsForHand(parseHand('1/2. BTN 9h9c. I open 10, SB 3bets 30, I call. Flop Ah8s2c, he bets 40, I fold.'));
    expect(f.called3Bet).toBe(true);
    expect(f.called3BetOOP).toBe(false);
  });

  it('no cbet opportunity when villain donk-bets first', () => {
    const f = factsForHand(
      parseHand('1/2. BTN AhKd. I open 10, BB calls. Flop 8s5h2c, he bets 12, I fold.'),
    );
    expect(f.cbetOpp).toBe(false);
  });

  it('marks river call that lost at showdown', () => {
    const f = factsForHand(
      parseHand(
        '1/2. BTN KhKd. CO opens 10, I call. Flop 9s5h2c, he bets 12, I call. Turn 3d, he bets 30, I call. River Ah, he bets 80, I call. He shows AcQc and wins.',
      ),
    );
    expect(f.riverCall).toBe(true);
    expect(f.riverCallLost).toBe(true);
    expect(f.wentToShowdown).toBe(true);
    expect(f.wonAtShowdown).toBe(false);
  });

  it('converts bb-denominated results to chips when stakes are known', () => {
    const f = factsForHand(
      parseHand('5/10. BTN AhAd. CO opens 3bb, I 3bet 10bb, he folds.'),
    );
    // pot: CO 3bb + hero matched 3bb + 1.5bb dead = 7.5bb; hero net +4.5bb = $45
    expect(f.netChips).toBe(45);
  });
});

describe('aggregates', () => {
  it('computes rates with sample sizes', () => {
    const hands = [
      parseHand(CANONICAL),
      parseHand('1/2. BB 7h2c. UTG limps, I check. Flop Ah8h3c, I check, he checks.'),
      parseHand('1/3. SB A5s. I limp, BB checks. Flop Ah8h3c, I bet 4, he folds.'),
      parseHand('1/2. CO AhQh. I open 10, BTN 3bets 30, I fold.'),
    ];
    const agg = aggregateHands(hands);
    expect(agg.hands).toBe(4);
    expect(agg.vpip.count).toBe(3); // canonical, limp, open — BB check is free
    expect(agg.vpip.pct).toBe(75);
    expect(agg.pfr.count).toBe(2);
    expect(agg.foldTo3Bet.count).toBe(1);
    expect(agg.foldTo3Bet.opportunities).toBe(1);
  });

  it('splits showdown vs non-showdown winnings and excludes unvaluable hands', () => {
    const hands = [
      // non-showdown win +11
      parseHand('1/2. CO AsAd. I open 10, BB calls. Flop 2c2d9h, he checks, I bet 15, he folds.'),
      // showdown loss -22
      parseHand('1/2. CO ThTs. I open 10, BTN calls. Flop Ks8d4c, I bet 12, he calls. Turn 2h, check check. River 6s, check check. He shows KhJh and wins.'),
      // bb hand with no stakes: result exists but can't be valued in chips
      parseHand('BTN AhKs. I open 3bb, BB calls. Flop Kc8s2d, he checks, I bet 4bb, he folds.'),
    ];
    const agg = aggregateHands(hands);
    expect(agg.nonShowdownWinnings).toBe(11);
    expect(agg.showdownWinnings).toBe(-22);
    expect(agg.handsExcludedFromMoney).toBe(1);
    expect(agg.byPosition.CO?.net).toBe(-11);
  });
});

describe('leak flags', () => {
  const losingCall3betOOP =
    '1/2. MP 9h9c. I open 10, BTN 3bets 30, I call. Flop Ah8s2c, I check, he bets 40, I fold.';

  it('stays silent below the minimum sample', () => {
    const hands = Array.from({ length: 4 }, () => parseHand(losingCall3betOOP));
    const flags = findLeaks(aggregateHands(hands), []);
    expect(flags.find((f) => f.id === 'call-3bet-oop')).toBeUndefined();
  });

  it('flags calling 3bets OOP once the sample is big enough', () => {
    const hands = Array.from({ length: 6 }, () => parseHand(losingCall3betOOP));
    const flags = findLeaks(aggregateHands(hands), []);
    const flag = flags.find((f) => f.id === 'call-3bet-oop');
    expect(flag).toBeDefined();
    expect(flag!.detail).toContain('6 times');
  });

  it('flags fatigue when long sessions lose and short ones win', () => {
    const mk = (hours: number, profit: number, i: number): Session => ({
      id: `s${i}`,
      startedAt: 1_700_000_000_000 + i * 86_400_000,
      endedAt: 1_700_000_000_000 + i * 86_400_000 + hours * 3_600_000,
      stakes: '1/2',
      location: 'Test',
      buyIn: 300,
      cashOut: 300 + profit,
    });
    const sessions = [
      ...Array.from({ length: 5 }, (_, i) => mk(3, 150, i)),
      ...Array.from({ length: 5 }, (_, i) => mk(8, -200, i + 10)),
    ];
    const flags = findLeaks(aggregateHands([]), sessions);
    expect(flags.find((f) => f.id === 'fatigue')).toBeDefined();
  });
});

describe('session stats', () => {
  const sessions: Session[] = [
    { id: 'a', startedAt: 0, endedAt: 4 * 3_600_000, stakes: '1/2', location: 'Lucky', buyIn: 300, cashOut: 500 },
    { id: 'b', startedAt: 10 * 3_600_000, endedAt: 12 * 3_600_000, stakes: '2/5', location: 'Lucky', buyIn: 500, cashOut: 400 },
    { id: 'c', startedAt: 20 * 3_600_000, stakes: '1/2', location: 'Home', buyIn: 200 }, // still running
  ];

  it('summarizes finished sessions only', () => {
    const s = summarizeSessions(sessions);
    expect(s.sessions).toBe(2);
    expect(s.totalProfit).toBe(100);
    expect(s.totalHours).toBe(6);
    expect(s.hourly).toBeCloseTo(16.67, 1);
    expect(s.winningSessions).toBe(1);
  });

  it('builds a cumulative profit series', () => {
    const series = profitSeries(sessions);
    expect(series.map((p) => p.cumulative)).toEqual([200, 100]);
  });

  it('groups by stake and by weekday and by length', () => {
    const stakes = byStake(sessions);
    expect(stakes.find((r) => r.key === '1/2')?.profit).toBe(200);
    expect(stakes.find((r) => r.key === '2/5')?.profit).toBe(-100);
    expect(byWeekday(sessions).length).toBeGreaterThan(0);
    const lengths = byLength(sessions);
    expect(lengths.find((r) => r.key === '2–4h')).toBeDefined();
  });
});

describe('export validation', () => {
  it('accepts its own export', () => {
    const sessions: Session[] = [
      { id: 'a', startedAt: 1, endedAt: 2, stakes: '1/2', location: 'X', buyIn: 100, cashOut: 50 },
    ];
    const hands = [{ id: 'h1', sessionId: 'a', loggedAt: 1, parsed: parseHand(CANONICAL) }];
    const result = validateExportData(buildExport(sessions, hands));
    expect(result.ok).toBe(true);
  });

  it('rejects non-JSON with a friendly message', () => {
    const r = parseExportFile('{"app": "felt-notes", truncated');
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/not valid JSON/);
  });

  it('rejects foreign files and wrong versions', () => {
    expect(validateExportData({ app: 'other' }).ok).toBe(false);
    expect(validateExportData({ app: 'felt-notes', version: 9, sessions: [], hands: [] }).ok).toBe(false);
  });

  it('rejects negative buy-ins with a specific error', () => {
    const r = validateExportData({
      app: 'felt-notes',
      version: 1,
      exportedAt: 0,
      sessions: [{ id: 'a', startedAt: 1, stakes: '1/2', location: 'X', buyIn: -100 }],
      hands: [],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /buy-in/.test(e))).toBe(true);
  });

  it('rejects hands pointing at missing sessions and duplicate ids', () => {
    const r = validateExportData({
      app: 'felt-notes',
      version: 1,
      exportedAt: 0,
      sessions: [],
      hands: [
        { id: 'h1', sessionId: 'ghost', loggedAt: 1, parsed: parseHand(CANONICAL) },
        { id: 'h1', loggedAt: 1, parsed: parseHand(CANONICAL) },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /isn't in this file/.test(e))).toBe(true);
    expect(r.errors.some((e) => /Duplicate hand id/.test(e))).toBe(true);
  });
});
