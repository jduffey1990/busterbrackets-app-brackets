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
exports.TournamentDataService = void 0;
// src/controllers/tournamentDataService.ts
const mongodb_1 = require("mongodb");
const mongodb_service_1 = require("./mongodb.service");
class TournamentDataService {
    /**
     * Get tournament data for a specific year.
     */
    static findByYear(year) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const db = mongodb_service_1.DatabaseService.getInstance().getDb();
                return yield db
                    .collection('tournamentData')
                    .findOne({ year });
            }
            catch (error) {
                console.error('Failed to find tournament data:', error);
                throw error;
            }
        });
    }
    /**
     * Get the current year's tournament data (convenience).
     */
    static findCurrent() {
        return __awaiter(this, void 0, void 0, function* () {
            const currentYear = new Date().getFullYear();
            return this.findByYear(currentYear);
        });
    }
    /**
     * Get all available tournament years (for dropdowns, etc.).
     */
    static findAllYears() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const db = mongodb_service_1.DatabaseService.getInstance().getDb();
                const docs = yield db
                    .collection('tournamentData')
                    .find({}, { projection: { year: 1 } })
                    .sort({ year: -1 })
                    .toArray();
                return docs.map(d => d.year);
            }
            catch (error) {
                console.error('Failed to fetch tournament years:', error);
                throw error;
            }
        });
    }
    /**
     * Create a new tournament data entry for a given year.
     * Rejects if data for that year already exists.
     */
    static create(year, teams) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const db = mongodb_service_1.DatabaseService.getInstance().getDb();
                const collection = db.collection('tournamentData');
                // Guard against duplicate years
                const existing = yield collection.findOne({ year });
                if (existing) {
                    throw new Error(`Tournament data for ${year} already exists. Use update instead.`);
                }
                const now = new Date();
                const doc = {
                    _id: new mongodb_1.ObjectId(),
                    year,
                    teams,
                    results: null,
                    createdAt: now,
                    updatedAt: now,
                };
                const result = yield collection.insertOne(doc);
                if (result.acknowledged) {
                    return yield collection.findOne({ _id: result.insertedId });
                }
                return null;
            }
            catch (error) {
                console.error('Failed to create tournament data:', error);
                throw error;
            }
        });
    }
    /**
     * Update teams mapping for an existing year.
     */
    static updateTeams(year, teams) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const db = mongodb_service_1.DatabaseService.getInstance().getDb();
                const collection = db.collection('tournamentData');
                const result = yield collection.findOneAndUpdate({ year }, { $set: { teams, updatedAt: new Date() } }, { returnDocument: 'after' });
                return result || null;
            }
            catch (error) {
                console.error('Failed to update tournament teams:', error);
                throw error;
            }
        });
    }
    /**
     * Update tournament results (can be partial — called as games complete).
     */
    static updateResults(year, results) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const db = mongodb_service_1.DatabaseService.getInstance().getDb();
                const collection = db.collection('tournamentData');
                const result = yield collection.findOneAndUpdate({ year }, { $set: { results, updatedAt: new Date() } }, { returnDocument: 'after' });
                return result || null;
            }
            catch (error) {
                console.error('Failed to update tournament results:', error);
                throw error;
            }
        });
    }
}
exports.TournamentDataService = TournamentDataService;
