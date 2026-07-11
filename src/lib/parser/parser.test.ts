import { describe, it, expect } from 'vitest';
import { parseHand } from './index';
import { holeCardsToString, cardToString } from './cards';
import type { ParsedHand, StreetName } from './types';

function street(h: ParsedHand, name: StreetName) {
  const s = h.streets.find((s) => s.street === name);
  expect(s, `expected street ${name}`).toBeDefined();
  return s!;
}

function board(h: ParsedHand, name: StreetName): string {
  return street(h, name).board.map(cardToString).join('');
}

function errors(h: ParsedHand) {
  return h.issues.filter((i) => i.severity === 'error');
}

function warnings(h: ParsedHand) {
  return h.issues.filter((i) => i.severity === 'warning');
}

describe('parser: the canonical example', () => {
  const input =
    '1/2 NL, 300 eff. BTN AhKs. UTG opens 15, I 3bet 45, he calls. Flop Jh7d2c, he checks, I cbet 40, he calls. Turn 5s, check check. River Qd, he bets 90, I fold.';
  const h = parseHand(input);

  it('parses cleanly', () => {
    expect(errors(h)).toEqual([]);
    expect(h.ok).toBe(true);
  });
  it('reads stakes, game, effective stack', () => {
    expect(h.stakes).toEqual({ sb: 1, bb: 2 });
    expect(h.game).toBe('NLHE');
    expect(h.effectiveStack).toBe(300);
    expect(h.unit).toBe('chips');
  });
  it('reads hero position and cards', () => {
    expect(h.heroPosition).toBe('BTN');
    expect(h.heroCards && holeCardsToString(h.heroCards)).toBe('AhKs');
  });
  it('structures all four streets with boards', () => {
    expect(h.streets.map((s) => s.street)).toEqual(['preflop', 'flop', 'turn', 'river']);
    expect(board(h, 'flop')).toBe('Jh7d2c');
    expect(board(h, 'turn')).toBe('5s');
    expect(board(h, 'river')).toBe('Qd');
  });
  it('computes pots per street (dead blinds included)', () => {
    expect(street(h, 'preflop').potAfter).toBe(93); // 45+45 + 1+2 dead
    expect(street(h, 'flop').potAfter).toBe(173); // +40+40
    expect(street(h, 'turn').potAfter).toBe(173); // check-check
    expect(street(h, 'river').potAfter).toBe(173); // villain's 90 uncalled, refunded
  });
  it('records actions in order', () => {
    const pf = street(h, 'preflop').actions;
    expect(pf.map((a) => `${a.actor}:${a.type}${a.to ?? ''}`)).toEqual([
      'UTG:raise15',
      'HERO:raise45',
      'UTG:call45',
    ]);
    const turn = street(h, 'turn').actions;
    expect(turn.every((a) => a.type === 'check')).toBe(true);
    expect(turn).toHaveLength(2);
  });
  it('resolves the fold: villain wins, hero net is -85', () => {
    expect(h.result?.winners).toEqual(['UTG']);
    expect(h.result?.showdown).toBe(false);
    expect(h.result?.pot).toBe(173);
    expect(h.result?.heroNet).toBe(-85);
    expect(h.heroInvested).toBe(85);
  });
});

