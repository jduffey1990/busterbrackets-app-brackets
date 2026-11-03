// src/scripts/convertKaggleGames.ts
//
// One-time conversion of Kaggle's March Machine Learning Mania files into
// src/data/historicalGames.json. Download MNCAATourneyCompactResults.csv,
// MNCAATourneySeeds.csv and MSeasons.csv from the competition into a
// directory and point this script at it:
//
//   npx ts-node src/scripts/convertKaggleGames.ts /path/to/kaggle/dir
//
// Nothing touches the database; backfillHistoricalGames.ts does that.

import * as fs from 'fs';
import * as path from 'path';
import { parseCsv, gamesFromKaggle } from '../controllers/kaggleGames';
import { toRow } from '../data/historicalGames';

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: convertKaggleGames.ts <directory with the three Kaggle CSVs>');
  process.exit(2);
}
const read = (name: string) => parseCsv(fs.readFileSync(path.join(dir, name), 'utf8'));

const { games, skippedPlayIns, notes } = gamesFromKaggle(
  read('MNCAATourneyCompactResults.csv'),
  read('MNCAATourneySeeds.csv'),
  read('MSeasons.csv'),
);

const out = path.join(__dirname, '..', 'data', 'historical-games.json');
const rows = games.map(toRow);
fs.writeFileSync(out, '[\n' + rows.map((r) => JSON.stringify(r)).join(',\n') + '\n]\n');

const perYear = new Map<number, number>();
for (const g of games) perYear.set(g.year, (perYear.get(g.year) ?? 0) + 1);
console.log(`${games.length} games, ${skippedPlayIns} First Four games skipped, written to ${out}`);
console.log('Per year:', [...perYear.entries()].map(([y, n]) => `${y}:${n}`).join(' '));
for (const n of notes) console.log('note:', n);
