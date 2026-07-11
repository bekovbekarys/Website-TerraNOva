import { describe, it, expect } from 'vitest';
import { evaluate7, cardFromString, scoreCategory } from './evaluator';
import { parseRange } from './range';
import { equityVsRange } from './montecarlo';
import type { Combo } from './range';

function cards(spec: string): number[] {
  return spec.split(/\s+/).map((s) => {
    const c = cardFromString(s);
    if (c < 0) throw new Error(`bad card ${s}`);
    return c;
  });
}

function ev(spec: string): number {
  return evaluate7(cards(spec));
}

describe('evaluator: hand categories', () => {
  it('identifies each category', () => {
    expect(scoreCategory(ev('Ah Kh Qh Jh Th 2c 3d'))).toBe(8); // royal
    expect(scoreCategory(ev('5h 4h 3h 2h Ah Kc Qd'))).toBe(8); // steel wheel
    expect(scoreCategory(ev('As Ah Ad Ac Kh 2c 3d'))).toBe(7); // quads
    expect(scoreCategory(ev('As Ah Ad Kc Kh 2c 3d'))).toBe(6); // boat
    expect(scoreCategory(ev('Ah Jh 8h 5h 2h Kc Qd'))).toBe(5); // flush
    expect(scoreCategory(ev('9s 8h 7d 6c 5h Ac Ad'))).toBe(4); // straight
    expect(scoreCategory(ev('As Ah Ad Kc Qh 2c 3d'))).toBe(3); // trips
    expect(scoreCategory(ev('As Ah Kd Kc Qh 2c 3d'))).toBe(2); // two pair
    expect(scoreCategory(ev('As Ah Kd Qc Jh 2c 3d'))).toBe(1); // pair
    expect(scoreCategory(ev('As Kh Qd Jc 9h 2c 3d'))).toBe(0); // high card
  });

  it('wheel straight loses to six-high straight', () => {
    expect(ev('5h 4d 3s 2c Ah Kc Kd')).toBeLessThan(ev('6h 5d 4s 3c 2h Kc Kd'));
  });

  it('flush beats straight; boat beats flush', () => {
    expect(ev('Ah Jh 8h 5h 2h Kc Qd')).toBeGreaterThan(ev('9s 8h 7d 6c 5h Ac Ad'));
    expect(ev('2s 2h 2d 3c 3h Kc Qd')).toBeGreaterThan(ev('Ah Jh 8h 5h 2h Kc Qd'));
  });

  it('kickers break ties', () => {
    expect(ev('As Ah Kd Qc Jh 2c 3d')).toBeGreaterThan(ev('As Ah Kd Qc Th 2c 3d')); // AJ vs AT kicker
    expect(ev('Ah Kh 8h 5h 2h Qc Qd')).toBeGreaterThan(ev('Kh Qh 8h 5h 2h Ac Ad')); // A-high vs K-high flush
  });

  it('two pair uses the best two pairs of three, third pair as kicker', () => {
    // AA + KK + QQ in 7 cards -> AAKK with a Q kicker
    const threePair = ev('As Ah Kd Kc Qh Qd 3d');
    expect(threePair).toBe(ev('As Ah Kd Kc Qh 4d 3d')); // same as AAKK+Q
    expect(threePair).toBeGreaterThan(ev('As Ah Kd Kc Jh 4d 3d')); // beats AAKK+J
  });

  it('picks the best five from seven', () => {
    // board pair irrelevant vs made straight
    expect(scoreCategory(ev('9s 8h 7d 6c 5h 5c 5d'))).toBe(4); // straight beats trips
    // seven cards same suit: flush uses top five
    expect(ev('Ah Kh Qh 9h 5h 3h 2h')).toBe(ev('Ah Kh Qh 9h 5h 3c 2c'));
  });

  it('full house from two trips uses higher trips', () => {
    const twoTrips = ev('As Ah Ad Kc Kh Kd 3d');
    const explicit = ev('As Ah Ad Kc Kh 2c 3d');
    expect(twoTrips).toBe(explicit); // AAAKK both ways
  });
});

