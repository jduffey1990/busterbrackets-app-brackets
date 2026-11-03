// src/scripts/backfillHistoricalGames.ts
//
// Loads src/data/historical-games.json into tournamentGames for every year
// that has no tournamentData results of its own. A year is tracked once its
// results derive at least one game; a blank bracket saved from Admin for a
// past year does not count. Tracked years are left to
// rebuildTournamentGames.ts; this script never overwrites them.
// Idempotent: a backfilled year is replaced whole on each run.
//
// Usage:
//   npm run backfill-games
//   docker compose run --rm brackets npm run backfill-games

import dotenv from 'dotenv';
import { DatabaseService } from '../controllers/mongodb.service';
import { TournamentData } from '../models/tournamentData';
import { TournamentGameService } from '../controllers/tournamentGameService';
import { gamesFromBracket } from '../controllers/gameDerivation';
import { historicalGames } from '../data/historicalGames';
dotenv.config();

async function backfill() {
  const dbService = DatabaseService.getInstance();
  try {
    await dbService.connect();
    const db = dbService.getDb();
    const seasons = await db
      .collection<TournamentData>('tournamentData')
      .find({}, { projection: { year: 1, results: 1 } })
      .toArray();
    const trackedYears = new Set(
      seasons.filter((s) => gamesFromBracket(s.year, s.results).length > 0).map((s) => s.year),
    );

    const byYear = new Map<number, ReturnType<typeof historicalGames>>();
    for (const g of historicalGames()) {
      if (!byYear.has(g.year)) byYear.set(g.year, []);
      byYear.get(g.year)!.push(g);
    }

    for (const [year, games] of [...byYear.entries()].sort((a, b) => a[0] - b[0])) {
      if (trackedYears.has(year)) {
        console.log(`${year}: tracked in tournamentData, left alone`);
        continue;
      }
      const stored = await TournamentGameService.replaceYear(year, games, 'kaggle');
      console.log(`${year}: ${stored} games (kaggle)`);
    }
    console.log('Totals by year:', await TournamentGameService.countByYear());
  } catch (error) {
    console.error('Failed to backfill historical games:', error);
    process.exitCode = 1;
  } finally {
    await dbService.disconnect();
  }
}

backfill().catch(console.error);
