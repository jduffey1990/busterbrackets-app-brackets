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
// src/controllers/bracketService.ts
const mongodb_1 = require("mongodb");
const mongodb_service_1 = require("./mongodb.service");
class BracketService {
    /**
     * Fetch all brackets.
     */
    static findAllBrackets() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
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
     * Fetch a single bracket by ID.
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
    /**
     * Fetch all brackets for a user.
     */
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
    /**
     * Cache a generated AI breakdown on the bracket document.
     */
    static saveBreakdown(id, aiBreakdown) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const db = mongodb_service_1.DatabaseService.getInstance().getDb();
                yield db
                    .collection('brackets')
                    .updateOne({ _id: new mongodb_1.ObjectId(id) }, { $set: { aiBreakdown } });
            }
            catch (error) {
                // Caching is best-effort — a failure here shouldn't fail the request.
                console.error('Failed to cache bracket breakdown:', error);
            }
        });
    }
    /**
     * Create a new bracket.
     * Accepts StructuredBracket format (post-migration).
     */
    static createBracket(bracketObject) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const db = mongodb_service_1.DatabaseService.getInstance().getDb();
                const insertResult = yield db.collection('brackets').insertOne(bracketObject);
                if (insertResult.acknowledged) {
                    const createdBracket = yield db
                        .collection('brackets')
                        .findOne({ _id: insertResult.insertedId });
                    return createdBracket || null;
                }
                return null;
            }
            catch (error) {
                console.error('Failed to create bracket:', error);
                throw error;
            }
        });
    }
}
exports.BracketService = BracketService;
