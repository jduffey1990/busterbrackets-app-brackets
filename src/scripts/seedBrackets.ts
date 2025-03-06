// src/scripts/seedBrackets.ts
import { ObjectId } from 'mongodb';
const Bcrypt = require('bcrypt');

import { DatabaseService } from '../controllers/mongodb.service';
import { Bracket } from '../models/bracket';

const baseBracket = ["e1", "e8", "e5", "e4", "e6", "e3", "e7", "e2", "e1", "e5", "e6", "e2", "e1", "e2", "w1", "w8", "w5", "w4", "w6", "w3", "w7", "w2", "w1", "w5", "w6", "w2", "w1", "w2", "m1", "m8", "m5", "m4", "m6", "m3", "m7", "m2", "m1", "m5", "m6", "m2", "m1", "m2", "s1", "s8", "s5", "s4", "s6", "s3", "s7", "s2", "s1", "s5", "s6", "s2", "s1", "s2", "e1", "w1", "m1", "s1", "e1", "s1", "e1"]

const baseOffshoot = ["e1", "e8", "e5", "e4", "e6", "e3", "e7", "e2", "e1", "e5", "e6", "e2", "e1", "e2", "w1", "w8", "w5", "w4", "w6", "w3", "w7", "w2", "w1", "w5", "w6", "w2", "w1", "w2", "m1", "m8", "m5", "m4", "m6", "m3", "m7", "m2", "m1", "m5", "m6", "m2", "m1", "m2", "s1", "s8", "s5", "s4", "s6", "s3", "s7", "s2", "s1", "s5", "s6", "s2", "s1", "s2", "e1", "w1", "m1", "s1", "e1", "s1", "e1"]



const arrayOfBrackets: string[][] = new Array(3).fill(null).map(() => ([ ...baseBracket ]));
const arrayOfOffshoots: string[][] = new Array(3).fill(null).map(() => ([ ...baseOffshoot ]));

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
