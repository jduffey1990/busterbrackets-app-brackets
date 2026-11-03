import { simulateBracket, rngFromSeed, seedOf } from './simulation';
import { buildOdds } from './odds';
import { gamesFromBracket } from './gameDerivation';
import { historicalGames } from '../data/historicalGames';

const odds = buildOdds(historicalGames());

describe('rngFromSeed', () => {
  it('is deterministic per seed and uniform-ish in [0, 1)', () => {
    const a = rngFromSeed('buster');
    const b = rngFromSeed('buster');
    const first = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(first);
    expect(first).not.toEqual(Array.from({ length: 5 }, () => rngFromSeed('other')()));
    const r = rngFromSeed('uniform');
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      sum += x;
    }
    expect(sum / 10000).toBeCloseTo(0.5, 1);
  });
});

describe('simulateBracket', () => {
  it('produces a complete, self-consistent bracket that derives 63 games', () => {
    const bracket = simulateBracket(odds, { random: rngFromSeed('shape') });
    expect(bracket.east.round32).toHaveLength(8);
    expect(bracket.finals.teams).toEqual([
      bracket.east.regionChamp, bracket.midwest.regionChamp, bracket.south.regionChamp, bracket.west.regionChamp,
    ]);
    expect(gamesFromBracket(2027, bracket)).toHaveLength(63);
  });

  it('is reproducible from its seed', () => {
    const one = simulateBracket(odds, { random: rngFromSeed('replay') });
    const two = simulateBracket(odds, { random: rngFromSeed('replay') });
    expect(two).toEqual(one);
    expect(simulateBracket(odds, { random: rngFromSeed('replay-2') })).not.toEqual(one);
  });

  it('follows the odds over many runs', () => {
    const random = rngFromSeed('frequencies');
    let oneSeedWins = 0;
    let sixteenSeedChampions = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i++) {
      const b = simulateBracket(odds, { random });
      oneSeedWins += ['e', 'm', 's', 'w'].filter((p) => b[({ e: 'east', m: 'midwest', s: 'south', w: 'west' } as const)[p as 'e']].round32[0] === `${p}1`).length;
      if (seedOf(b.finals.champion) === 16) sixteenSeedChampions++;
    }
    const expected = odds.probability(1, 16);
    expect(oneSeedWins / (runs * 4)).toBeCloseTo(expected, 1);
    expect(sixteenSeedChampions).toBe(0);
  });

  it('a 100-point boost makes the favorite the champion every time', () => {
    const random = rngFromSeed('loyal');
    for (let i = 0; i < 50; i++) {
      const b = simulateBracket(odds, { favorite: 'w16', boost: 100, random });
      expect(b.finals.champion).toBe('w16');
      expect(b.west.regionChamp).toBe('w16');
    }
  });

  it('a boost moves the favorite by that many points per game', () => {
    const random = rngFromSeed('nudge');
    let wins = 0;
    const runs = 4000;
    for (let i = 0; i < runs; i++) {
      if (simulateBracket(odds, { favorite: 'e16', boost: 50, random }).east.round32[0] === 'e16') wins++;
    }
    expect(wins / runs).toBeCloseTo(1 - odds.probability(1, 16) + 0.5, 1);
  });

  it('rejects a bad favorite key or boost', () => {
    const random = rngFromSeed('x');
    expect(() => simulateBracket(odds, { favorite: 'x1', random })).toThrow(RangeError);
    expect(() => simulateBracket(odds, { favorite: 'e17', random })).toThrow(RangeError);
    expect(() => simulateBracket(odds, { boost: 101, random })).toThrow(RangeError);
    expect(() => simulateBracket(odds, { boost: -1, random })).toThrow(RangeError);
  });
});
