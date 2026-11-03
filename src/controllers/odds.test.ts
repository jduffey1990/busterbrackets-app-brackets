import { buildOdds, fitSeedStrengths, SEED_COUNT } from './odds';
import { matchupKey } from './seedRecords';
import type { MatchupGame } from './seedRecords';
import { historicalGames } from '../data/historicalGames';

const game = (seedA: number, seedB: number, favoredWins: boolean): MatchupGame => ({
  seedA,
  seedB,
  winner: (seedA < seedB) === favoredWins ? 'A' : 'B',
});
const repeat = (n: number, make: (i: number) => MatchupGame) => Array.from({ length: n }, (_, i) => make(i));

describe('fitSeedStrengths', () => {
  it('ranks a seed that wins more as stronger, and equal records as equal', () => {
    const games = [
      ...repeat(80, () => game(1, 2, true)),
      ...repeat(20, () => game(1, 2, false)),
      ...repeat(50, () => game(3, 4, true)),
      ...repeat(50, () => game(3, 4, false)),
    ];
    const s = fitSeedStrengths(games);
    expect(s).toHaveLength(SEED_COUNT + 1);
    expect(s[1]).toBeGreaterThan(s[2]);
    expect(s[3]).toBeCloseTo(s[4], 6);
  });

  it('is deterministic', () => {
    const games = historicalGames();
    expect(fitSeedStrengths(games)).toEqual(fitSeedStrengths(games));
  });

  it('rejects seeds outside 1 to 16', () => {
    expect(() => fitSeedStrengths([game(0, 5, true)])).toThrow(RangeError);
    expect(() => fitSeedStrengths([game(1, 17, true)])).toThrow(RangeError);
  });
});

describe('buildOdds', () => {
  it('covers all 120 pairings and is symmetric', () => {
    const odds = buildOdds(historicalGames());
    expect(odds.matchups.size).toBe(120);
    for (let a = 1; a <= SEED_COUNT; a++) {
      for (let b = 1; b <= SEED_COUNT; b++) {
        expect(odds.probability(a, b) + odds.probability(b, a)).toBeCloseTo(1, 12);
      }
    }
    expect(odds.probability(7, 7)).toBe(0.5);
  });

  it('falls back to the fitted prior for a pairing with no games', () => {
    const odds = buildOdds([...repeat(40, () => game(1, 2, true)), ...repeat(10, () => game(1, 2, false))]);
    const never = odds.matchups.get(matchupKey(1, 16))!;
    expect(never.wins + never.losses).toBe(0);
    expect(never.probability).toBe(never.prior);
  });

  it('weights the prior as priorStrength extra games', () => {
    const games = [...repeat(20, () => game(1, 12, true))];
    const pure = buildOdds(games, { priorStrength: 0 }).matchups.get('1vs12')!;
    expect(pure.probability).toBe(1);
    const shrunk = buildOdds(games, { priorStrength: 20 }).matchups.get('1vs12')!;
    expect(shrunk.probability).toBeCloseTo((20 + 20 * shrunk.prior) / 40, 12);
    expect(shrunk.probability).toBeLessThan(1);
    const priorOnly = buildOdds(games, { priorStrength: 1e9 }).matchups.get('1vs12')!;
    expect(priorOnly.probability).toBeCloseTo(priorOnly.prior, 6);
  });

  it('rejects a negative prior strength', () => {
    expect(() => buildOdds([], { priorStrength: -1 })).toThrow(RangeError);
  });

  it('gives sensible numbers on the real history', () => {
    const odds = buildOdds(historicalGames());
    const p = (a: number, b: number) => odds.probability(a, b);
    expect(p(1, 16)).toBeGreaterThan(0.95);
    expect(p(8, 9)).toBeGreaterThan(0.4);
    expect(p(8, 9)).toBeLessThan(0.6);
    // The old table made this a certainty (20-0); it is no longer one.
    expect(p(1, 12)).toBeGreaterThan(0.85);
    expect(p(1, 12)).toBeLessThan(0.98);
    // The better the opponent, the lower the 1 seed's chances.
    expect(p(1, 16)).toBeGreaterThan(p(1, 8));
    expect(p(1, 8)).toBeGreaterThan(p(1, 4));
    expect(p(1, 4)).toBeGreaterThan(p(1, 2));
    expect(p(1, 2)).toBeGreaterThan(0.5);
  });
});
