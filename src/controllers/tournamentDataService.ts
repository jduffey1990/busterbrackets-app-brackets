// src/controllers/tournamentDataService.ts
import { ObjectId } from 'mongodb';
import { TournamentData, StructuredBracket } from '../models/tournamentData';
import { DatabaseService } from './mongodb.service';

export class TournamentDataService {

  /**
   * Get tournament data for a specific year.
   */
  public static async findByYear(year: number): Promise<TournamentData | null> {
    try {
      const db = DatabaseService.getInstance().getDb();
      return await db
        .collection<TournamentData>('tournamentData')
        .findOne({ year });
    } catch (error) {
      console.error('Failed to find tournament data:', error);
      throw error;
    }
  }

  /**
   * Get the current year's tournament data (convenience).
   */
  public static async findCurrent(): Promise<TournamentData | null> {
    const currentYear = new Date().getFullYear();
    return this.findByYear(currentYear);
  }

  /**
   * Get all available tournament years (for dropdowns, etc.).
   */
  public static async findAllYears(): Promise<number[]> {
    try {
      const db = DatabaseService.getInstance().getDb();
      const docs = await db
        .collection<TournamentData>('tournamentData')
        .find({}, { projection: { year: 1 } })
        .sort({ year: -1 })
        .toArray();
      return docs.map(d => d.year);
    } catch (error) {
      console.error('Failed to fetch tournament years:', error);
      throw error;
    }
  }

  /**
   * Create a new tournament data entry for a given year.
   * Rejects if data for that year already exists.
   */
  public static async create(year: number, teams: Record<string, string>): Promise<TournamentData | null> {
    try {
      const db = DatabaseService.getInstance().getDb();
      const collection = db.collection<TournamentData>('tournamentData');

      // Guard against duplicate years
      const existing = await collection.findOne({ year });
      if (existing) {
        throw new Error(`Tournament data for ${year} already exists. Use update instead.`);
      }

      const now = new Date();
      const doc: TournamentData = {
        _id: new ObjectId(),
        year,
        teams,
        results: null,
        createdAt: now,
        updatedAt: now,
      };

      const result = await collection.insertOne(doc);
      if (result.acknowledged) {
        return await collection.findOne({ _id: result.insertedId });
      }
      return null;
    } catch (error) {
      console.error('Failed to create tournament data:', error);
      throw error;
    }
  }

  /**
   * Update teams mapping for an existing year.
   */
  public static async updateTeams(year: number, teams: Record<string, string>): Promise<TournamentData | null> {
    try {
      const db = DatabaseService.getInstance().getDb();
      const collection = db.collection<TournamentData>('tournamentData');

      const result = await collection.findOneAndUpdate(
        { year },
        { $set: { teams, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      return result || null;
    } catch (error) {
      console.error('Failed to update tournament teams:', error);
      throw error;
    }
  }

  /**
   * Update tournament results (can be partial — called as games complete).
   */
  public static async updateResults(year: number, results: StructuredBracket): Promise<TournamentData | null> {
    try {
      const db = DatabaseService.getInstance().getDb();
      const collection = db.collection<TournamentData>('tournamentData');

      const result = await collection.findOneAndUpdate(
        { year },
        { $set: { results, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      return result || null;
    } catch (error) {
      console.error('Failed to update tournament results:', error);
      throw error;
    }
  }
}