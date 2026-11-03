// src/data/historicalGames.ts
//
// Loader for historical-games.json: every tournament game from 1985 to the
// last season before the app tracked results itself, as compact rows
// [year, round, regionA, seedA, regionB, seedB, winner]. Generated once by
// scripts/convertKaggleGames.ts from Kaggle's March Machine Learning Mania
// files; the JSON holds only our own derived facts (who played whom, who
// won), not Kaggle's files.
//
// The JSON's basename deliberately differs from this module's: Node resolves
// a bare "../data/historicalGames" to .json before .ts under ts-node.
import type { DerivedGame } from '../controllers/gameDerivation';
import type { GameRound } from '../models/tournamentGame';
import rows from './historical-games.json';

export type HistoricalRow = [number, GameRound, string, number, string, number, 'A' | 'B'];

export function toRow(g: DerivedGame): HistoricalRow {
  return [g.year, g.round, g.regionA, g.seedA, g.regionB, g.seedB, g.winner];
}

export function fromRow([year, round, regionA, seedA, regionB, seedB, winner]: HistoricalRow): DerivedGame {
  return { year, round, regionA, seedA, regionB, seedB, winner };
}

export function historicalGames(): DerivedGame[] {
  return (rows as HistoricalRow[]).map(fromRow);
}
