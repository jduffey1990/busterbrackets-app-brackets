import { historicalGames } from './historicalGames';
import { seedRecords } from '../controllers/seedRecords';

// The hand-maintained table from ui/src/utils/bracketStruc.js, through 2025,
// is the acceptance criterion for the backfill: the games file must reproduce
// it. Two entries are known to differ, and the games file is the one that is
// right: a 6 and an 11 meet exactly four times a year, so 40 seasons is 160
// games (the hand table has 156); 7 vs 10 is 160 games less the 2021 no-contest
// in which VCU withdrew and Oregon advanced without playing (the hand table
// counts that as a game and has one other result transcribed the wrong way).
// Checked against the original sports-reference scrape: over the 22 seasons it
// captured completely, every per-season matchup record agrees with this file.
const HAND_TABLE: Record<string, string> = {
  '1vs16': '158-2', '8vs9': '77-83', '5vs12': '103-57', '4vs13': '127-33', '6vs11': '95-61',
  '3vs14': '137-23', '7vs10': '97-63', '2vs15': '149-11', '1vs8': '63-17', '4vs5': '48-37',
  '3vs6': '49-33', '2vs7': '65-27', '1vs4': '52-20', '2vs3': '38-24', '1vs2': '41-30',
  '1vs9': '76-6', '3vs11': '37-20', '1vs5': '44-11', '2vs11': '16-4', '5vs13': '18-3',
  '4vs12': '32-13', '1vs12': '20-0', '1vs3': '24-14', '2vs10': '37-20', '2vs6': '26-8',
};
const KNOWN_DIFFERENCES: Record<string, string> = { '6vs11': '98-62', '7vs10': '97-62' };

describe('historical-games.json', () => {
  const games = historicalGames();

  it('covers 1985 to 2025 with no 2020 tournament', () => {
    const years = [...new Set(games.map((g) => g.year))].sort();
    const expected = Array.from({ length: 41 }, (_, i) => 1985 + i).filter((y) => y !== 2020);
    expect(years).toEqual(expected);
  });

  it('has a full 63-game bracket every year except 2021', () => {
    const perYear = new Map<number, number>();
    for (const g of games) perYear.set(g.year, (perYear.get(g.year) ?? 0) + 1);
    for (const [year, n] of perYear) {
      expect([year, n]).toEqual([year, year === 2021 ? 62 : 63]);
    }
  });

  it('holds no First Four games', () => {
    // Every round-of-64 game pairs seeds that sum to 17.
    const r64 = games.filter((g) => g.round === 'round64');
    expect(r64.every((g) => g.seedA + g.seedB === 17)).toBe(true);
  });

  it('reproduces the hand-maintained seed-vs-seed table', () => {
    const records = seedRecords(games);
    const actual = Object.fromEntries(
      Object.keys(HAND_TABLE).map((k) => {
        const r = records.get(k);
        return [k, r ? `${r.wins}-${r.losses}` : 'missing'];
      }),
    );
    expect(actual).toEqual({ ...HAND_TABLE, ...KNOWN_DIFFERENCES });
  });
});
