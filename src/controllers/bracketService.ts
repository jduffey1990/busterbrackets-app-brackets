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

  public static async createBracket(bracketObject: Bracket): Promise<Bracket | null> {
    try {
      const db = DatabaseService.getInstance().getDb();
      
      // Insert the user document into the 'brackets' collection
      const insertResult = await db.collection<Bracket>('brackets').insertOne(bracketObject);
      
      if (insertResult.acknowledged) {
        // Optionally, fetch the full user document from the DB to return
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
