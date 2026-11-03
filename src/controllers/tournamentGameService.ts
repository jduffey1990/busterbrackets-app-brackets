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
   */
  public static async replaceYear(year: number, games: DerivedGame[], source: GameSource = 'structured'): Promise<number> {
    try {
      const collection = await this.collection();
      await collection.deleteMany({ year });
      if (games.length === 0) return 0;

      const now = new Date();
      const docs: TournamentGame[] = games.map((g) => ({ _id: new ObjectId(), ...g, source, createdAt: now }));
      const result = await collection.insertMany(docs);
      return result.insertedCount;
    } catch (error) {
      console.error(`Failed to replace tournament games for ${year}:`, error);
      throw error;
    }
  }

  /** Games played before `year`: the history a given year's odds may draw on. */
  public static async findBefore(year: number): Promise<TournamentGame[]> {
    try {
      const collection = await this.collection();
      return await collection.find({ year: { $lt: year } }).sort({ year: 1 }).toArray();
    } catch (error) {
      console.error(`Failed to fetch tournament games before ${year}:`, error);
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