describe('parser: preflop variations', () => {
  it('limped pot from the small blind', () => {
    const h = parseHand('1/3. SB A5s. I limp, BB checks. Flop Ah8h3c, I bet 4, he folds.');
    expect(errors(h)).toEqual([]);
    expect(h.heroCards && holeCardsToString(h.heroCards)).toBe('A5s');
    expect(street(h, 'preflop').potAfter).toBe(6); // SB completes to 3, BB 3
    expect(h.result?.winners).toEqual(['HERO']);
    expect(h.result?.heroNet).toBe(3); // wins BB's 3
  });

  it('limp behind, multiway, check it down', () => {
    const h = parseHand(
      '1/2. BTN 7c6c. UTG limps, I limp, SB calls, BB checks. Flop Kh9d4s, check check check check.',
    );
    expect(errors(h)).toEqual([]);
    expect(street(h, 'preflop').potAfter).toBe(8);
    expect(street(h, 'flop').actions).toHaveLength(4);
  });

  it('straddled stakes as third number contribute dead money', () => {
    const h = parseHand('1/2/5. HJ TdTh. I raise to 20, BTN calls.');
    expect(errors(h)).toEqual([]);
    expect(h.stakes).toEqual({ sb: 1, bb: 2, straddle: 5 });
    expect(street(h, 'preflop').potAfter).toBe(48); // 20+20 + 1+2+5 dead
  });

  it('straddle as an action, then action reopens to the straddler', () => {
    const h = parseHand('1/2. CO AdQd. BTN straddles to 5, I raise to 20, he calls.');
    expect(errors(h)).toEqual([]);
    const pf = street(h, 'preflop');
    expect(pf.actions[0]).toMatchObject({ actor: 'BTN', type: 'straddle', to: 5 });
    expect(pf.potAfter).toBe(43); // 20+20 + 1+2 dead
  });

  it('folds to me is understood as no action', () => {
    const h = parseHand('1/2. BTN AhQh. Folds to me, I raise to 7, SB calls, BB folds.');
    expect(errors(h)).toEqual([]);
    expect(street(h, 'preflop').potAfter).toBe(16); // 7+7 + BB's dead 2
  });

  it('cold 4bet line', () => {
    const h = parseHand('2/5. BTN KsKh. UTG opens 15, CO 3bets 50, I 4bet to 130, both fold.');
    expect(errors(h)).toEqual([]);
    expect(h.result?.winners).toEqual(['HERO']);
    // hero's 130 is uncalled beyond CO's 50 and refunded; the awarded pot is
    // UTG 15 + CO 50 + hero's matched 50 + blinds 7 = 122, of which 50 was hero's
    expect(h.result?.pot).toBe(122);
    expect(h.result?.heroNet).toBe(72);
  });
});

describe('parser: amounts in different notations', () => {
  it('dollar signs on stakes and amounts', () => {
    const h = parseHand('$1/$3. BTN JhJs. UTG limps, I raise to $15, UTG calls.');
    expect(errors(h)).toEqual([]);
    expect(h.stakes).toEqual({ sb: 1, bb: 3 });
    expect(street(h, 'preflop').potAfter).toBe(34); // 15+15 + 1+3 dead
  });

  it('bb-denominated hand switches the unit to bb', () => {
    const h = parseHand(
      '5/10, 100bb eff. CO AhAc. I open 2.5bb, BTN calls. Flop Kd8d3c, I bet 4bb, he raises to 12bb, I call.',
    );
    expect(errors(h)).toEqual([]);
    expect(h.unit).toBe('bb');
    expect(h.effectiveStack).toBe(100);
    expect(street(h, 'preflop').potAfter).toBeCloseTo(6.5); // 2.5+2.5+1.5 dead
    expect(street(h, 'flop').potAfter).toBeCloseTo(30.5);
  });

  it('decimal and k-suffixed amounts', () => {
    const h = parseHand('5/5, 2k eff. BB 8h8s. BTN opens 12.5, I call.');
    expect(errors(h)).toEqual([]);
    expect(h.effectiveStack).toBe(2000);
    expect(street(h, 'preflop').potAfter).toBe(30); // 12.5+12.5+5 dead sb
  });

  it('plain, $, and bb amounts in one corpus parse to numbers', () => {
    for (const amt of ['15', '$15', '7.5']) {
      const h = parseHand(`1/2. BTN AhKh. I raise to ${amt}, BB calls.`);
      expect(errors(h)).toEqual([]);
      const raise = street(h, 'preflop').actions.find((a) => a.type === 'raise');
      expect(raise?.to).toBe(amt === '7.5' ? 7.5 : 15);
    }
  });
});

