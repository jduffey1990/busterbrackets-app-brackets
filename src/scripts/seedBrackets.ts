// src/scripts/seedBrackets.ts
import { ObjectId } from 'mongodb';
const Bcrypt = require('bcrypt');

import { DatabaseService } from '../controllers/mongodb.service';
import { Bracket } from '../models/bracket';

const arrayOfUsers: string[] = [
  "67a295f0f276391bb6b46475",
  "67a295f0f276391bb6b46476",
  "67a295f0f276391bb6b46477",
  "67a295f0f276391bb6b46478",
  "67a295f0f276391bb6b46479",
  "67a295f0f276391bb6b4647a",
  "67a295f0f276391bb6b4647b",
  "67a295f0f276391bb6b4647c",
  "67a295f0f276391bb6b4647d",
  "67a295f0f276391bb6b4647e"
];

const baseBracket = [
  1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15,
  1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15,
  1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15,
  1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15
];

const baseOffshoot = [
  1, 8, 5, 4, 6, 3, 7, 2,   // maybe “winners” of the first region
  1, 8, 5, 4, 6, 3, 7, 2    // repeated for demonstration or another region
];

// Create 10 bracket arrays (one per user). 
// You can randomize, customize seeds, or store winners/picks as needed.
const arrayOfBrackets: number[][] = new Array(10).fill(null).map(() => ([ ...baseBracket ]));

// Create 10 offshoot arrays (one per user). 
// Adjust length/values to represent deeper-round picks or alternate paths.
const arrayOfOffshoots: number[][] = new Array(10).fill(null).map(() => ([ ...baseOffshoot ]));

// Build the Bracket documents:
const brackets: Bracket[] = arrayOfUsers.map((userIdString, i) => ({
    _id: new ObjectId(),
    userId: new ObjectId(userIdString), // Convert string to ObjectId
  bracket: arrayOfBrackets[i],
  offshootBracket: arrayOfOffshoots[i]
}));

const seedBrackets = async () => {
  try {
    // 1. Initialize and connect to the database
    const dbService = DatabaseService.getInstance();
    await dbService.connect();  // <--- make sure we connect

    // 2. Now get the DB and do your insert
    const db = dbService.getDb();
    const bracketsCollection = db.collection('brackets');

    // Insert bracket documents into the database
    await bracketsCollection.insertMany(brackets);
    console.log('Brackets seeded successfully');
  } catch (error) {
    console.error('Error seeding brackets:', error);
  }
};

seedBrackets().catch(console.error);
