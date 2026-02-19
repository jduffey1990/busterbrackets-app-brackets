// src/controllers/bracketService.ts
import { ObjectId } from 'mongodb';
import { Bracket } from '../models/bracket';
import { DatabaseService } from './mongodb.service';

export class BracketService {
  /**
   * Fetch all brackets.
   */
  public static async findAllBrackets(): Promise<Bracket[]> {
    try {
      const db = DatabaseService.getInstance().getDb();
      const bracketsCollection = db.collection<Bracket>('brackets');
      return await bracketsCollection.find().toArray();
    } catch (error) {
      console.error('Failed to fetch brackets:', error);
      throw error;
    }
  }

  /**
   * Fetch a single bracket by ID.
   */
  public static async findBracketById(id: string): Promise<Bracket | null> {
    try {
      const db = DatabaseService.getInstance().getDb();
      const bracket = await db
        .collection<Bracket>('brackets')
        .findOne({ _id: new ObjectId(id) });
      return bracket;
    } catch (error) {
      console.error('Failed to find bracket:', error);
      throw error;
    }
  }

  /**
   * Fetch all brackets for a user.
   */
  public static async findBracketByUserId(id: string): Promise<Bracket[] | null> {
    try {
      const db = DatabaseService.getInstance().getDb();
      const bracketsCollection = db.collection<Bracket>('brackets');
      return await bracketsCollection.find({ userId: new ObjectId(id) }).toArray();
    } catch (error) {
      console.error('Failed to find bracket:', error);
      throw error;
    }
  }

  /**
   * Create a new bracket.
   * Accepts StructuredBracket format (post-migration).
   */
  public static async createBracket(bracketObject: Bracket): Promise<Bracket | null> {
    try {
      const db = DatabaseService.getInstance().getDb();
      const insertResult = await db.collection<Bracket>('brackets').insertOne(bracketObject);

      if (insertResult.acknowledged) {
        const createdBracket = await db
          .collection<Bracket>('brackets')
          .findOne({ _id: insertResult.insertedId });
        return createdBracket || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to create bracket:', error);
      throw error;
    }
  }
}