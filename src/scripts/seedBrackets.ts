// src/scripts/seedBrackets.ts
import { ObjectId } from 'mongodb';
const Bcrypt = require('bcrypt');

import { DatabaseService } from '../controllers/mongodb.service';
import { Bracket } from '../models/bracket';

const baseBracket = [
  1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15,
  1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15,
  1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15,
  1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15
];

const baseOffshoot = [
  1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15,
  1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15,
  1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15,
  1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15
];



const arrayOfBrackets: number[][] = new Array(3).fill(null).map(() => ([ ...baseBracket ]));
const arrayOfOffshoots: number[][] = new Array(3).fill(null).map(() => ([ ...baseOffshoot ]));

const now = new Date()


const seedBrackets = async () => {
  const dbService = DatabaseService.getInstance();
  try {
    await dbService.connect(); 
    const db = dbService.getDb();
    //get first user for testing
    const users = await db.collection('users').find({}).toArray();
    if (users.length === 0) {
      console.error('No users found! Make sure you have seeded users first.');
      return;
    }else{
      console.log("users found", users)
    }
    const userId = users[0]._id;
    const brackets = new Array(3).fill(null).map((_, i) => ({
        _id: new ObjectId(),
        userId, // dynamically set from the fetched user
        name: `bracket ${i}th iteration`,
        bracket: arrayOfBrackets[i],
        offshootBracket: arrayOfOffshoots[i],
        createdAt: now,
        updatedAt: now
    }));
    
    const bracketsCollection = db.collection('brackets');

    // Insert bracket documents into the database
    await bracketsCollection.insertMany(brackets);
    console.log('Brackets seeded successfully');
  } catch (error) {
    console.error('Error seeding brackets:', error);
  }finally{
    await dbService.disconnect()
  }
};

seedBrackets().catch(console.error);
