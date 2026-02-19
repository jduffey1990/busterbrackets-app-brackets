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
exports.bracketRoutes = void 0;
const bracketService_1 = require("../controllers/bracketService");
const mongodb_1 = require("mongodb");
exports.bracketRoutes = [
    {
        method: 'GET',
        path: '/ping-bracket',
        handler: (request, h) => {
            return h.response("pinged backend").code(200);
        },
        options: {
            auth: false,
        },
    },
    {
        method: 'GET',
        path: '/get-bracket',
        handler: (request, h) => {
            const id = request.query.id;
            if (!id) {
                return h.response("Bracket ID is required").code(400);
            }
            return bracketService_1.BracketService.findBracketById(id);
        }
    },
    {
        method: 'GET',
        path: '/get-user-brackets',
        handler: (request, h) => {
            const id = request.query.id;
            if (!id) {
                return h.response("User ID is required").code(400);
            }
            return bracketService_1.BracketService.findBracketByUserId(id);
        }
    },
    {
        method: 'POST',
        path: '/create-bracket',
        handler: (request, h) => __awaiter(void 0, void 0, void 0, function* () {
            const payload = request.payload;
            // Validate the structured bracket payload
            const bracketData = payload.bracket;
            if (!bracketData || !bracketData.east || !bracketData.west ||
                !bracketData.south || !bracketData.midwest || !bracketData.finals) {
                return h.response({
                    error: 'Invalid bracket structure. Must include east, west, south, midwest, and finals.'
                }).code(400);
            }
            const now = new Date();
            const bracket = {
                _id: new mongodb_1.ObjectId(),
                userId: new mongodb_1.ObjectId(payload.userId),
                name: payload.name,
                createdAt: now,
                updatedAt: now,
                bracket: bracketData,
                offshootBracket: bracketData, // copy at creation time, same as before
            };
            return bracketService_1.BracketService.createBracket(bracket);
        }),
        options: {
            auth: false,
        },
    }
];
