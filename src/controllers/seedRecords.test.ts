import { seedRecords, matchupKey } from './seedRecords';

describe('seedRecords', () => {
  it('counts from the favored seed side whichever slot it is in, and ignores same-seed games', () => {
    const records = seedRecords([
      { seedA: 1, seedB: 16, winner: 'A' }, // favored won
      { seedA: 16, seedB: 1, winner: 'B' }, // favored won, listed second
      { seedA: 1, seedB: 16, winner: 'B' }, // upset
      { seedA: 1, seedB: 1, winner: 'A' }, // no information
    ]);
    expect([...records.entries()]).toEqual([['1vs16', { wins: 2, losses: 1 }]]);
  });

  it('keys by the lower seed first', () => {
    expect(matchupKey(12, 5)).toBe('5vs12');
  });
});