describe('range parser', () => {
  it('pairs and pairs-plus', () => {
    expect(parseRange('AA').combos).toHaveLength(6);
    expect(parseRange('22+').combos).toHaveLength(78); // 13 * 6
    expect(parseRange('TT-77').combos).toHaveLength(24);
  });
  it('suited / offsuit / both', () => {
    expect(parseRange('AKs').combos).toHaveLength(4);
    expect(parseRange('AKo').combos).toHaveLength(12);
    expect(parseRange('AK').combos).toHaveLength(16);
    expect(parseRange('AQo+').combos).toHaveLength(24);
    expect(parseRange('A2s+').combos).toHaveLength(48); // A2s..AKs
  });
  it('connector runs and dash ranges', () => {
    expect(parseRange('T9s-65s').combos).toHaveLength(20);
    expect(parseRange('T9s+').combos).toHaveLength(20); // T9,JT,QJ,KQ,AK suited
  });
  it('exact combos, lists, random', () => {
    expect(parseRange('AhKh').combos).toHaveLength(1);
    expect(parseRange('random').combos).toHaveLength(1326);
    const list = parseRange('QQ+, AKs');
    expect(list.combos).toHaveLength(6 + 6 + 6 + 4);
    expect(list.errors).toEqual([]);
  });
  it('deduplicates overlapping terms', () => {
    expect(parseRange('AA, AA').combos).toHaveLength(6);
    expect(parseRange('AK, AKs').combos).toHaveLength(16);
  });
  it('reports bad terms', () => {
    const r = parseRange('QQ+, zebra');
    expect(r.errors).toEqual(['zebra']);
    expect(r.combos).toHaveLength(18);
  });
});

describe('Monte Carlo equity vs known values', () => {
  const ITER = 80_000;

  it('AA vs KK preflop ≈ 81.9%', () => {
    const hero: Combo = [cardFromString('As'), cardFromString('Ah')];
    const { combos } = parseRange('KK');
    const r = equityVsRange(hero, combos, [], { iterations: ITER, seed: 42 });
    expect(r.equity).toBeGreaterThan(81.4);
    expect(r.equity).toBeLessThan(82.4);
  });

  it('AKs vs QQ preflop ≈ 46%', () => {
    const hero: Combo = [cardFromString('Ah'), cardFromString('Kh')];
    const { combos } = parseRange('QQ');
    const r = equityVsRange(hero, combos, [], { iterations: ITER, seed: 7 });
    expect(r.equity).toBeGreaterThan(45.0);
    expect(r.equity).toBeLessThan(47.0);
  });

  it('AA vs random hand ≈ 85.2%', () => {
    const hero: Combo = [cardFromString('As'), cardFromString('Ah')];
    const { combos } = parseRange('random');
    const r = equityVsRange(hero, combos, [], { iterations: ITER, seed: 99 });
    expect(r.equity).toBeGreaterThan(84.4);
    expect(r.equity).toBeLessThan(86.0);
  });

  it('board straight flush is an exact chop', () => {
    const hero: Combo = [cardFromString('Ah'), cardFromString('Kd')];
    const { combos } = parseRange('QQ');
    const board = cards('2s 3s 4s 5s 6s');
    const r = equityVsRange(hero, combos, board, { iterations: 5000, seed: 1 });
    expect(r.equity).toBe(50);
    expect(r.tie).toBe(5000);
  });

  it('drawing dead is exactly 0%', () => {
    // hero two pair vs guaranteed set on a complete board
    const hero: Combo = [cardFromString('As'), cardFromString('Ks')];
    const { combos } = parseRange('QQ');
    const board = cards('Ah Kh Qs 2c 9d');
    const r = equityVsRange(hero, combos, board, { iterations: 3000, seed: 3 });
    expect(r.equity).toBe(0);
  });

  it('throws on conflicting cards and empty live ranges', () => {
    const hero: Combo = [cardFromString('As'), cardFromString('Ah')];
    expect(() => equityVsRange(hero, parseRange('KK').combos, cards('As 2d 3c'))).toThrow();
    expect(() =>
      equityVsRange(
        [cardFromString('Ad'), cardFromString('Ac')],
        parseRange('AsAh').combos,
        cards('As 2d 3c'),
      ),
    ).toThrow();
  });

  it('is deterministic for a fixed seed', () => {
    const hero: Combo = [cardFromString('Js'), cardFromString('Jh')];
    const { combos } = parseRange('AKo');
    const a = equityVsRange(hero, combos, [], { iterations: 10_000, seed: 5 });
    const b = equityVsRange(hero, combos, [], { iterations: 10_000, seed: 5 });
    expect(a.equity).toBe(b.equity);
  });
});
