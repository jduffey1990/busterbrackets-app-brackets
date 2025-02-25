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
exports.BracketService = void 0;
// src/controllers/userService.ts
const mongodb_1 = require("mongodb");
const mongodb_service_1 = require("./mongodb.service");
class BracketService {
    /**
     * Fetch all users from the "users" collection.
     */
    static findAllBrackets() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Grab the existing DB connection from the singleton
                const db = mongodb_service_1.DatabaseService.getInstance().getDb();
                const bracketsCollection = db.collection('brackets');
                return yield bracketsCollection.find().toArray();
            }
            catch (error) {
                console.error('Failed to fetch brackets:', error);
                throw error;
            }
        });
    }
    /**
     * Fetch a single user by ID from the "users" collection.
     */
    static findBracketById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const db = mongodb_service_1.DatabaseService.getInstance().getDb();
                const bracket = yield db
                    .collection('brackets')
                    .findOne({ _id: new mongodb_1.ObjectId(id) });
                return bracket;
            }
            catch (error) {
                console.error('Failed to find bracket:', error);
                throw error;
            }
        });
    }
    static findBracketByUserId(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const db = mongodb_service_1.DatabaseService.getInstance().getDb();
                const bracketsCollection = db.collection('brackets');
                return yield bracketsCollection.find({ userId: new mongodb_1.ObjectId(id) }).toArray();
            }
            catch (error) {
                console.error('Failed to find bracket:', error);
                throw error;
            }
        });
    }
}
exports.BracketService = BracketService;
