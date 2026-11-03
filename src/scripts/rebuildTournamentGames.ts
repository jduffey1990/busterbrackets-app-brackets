// src/scripts/rebuildTournamentGames.ts
//
// Re-derives the tournamentGames collection from every tournamentData document.
// Run it once after this collection is introduced, or any time results were
// changed outside the API. Idempotent: each year is replaced whole.
//
// Usage:
//   npm run rebuild-games
//   docker compose run --rm brackets npm run rebuild-games

import dotenv from 'dotenv';
import { DatabaseService } from '../controllers/mongodb.service';
import { TournamentData } from '../models/tournamentData';
import { gamesFromBracket, BracketConsistencyError } from '../controllers/gameDerivation';
import { TournamentGameService } from '../controllers/tournamentGameService';
dotenv.config();

async function rebuild() {
  const dbService = DatabaseService.getInstance();
  try {
    await dbService.connect();
    const db = dbService.getDb();
    const seasons = await db
      .collection<TournamentData>('tournamentData')
      .find({}, { projection: { year: 1, results: 1 } })
      .sort({ year: 1 })
      .toArray();

    // A bad year is reported and skipped (its stored games are left as they
    // were) so one data-entry error does not block the other years.
    const failures: number[] = [];
    for (const { year, results } of seasons) {
      let games;
      try {
        games = gamesFromBracket(year, results);
      } catch (error) {
        if (error instanceof BracketConsistencyError) {
          console.error(`${year}: skipped, ${error.message}`);
          failures.push(year);
          continue;
        }
        throw error;
      }
      const stored = await TournamentGameService.replaceYear(year, games);
      console.log(`${year}: ${stored} games`);
    }
    console.log('Totals by year:', await TournamentGameService.countByYear());
    if (failures.length > 0) {
      console.error(`Fix the results for ${failures.join(', ')} in Admin and rerun.`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Failed to rebuild tournament games:', error);
    process.exitCode = 1;
  } finally {
    await dbService.disconnect();
  }
}

rebuild().catch(console.error);
