"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/scripts/seedBrackets.ts
const mongodb_1 = require("mongodb");
const Bcrypt = require('bcrypt');
const mongodb_service_1 = require("../controllers/mongodb.service");
const arrayOfUsers = ["67c08eabe3e706cfd9dd4d70", "67c08eabe3e706cfd9dd4d70", "67c08eabe3e706cfd9dd4d70"];
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
const arrayOfBrackets = new Array(3).fill(null).map(() => ([...baseBracket]));
const arrayOfOffshoots = new Array(3).fill(null).map(() => ([...baseOffshoot]));
const now = new Date();
// Build the Bracket documents:
const brackets = arrayOfUsers.map((userIdString, i) => ({
    _id: new mongodb_1.ObjectId(),
    userId: new mongodb_1.ObjectId(userIdString), // Convert string to ObjectId
    name: `bracket ${i}th iteration`,
    bracket: arrayOfBrackets[i],
    offshootBracket: arrayOfOffshoots[i],
    createdAt: now,
    updatedAt: now
}));
console.log('Brackets count:', brackets.length);
console.log('Brackets:', brackets);
const seedBrackets = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Brackets count:', brackets.length);
    console.log('Brackets:', brackets);
    try {
        // 1. Initialize and connect to the database
        const dbService = mongodb_service_1.DatabaseService.getInstance();
        yield dbService.connect(); // <--- make sure we connect
        // 2. Now get the DB and do your insert
        const db = dbService.getDb();
        const bracketsCollection = db.collection('brackets');
        // Insert bracket documents into the database
        yield bracketsCollection.insertMany(brackets);
        console.log('Brackets seeded successfully');
    }
    catch (error) {
        console.error('Error seeding brackets:', error);
    }
});
seedBrackets().catch(console.error);
