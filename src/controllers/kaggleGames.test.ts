import { gamesFromKaggle, parseCsv } from './kaggleGames';

// A miniature season: two regions (W = East, X = West), a First Four game for
// the W16 line, two first-round games per region, and a cross-region final.
const seasons = [{ Season: '1999', DayZero: '', RegionW: 'East', RegionX: 'West', RegionY: 'Midwest', RegionZ: 'Southeast' }];
const seeds = [
  { Season: '1999', Seed: 'W01', TeamID: '1' },
  { Season: '1999', Seed: 'W16a', TeamID: '16' },
  { Season: '1999', Seed: 'W16b', TeamID: '17' },
  { Season: '1999', Seed: 'W08', TeamID: '8' },
  { Season: '1999', Seed: 'W09', TeamID: '9' },
  { Season: '1999', Seed: 'X02', TeamID: '2' },
  { Season: '1999', Seed: 'X15', TeamID: '15' },
];
const game = (DayNum: string, WTeamID: string, LTeamID: string) => ({ Season: '1999', DayNum, WTeamID, LTeamID });

describe('gamesFromKaggle', () => {
  it('skips First Four games and derives rounds from prior wins', () => {
    const results = [
      game('134', '17', '16'), // First Four: W16b beats W16a
      game('136', '1', '17'), // R64: 1 over 16
      game('136', '9', '8'), // R64: 9 over 8
      game('138', '1', '9'), // R32: 1 over 9
      game('137', '2', '15'), // R64 in the other region
      game('154', '2', '1'), // the two meet in a later round: 2 over 1
    ];
    const { games, skippedPlayIns, notes } = gamesFromKaggle(results, seeds, seasons);
    expect(skippedPlayIns).toBe(1);
    expect(games).toEqual([
      { year: 1999, round: 'round64', regionA: 'east', seedA: 1, regionB: 'east', seedB: 16, winner: 'A' },
      { year: 1999, round: 'round64', regionA: 'east', seedA: 8, regionB: 'east', seedB: 9, winner: 'B' },
      { year: 1999, round: 'round64', regionA: 'west', seedA: 2, regionB: 'west', seedB: 15, winner: 'A' },
      { year: 1999, round: 'round32', regionA: 'east', seedA: 1, regionB: 'east', seedB: 9, winner: 'A' },
      { year: 1999, round: 'sweet16', regionA: 'east', seedA: 1, regionB: 'west', seedB: 2, winner: 'B' },
    ]);
    // The 1 (two wins) met the 2 (one win) unevenly, and across regions in a region round.
    expect(notes).toHaveLength(2);
    expect(notes[0]).toContain('reached the game unevenly');
    expect(notes[1]).toContain('different regions');
  });

  it('puts the winner on side A when seeds are equal', () => {
    const twoOnes = [...seeds, { Season: '1999', Seed: 'X01', TeamID: '21' }];
    const { games } = gamesFromKaggle([game('152', '21', '1')], twoOnes, seasons);
    expect(games[0]).toMatchObject({ regionA: 'west', seedA: 1, regionB: 'east', seedB: 1, winner: 'A' });
  });

  it('refuses a team with no seed', () => {
    expect(() => gamesFromKaggle([game('136', '1', '99')], seeds, seasons)).toThrow('no seed for team 99');
  });

  it('refuses a seed string it cannot read', () => {
    expect(() => gamesFromKaggle([], [{ Season: '1999', Seed: 'Q01', TeamID: '1' }], seasons)).toThrow('Unrecognised seed "Q01"');
  });
});

describe('parseCsv', () => {
  it('reads a plain header-and-rows file', () => {
    expect(parseCsv('A,B\n1,x\n2,y\n')).toEqual([{ A: '1', B: 'x' }, { A: '2', B: 'y' }]);
  });

  it('refuses ragged rows and quoted fields', () => {
    expect(() => parseCsv('A,B\n1\n')).toThrow('line 2 has 1 cells');
    expect(() => parseCsv('A,B\n"1,2",x\n')).toThrow('quoted fields');
  });
});
