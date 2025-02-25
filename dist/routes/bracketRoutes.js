"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bracketRoutes = void 0;
const Bcrypt = require('bcrypt');
const bracketService_1 = require("../controllers/bracketService");
exports.bracketRoutes = [
    {
        method: 'GET',
        path: '/brackets',
        handler: (request, h) => {
            return bracketService_1.BracketService.findAllBrackets();
        },
        options: {
            auth: false
        }
    },
    {
        method: 'GET',
        path: '/get-bracket',
        handler: (request, h) => {
            const id = request.query.id; // Access query parameter
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
            const id = request.query.id; // Access query parameter
            if (!id) {
                return h.response("User ID is required").code(400);
            }
            return bracketService_1.BracketService.findBracketByUserId(id);
        }
    }
];
