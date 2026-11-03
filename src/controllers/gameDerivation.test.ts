import { gamesFromBracket, BracketConsistencyError, ROUND_OF_64_ORDER, DerivedGame } from './gameDerivation';
import { results2026 } from '../data/tournament2026';
import { StructuredBracket } from '../models/tournamentData';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

const countBy = (games: DerivedGame[], key: (g: DerivedGame) => string) =>
  games.reduce<Record<string, number>>((acc, g) => {
    const k = key(g);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

describe('gamesFromBracket', () => {
  it('yields nothing for a tournament that has not started', () => {
    expect(gamesFromBracket(2027, null)).toEqual([]);
    expect(gamesFromBracket(2027, undefined)).toEqual([]);
  });

  it('recovers all 63 games of a completed tournament, in the right rounds', () => {
    const games = gamesFromBracket(2026, results2026);
    expect(games).toHaveLength(63);
    expect(countBy(games, (g) => g.round)).toEqual({
      round64: 32,
      round32: 16,
      sweet16: 8,
      elite8: 4,
      semifinal: 2,
      championship: 1,
    });
    expect(games.every((g) => g.year === 2026)).toBe(true);
  });

  it('pairs the round of 64 by bracket position', () => {
    const east64 = gamesFromBracket(2026, results2026).filter((g) => g.round === 'round64' && g.regionA === 'east');
    expect(east64.map((g) => [g.seedA, g.seedB])).toEqual([
      [1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15],
    ]);
    expect(ROUND_OF_64_ORDER).toHaveLength(16);
    expect(new Set(ROUND_OF_64_ORDER).size).toBe(16);
  });

  it('records which side won, including upsets', () => {
    const games = gamesFromBracket(2026, results2026);
    // Iowa (9) over Florida (1) in the South round of 32.
    const iowa = games.find((g) => g.round === 'round32' && g.regionA === 'south' && g.seedA === 1);
    expect(iowa).toMatchObject({ seedB: 9, winner: 'B' });
    // Every 1 seed won its first game.
    const ones = games.filter((g) => g.round === 'round64' && g.seedA === 1);
    expect(ones).toHaveLength(4);
    expect(ones.every((g) => g.seedB === 16 && g.winner === 'A')).toBe(true);
  });

  it('carries the region of each team through the finals', () => {
    const games = gamesFromBracket(2026, results2026);
    const championship = games.find((g) => g.round === 'championship');
    // UConn (east 2) lost to Michigan (midwest 1).
    expect(championship).toEqual({
      year: 2026,
      round: 'championship',
      regionA: 'east',
      seedA: 2,
      regionB: 'midwest',
      seedB: 1,
      winner: 'B',
    });
  });

  it('skips games whose result has not been entered yet', () => {
    const partial: StructuredBracket = clone(results2026);
    partial.east.sweet16 = ['e1', null as unknown as string, 'e3', 'e2'];
    partial.east.elite8 = [];
    partial.east.regionChamp = '';
    partial.finals = { teams: [], semifinals: [], champion: '' };

    const games = gamesFromBracket(2026, partial);
    const east = games.filter((g) => g.regionA === 'east');
    // 8 round-of-64 games, 3 of 4 round-of-32 games, nothing after.
    expect(countBy(east, (g) => g.round)).toEqual({ round64: 8, round32: 3 });
    expect(games.some((g) => g.round === 'semifinal' || g.round === 'championship')).toBe(false);
  });

  it('rejects a winner that did not play in its game', () => {
    const bad: StructuredBracket = clone(results2026);
    bad.west.sweet16[0] = 'w9'; // Arizona (1) beat Utah St. (9); w9 then "wins" the next round against w4
    bad.west.elite8[0] = 'w1';
    expect(() => gamesFromBracket(2026, bad)).toThrow(BracketConsistencyError);
    expect(() => gamesFromBracket(2026, bad)).toThrow('2026 sweet16 game 1: winner w1 did not play (w9 vs w4)');
  });

  it('rejects a team from another region inside a region bracket', () => {
    const bad: StructuredBracket = clone(results2026);
    bad.south.round32[0] = 'e1';
    expect(() => gamesFromBracket(2026, bad)).toThrow(BracketConsistencyError);
  });

  it('rejects malformed seed keys', () => {
    // finals.teams is the one participant list not already validated as a
    // winner of an earlier round, so a bad key there reaches the parser.
    const bad: StructuredBracket = clone(results2026);
    bad.finals.teams[0] = 'x17';
    expect(() => gamesFromBracket(2026, bad)).toThrow('2026 semifinal game 1: "x17" is not a seed key like "e1"');
  });
});
