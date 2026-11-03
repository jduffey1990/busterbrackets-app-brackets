// src/scripts/backtestOdds.ts
//
// Chooses the odds model's prior strength by backtesting: for each season Y
// from 2000 on, build the table from games before Y and score it on Y's games
// by log loss and Brier score. Also scores the legacy rule the UI used (raw
// record when more than 20 games, else a step function of seed gap) so the
// new model is compared against what it replaces. Pure and deterministic; no
// database.
//
//   npx ts-node src/scripts/backtestOdds.ts

import { buildOdds } from '../controllers/odds';
import { matchupKey, seedRecords } from '../controllers/seedRecords';
import type { MatchupGame } from '../controllers/seedRecords';
import { historicalGames } from '../data/historicalGames';

type Model = (train: MatchupGame[]) => (seedA: number, seedB: number) => number;

const legacy: Model = (train) => {
  const records = seedRecords(train);
  return (a, b) => {
    const favored = Math.min(a, b);
    const underdog = Math.max(a, b);
    const r = records.get(matchupKey(a, b));
    let p: number;
    if (r && r.wins + r.losses > 20) {
      p = Math.round((r.wins / (r.wins + r.losses)) * 100) / 100;
    } else {
      const gap = underdog - favored;
      p = gap < 3 ? 0.6 : gap < 6 ? 0.65 : gap < 9 ? 0.75 : gap < 12 ? 0.8 : 0.85;
    }
    return a === favored ? p : 1 - p;
  };
};

const shrinkage = (priorStrength: number): Model => (train) => {
  const odds = buildOdds(train, { priorStrength });
  return (a, b) => odds.probability(a, b);
};

const models: [string, Model][] = [
  ['legacy (>20 games else step)', legacy],
  ['prior only (k=1e9)', shrinkage(1e9)],
  ['k=0 (record, prior if none)', shrinkage(0)],
  ['k=5', shrinkage(5)],
  ['k=10', shrinkage(10)],
  ['k=20', shrinkage(20)],
  ['k=40', shrinkage(40)],
  ['k=80', shrinkage(80)],
];

const clamp = (p: number) => Math.min(0.99, Math.max(0.01, p));
const all = historicalGames();
const seasons = [...new Set(all.map((g) => g.year))].filter((y) => y >= 2000).sort();

console.log(`Held-out seasons: ${seasons[0]}-${seasons[seasons.length - 1]} (${seasons.length}), scoring games between different seeds.\n`);
console.log('model'.padEnd(32), 'log loss', ' brier', ' games');
for (const [name, model] of models) {
  let logLoss = 0;
  let brier = 0;
  let count = 0;
  for (const year of seasons) {
    const predict = model(all.filter((g) => g.year < year));
    for (const g of all.filter((x) => x.year === year && x.seedA !== x.seedB)) {
      const pA = clamp(predict(g.seedA, g.seedB));
      const outcome = g.winner === 'A' ? 1 : 0;
      logLoss -= outcome ? Math.log(pA) : Math.log(1 - pA);
      brier += (pA - outcome) ** 2;
      count++;
    }
  }
  console.log(name.padEnd(32), (logLoss / count).toFixed(4).padStart(8), (brier / count).toFixed(4).padStart(6), String(count).padStart(6));
}
