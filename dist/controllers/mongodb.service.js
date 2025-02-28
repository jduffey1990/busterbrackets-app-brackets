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
exports.DatabaseService = void 0;
// brackets/src/controllers/mongodb.service.ts
const mongodb_1 = require("mongodb");
class DatabaseService {
    constructor() {
        this.client = null; // Store the actual client
        this.db = null;
    }
    /**
     * The static method to access the single `DatabaseService` instance.
     */
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    /**
     * Connect to MongoDB only once. If `this.db` already exists, just return it.
     */
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.db) {
                // Already connected; just return it
                return this.db;
            }
            // Otherwise, create a new connection
            const url = process.env.MONGO_URI || "mongodb://localhost:27017/busterBrackets";
            this.client = new mongodb_1.MongoClient(url);
            yield this.client.connect();
            this.db = this.client.db();
            console.log('Connected successfully to MongoDB (singleton).');
            return this.db;
        });
    }
    /**
     * Get the `Db` object directly. Throws if not connected.
     */
    getDb() {
        if (!this.db) {
            throw new Error('DatabaseService not connected. Call connect() first.');
        }
        return this.db;
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.client) {
                yield this.client.close();
                console.log('Disconnected from MongoDB.');
                this.client = null;
                this.db = null;
            }
        });
    }
}
exports.DatabaseService = DatabaseService;
