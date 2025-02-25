// src/controllers/userService.ts
import { ObjectId } from 'mongodb';
import { Bracket } from '../models/bracket';
import { DatabaseService } from './mongodb.service';

export class BracketService {
  /**
   * Fetch all users from the "users" collection.
   */
  public static async findAllBrackets(): Promise<Bracket[]> {
    try {
      // Grab the existing DB connection from the singleton
      const db = DatabaseService.getInstance().getDb();
      const bracketsCollection = db.collection<Bracket>('brackets');
      return await bracketsCollection.find().toArray();
    } catch (error) {
      console.error('Failed to fetch brackets:', error);
      throw error;
    }
  }

  /**
   * Fetch a single user by ID from the "users" collection.
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
  public static async findBracketByUserId(id: string): Promise<Bracket [] | null> {
    try {
      const db = DatabaseService.getInstance().getDb();
      const bracketsCollection = db.collection<Bracket>('brackets');
      return await bracketsCollection.find({userId: new ObjectId(id)}).toArray();
    } catch (error) {
      console.error('Failed to find bracket:', error);
      throw error;
    }
  }
}
