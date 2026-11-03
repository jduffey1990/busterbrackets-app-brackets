// src/controllers/tournamentGameService.ts
import { ObjectId } from 'mongodb';
import { TournamentGame, GameSource } from '../models/tournamentGame';
import { DerivedGame } from './gameDerivation';
import { DatabaseService } from './mongodb.service';

const COLLECTION = 'tournamentGames';

export class TournamentGameService {
  private static indexesEnsured = false;

  private static async collection() {
    const db = DatabaseService.getInstance().getDb();
    const collection = db.collection<TournamentGame>(COLLECTION);
    if (!this.indexesEnsured) {
      await collection.createIndex({ year: 1 });
      // Within one year and round a seed appears once per region.
      await collection.createIndex({ year: 1, round: 1, regionA: 1, seedA: 1 }, { unique: true });
      this.indexesEnsured = true;
    }
    return collection;
  }

  /**
   * Replace every game stored for `year` with `games`. Results are edited in
   * place as a tournament progresses (and corrected after), so the year is
   * always rewritten whole rather than merged. Returns the number stored.
   *
   * A year counts as tracked only once it derives at least one game. With an
   * empty `games` (results not entered yet, or a past year created in Admin
   * and saved blank) only rows of this `source` are removed, so a backfilled
   * year keeps its history until real results replace it.
   */
  public static async replaceYear(year: number, games: DerivedGame[], source: GameSource = 'structured'): Promise<number> {
    try {
      const collection = await this.collection();
      if (games.length === 0) {
        await collection.deleteMany({ year, source });
        return 0;
      }
      await collection.deleteMany({ year });

      const now = new Date();
      const docs: TournamentGame[] = games.map((g) => ({ _id: new ObjectId(), ...g, source, createdAt: now }));
      const result = await collection.insertMany(docs);
      return result.insertedCount;
    } catch (error) {
      console.error(`Failed to replace tournament games for ${year}:`, error);
      throw error;
    }
  }

  public static async countByYear(): Promise<Record<number, number>> {
    try {
      const collection = await this.collection();
      const rows = await collection
        .aggregate<{ _id: number; count: number }>([
          { $group: { _id: '$year', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ])
        .toArray();
      return Object.fromEntries(rows.map((r) => [r._id, r.count]));
    } catch (error) {
      console.error('Failed to count tournament games:', error);
      throw error;
    }
  }
}