describe('parser: hole card notations', () => {
  it('AKs-style abstract notation', () => {
    const h = parseHand('1/2. CO AKs. I open 10, BB calls.');
    expect(errors(h)).toEqual([]);
    expect(h.heroCards).toEqual({ kind: 'abstract', ranks: [14, 13], suited: 'suited' });
  });
  it('offsuit and pair shorthand', () => {
    expect(parseHand('1/2. CO AJo. I open 10, BB calls.').heroCards).toEqual({
      kind: 'abstract',
      ranks: [14, 11],
      suited: 'offsuit',
    });
    expect(parseHand('1/2. CO QQ. I open 10, BB calls.').heroCards).toEqual({
      kind: 'abstract',
      ranks: [12, 12],
      suited: 'any',
    });
  });
  it('exact cards with space: "Ah Ks"', () => {
    const h = parseHand('1/2. BTN Ah Ks. I open 10, BB calls.');
    expect(errors(h)).toEqual([]);
    expect(h.heroCards && holeCardsToString(h.heroCards)).toBe('AhKs');
  });
  it('cards given via "with"', () => {
    const h = parseHand('1/2. UTG opens 10, I call in the BB with 6h6s. Flop 9c6d2d, he bets 15, I raise to 45, he folds.');
    expect(errors(h)).toEqual([]);
    expect(h.heroPosition).toBe('BB');
    expect(h.heroCards && holeCardsToString(h.heroCards)).toBe('6h6s');
    expect(h.result?.winners).toEqual(['HERO']);
  });
  it('ten written as T or 10', () => {
    const h = parseHand('1/2. BTN 10h9h. I open 10, BB calls.');
    expect(h.heroCards && holeCardsToString(h.heroCards)).toBe('Th9h');
  });
});

describe('parser: multiway pots', () => {
  it('three-way with positions as actors', () => {
    const h = parseHand(
      '2/5. BTN 9s8s. UTG opens 20, MP calls, I call. Flop 7s6s2d, UTG bets 30, MP folds, I raise to 100, UTG folds.',
    );
    expect(errors(h)).toEqual([]);
    expect(h.players).toEqual(expect.arrayContaining(['UTG', 'MP', 'HERO']));
    expect(street(h, 'preflop').potAfter).toBe(67); // 3x20 + 7 dead
    expect(h.result?.winners).toEqual(['HERO']);
    expect(h.result?.pot).toBe(127); // 67 + 30 + hero's matched 30
    expect(h.result?.heroNet).toBe(77); // 127 - 50 invested
  });

  it('four-way family pot', () => {
    const h = parseHand(
      '1/2. BB 5d4d. UTG limps, HJ limps, BTN limps, I check. Flop 3c2s6h, I bet 5, UTG calls, HJ folds, BTN calls.',
    );
    expect(errors(h)).toEqual([]);
    expect(street(h, 'preflop').potAfter).toBe(9); // 4x2 + 1 dead sb
    expect(street(h, 'flop').potAfter).toBe(24);
  });

  it('ambiguous pronoun in multiway resolves to last aggressor with a warning', () => {
    const h = parseHand(
      '1/2. BB QcJc. UTG opens 10, CO calls, I call. Flop Jd8s3h, I check, he bets 20, I call.',
    );
    expect(errors(h)).toEqual([]);
    const flopBet = street(h, 'flop').actions.find((a) => a.type === 'bet');
    expect(flopBet?.actor).toBe('UTG'); // last preflop aggressor
    expect(warnings(h).some((w) => /ambiguous/i.test(w.message))).toBe(true);
  });
});

