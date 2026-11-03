// src/controllers/seedRecords.ts
//
// Aggregate games into the seed-vs-seed win/loss table the simulation has
// always used: "1vs16" -> wins and losses from the favored (lower-number)
// seed's side, across every round. Same-seed games carry no information
// about seeding and are left out.

import type { DerivedGame } from './gameDerivation';

export interface SeedRecord {
  wins: number;
  losses: number;
}

export type MatchupGame = Pick<DerivedGame, 'seedA' | 'seedB' | 'winner'>;

export function matchupKey(seedA: number, seedB: number): string {
  return `${Math.min(seedA, seedB)}vs${Math.max(seedA, seedB)}`;
}

export function seedRecords(games: MatchupGame[]): Map<string, SeedRecord> {
  const records = new Map<string, SeedRecord>();
  for (const g of games) {
    if (g.seedA === g.seedB) continue;
    const favoredWon = (g.seedA < g.seedB) === (g.winner === 'A');
    const key = matchupKey(g.seedA, g.seedB);
    const record = records.get(key) ?? { wins: 0, losses: 0 };
    if (favoredWon) record.wins++;
    else record.losses++;
    records.set(key, record);
  }
  return records;
}