describe('parser: all-ins', () => {
  it('jam and call, showdown declared', () => {
    const h = parseHand(
      '1/2, 200 eff. BB QhQd. CO opens 6, I 3bet 25, he jams 200, I call. He shows AhKs. Flop Ts9c4c. Turn 2s. River 2h. I win.',
    );
    expect(errors(h)).toEqual([]);
    const jam = street(h, 'preflop').actions.find((a) => a.actor === 'CO' && a.allIn);
    expect(jam).toMatchObject({ type: 'raise', to: 200 });
    expect(h.result?.showdown).toBe(true);
    expect(h.result?.shown?.['CO'] && holeCardsToString(h.result.shown['CO'])).toBe('AhKs');
    expect(h.result?.pot).toBe(401); // 200+200 + 1 dead sb
    expect(h.result?.heroNet).toBe(201);
  });

  it('shove with no amount uses effective stack', () => {
    const h = parseHand('1/2, 150 eff. BTN AcAs. CO opens 10, I 3bet 35, he shoves, I call. He shows KcKd. I win.');
    expect(errors(h)).toEqual([]);
    expect(street(h, 'preflop').potAfter).toBe(303); // 150+150+3 dead
    expect(h.result?.heroNet).toBe(153);
  });

  it('shove with no amount and no effective stack still parses with a warning', () => {
    const h = parseHand('1/2. BTN AcAs. CO jams, I call.');
    expect(errors(h)).toEqual([]);
    expect(warnings(h).some((w) => /all.?in|stack/i.test(w.message))).toBe(true);
  });

  it('calling off all in', () => {
    const h = parseHand('1/2, 80 eff. SB 7s7h. BTN opens 6, I jam 80, he calls. He shows AdKd. Flop 2c2d5h. Turn 9s. River Jc. I win.');
    expect(errors(h)).toEqual([]);
    expect(h.result?.pot).toBe(162); // 80+80+2 dead bb
    expect(h.result?.heroNet).toBe(82);
  });
});

describe('parser: results and showdowns', () => {
  it('chopped pot splits the money', () => {
    const h = parseHand(
      '1/2. BTN AcKd. I open 10, BB calls. Flop AhQh2s, he checks, I check. Turn 7c, he bets 15, I call. River 8d, check check. He shows AsKh, chop.',
    );
    expect(errors(h)).toEqual([]);
    expect(h.result?.winners.sort()).toEqual(['BB', 'HERO']);
    expect(h.result?.pot).toBe(51); // 21 preflop + 30 turn
    expect(h.result?.heroNet).toBeCloseTo(0.5); // 25.5 - 25
  });

  it('villain shows and wins', () => {
    const h = parseHand(
      '1/2. CO ThTs. I open 10, BTN calls. Flop Ks8d4c, I bet 12, he calls. Turn 2h, check check. River 6s, check check. He shows KhJh and wins.',
    );
    expect(errors(h)).toEqual([]);
    expect(h.result?.winners).toEqual(['BTN']);
    expect(h.result?.showdown).toBe(true);
    expect(h.result?.heroNet).toBe(-22);
  });

  it('villain mucks, hero wins', () => {
    const h = parseHand(
      '1/2. BTN 8c8d. CO opens 10, I call. Flop 8s5h2d, he bets 15, I raise to 45, he calls. Turn Kc, he checks, I bet 90, he calls. River 3c, he checks, I check. He mucks, I win.',
    );
    expect(errors(h)).toEqual([]);
    expect(h.result?.winners).toEqual(['HERO']);
    expect(h.result?.pot).toBe(293); // 23 + 90 + 180
    expect(h.result?.heroNet).toBe(148);
  });

  it('explicit pot amount is respected', () => {
    const h = parseHand('1/2. BTN AhAd. I open 10, BB calls. Flop 2c2d2h, he checks, I bet 10, he calls. I win 41.');
    expect(errors(h)).toEqual([]);
    expect(h.result?.pot).toBe(41);
    expect(h.result?.heroNet).toBe(21); // 41 - 20 invested
  });

  it('no result given leaves result undefined with a warning', () => {
    const h = parseHand('1/2. BTN KhQh. I open 10, BB calls. Flop Kc8s2d, he checks, I bet 12, he calls.');
    expect(errors(h)).toEqual([]);
    expect(h.result).toBeUndefined();
    expect(warnings(h).some((w) => /result|outcome/i.test(w.message))).toBe(true);
  });
});

describe('parser: tolerated casual phrasing', () => {
  it('makes it / flats / takes it down', () => {
    const h = parseHand('1/2. HJ AsQs. MP limps, I make it 12, MP flats. Flop Qd7c2h, he checks, I bet 15, he folds and I take it down.');
    expect(errors(h)).toEqual([]);
    expect(h.result?.winners).toEqual(['HERO']);
  });

  it('x/x means check-check', () => {
    const h = parseHand('1/2. BTN 5c5d. CO opens 8, I call. Flop Ac8c2s, x/x. Turn 5h, he bets 12, I raise to 40, he folds.');
    expect(errors(h)).toEqual([]);
    expect(street(h, 'flop').actions.map((a) => a.type)).toEqual(['check', 'check']);
    expect(h.result?.winners).toEqual(['HERO']);
  });

  it('donks / leads / barrels are bets', () => {
    const h = parseHand('1/2. BTN AdJd. CO opens 10, I call. Flop Jc8h3s, he leads 15, I call. Turn 4d, he barrels 40, I call. River 9s, he checks, I bet 60, he folds.');
    expect(errors(h)).toEqual([]);
    expect(street(h, 'flop').actions[0]?.type).toBe('bet');
    expect(street(h, 'turn').actions[0]?.type).toBe('bet');
  });

  it('villain as a named actor', () => {
    const h = parseHand('1/2. BB 6h6s. Villain opens 10 from CO, I call. Flop 6d4c2c, I check, villain bets 12, I raise to 36, villain folds.');
    expect(errors(h)).toEqual([]);
    expect(h.result?.winners).toEqual(['HERO']);
  });

  it('bets pot resolves to the current pot size', () => {
    const h = parseHand('1/2. BTN TsTd. CO opens 10, I call. Flop 9h6c2d, he bets pot, I call.');
    expect(errors(h)).toEqual([]);
    const bet = street(h, 'flop').actions.find((a) => a.type === 'bet');
    expect(bet?.to).toBe(23);
  });

  it('UTG+1 position parses', () => {
    const h = parseHand('1/3. UTG+1 opens 15, I call BTN with KcQc. Flop Qh8s3d, he bets 20, I call.');
    expect(errors(h)).toEqual([]);
    expect(h.players).toContain('UTG1');
    expect(h.heroPosition).toBe('BTN');
  });
});

describe('parser: rejects impossible hands with specific errors', () => {
  it('duplicate hero cards', () => {
    const h = parseHand('1/2. BTN AhAh. I open 10, BB calls.');
    expect(h.ok).toBe(false);
    expect(errors(h).some((e) => /duplicate|twice|same card/i.test(e.message))).toBe(true);
  });

  it('board card duplicating a hero card, with span pointing at the board', () => {
    const input = '1/2. BB AsKs. BTN opens 10, I call. Flop AsKc2d, I check, he bets 15, I call.';
    const h = parseHand(input);
    expect(h.ok).toBe(false);
    const err = errors(h).find((e) => /As/.test(e.message));
    expect(err).toBeDefined();
    expect(input.slice(err!.start, err!.end)).toContain('As');
  });

  it('five identical aces is impossible', () => {
    const h = parseHand('1/2. BTN AhAd. I open 10, BB calls. Flop AhAdAc, he checks, I bet 10.');
    expect(h.ok).toBe(false);
  });

  it('check when facing a bet is a misordered action', () => {
    const input = '1/2. BB 9c9d. CO opens 10, I call. Flop Js8c2h, I check, he bets 15, I check.';
    const h = parseHand(input);
    expect(h.ok).toBe(false);
    const err = errors(h).find((e) => /check.*facing|facing.*bet/i.test(e.message));
    expect(err).toBeDefined();
    // span covers the second "I check"
    expect(input.slice(err!.start, err!.end)).toMatch(/I check/);
  });

  it('acting after folding is an error', () => {
    const h = parseHand('1/2. BTN QsJs. UTG opens 10, I fold, I call.');
    expect(h.ok).toBe(false);
    expect(errors(h).some((e) => /folded/i.test(e.message))).toBe(true);
  });

  it('raise below the current bet is an error', () => {
    const h = parseHand('1/2. BTN KdKc. UTG opens 20, I raise to 15.');
    expect(h.ok).toBe(false);
    expect(errors(h).some((e) => /below|smaller|less than/i.test(e.message))).toBe(true);
  });

  it('turn with three cards is an error', () => {
    const h = parseHand('1/2. BTN 7h7c. CO opens 10, I call. Flop 9s5d2c, x/x. Turn AhKhQh, he bets 20.');
    expect(h.ok).toBe(false);
  });
});

describe('parser: unparseable fragments are isolated, not fatal to the rest', () => {
  it('gibberish inside a street keeps other streets intact and points at the fragment', () => {
    const input = '1/2. BTN Th9h. UTG opens 15, I call. Flop qqqzzz nonsense, he bets 20, I call. Turn 8h, he checks, I check.';
    const h = parseHand(input);
    expect(h.ok).toBe(false);
    const err = errors(h)[0];
    expect(err).toBeDefined();
    expect(input.slice(err!.start, err!.end)).toContain('qqqzzz');
    // the rest still parsed
    expect(street(h, 'preflop').actions).toHaveLength(2);
    expect(board(h, 'turn')).toBe('8h');
  });

  it('an unknown phrase mid-action is flagged with its exact span', () => {
    const input = '1/2. BTN AhKh. UTG opens 10, wibble wobble 33, I call.';
    const h = parseHand(input);
    const err = errors(h).find((e) => input.slice(e.start, e.end).includes('wibble'));
    expect(err).toBeDefined();
    // surrounding actions unaffected
    const pf = street(h, 'preflop').actions;
    expect(pf.some((a) => a.actor === 'UTG' && a.type === 'raise')).toBe(true);
    expect(pf.some((a) => a.actor === 'HERO' && a.type === 'call')).toBe(true);
  });

  it('empty input is an error, not a crash', () => {
    const h = parseHand('   ');
    expect(h.ok).toBe(false);
    expect(errors(h)).toHaveLength(1);
  });

  it('input with no recognizable actions reports one clear error', () => {
    const h = parseHand('the weather was nice and the dealer was slow');
    expect(h.ok).toBe(false);
  });
});

describe('parser: missing information is tolerated with warnings', () => {
  it('no stakes: pot omits dead blinds and warns', () => {
    const h = parseHand('BTN AhKs. I open 15, BB calls. Flop Kc8s2d, he checks, I bet 20, he folds.');
    expect(errors(h)).toEqual([]);
    expect(h.stakes).toBeUndefined();
    expect(street(h, 'preflop').potAfter).toBe(30);
    expect(warnings(h).some((w) => /stakes/i.test(w.message))).toBe(true);
    expect(h.result?.heroNet).toBe(15);
  });

  it('no hero cards still tracks the hand', () => {
    const h = parseHand('1/2. I open 12 from CO, BTN calls. Flop Ah7d2c, I bet 15, he folds.');
    expect(errors(h)).toEqual([]);
    expect(h.heroCards).toBeUndefined();
    expect(h.heroPosition).toBe('CO');
    expect(h.result?.winners).toEqual(['HERO']);
  });

  it('bet with no amount warns and keeps the pot approximate', () => {
    const h = parseHand('1/2. BB JcJd. BTN opens 10, I call. Flop 8s4h2c, I check, he bets, I fold.');
    expect(errors(h)).toEqual([]);
    expect(warnings(h).some((w) => /size|amount/i.test(w.message))).toBe(true);
    expect(h.result?.winners).toEqual(['BTN']);
    expect(h.result?.heroNet).toBe(-10);
  });
});

describe('parser: hero identity and positions', () => {
  it('hero referenced as "hero"', () => {
    const h = parseHand('1/2. Hero opens 10 in CO with AhQc, BB calls. Flop Qs7s2h, he checks, hero bets 12, he folds.');
    expect(errors(h)).toEqual([]);
    expect(h.heroPosition).toBe('CO');
    expect(h.result?.winners).toEqual(['HERO']);
  });

  it('pronoun with no prior villain creates one', () => {
    const h = parseHand('1/2. BB 9h8h. He opens 10 on the BTN, I call. Flop 7c6s2d, I check, he bets 12, I call.');
    expect(errors(h)).toEqual([]);
    expect(h.players).toContain('BTN');
  });

  it('the same position mentioned twice is the same actor', () => {
    const h = parseHand('1/2. BB AdTd. CO opens 10, I call. Flop Tc9c4h, I check, CO bets 15, I call. Turn 2s, I check, CO checks.');
    expect(errors(h)).toEqual([]);
    expect(h.players.filter((p) => p === 'CO')).toHaveLength(1);
  });
});
