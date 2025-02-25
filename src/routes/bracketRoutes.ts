// src/routes/users.ts
import { Request, ResponseToolkit } from '@hapi/hapi';
const Bcrypt = require('bcrypt');

import { BracketService } from '../controllers/bracketService';

export const bracketRoutes = [
    {
        method: 'GET',
        path: '/brackets',
        handler: (request: Request, h: ResponseToolkit) => {
            return BracketService.findAllBrackets()
        },
        options: {
            auth: false
        }
    },
    {
        method: 'GET',
        path: '/get-bracket',
        handler: (request: Request, h: ResponseToolkit) => {
            const id = request.query.id as string;  // Access query parameter
            if (!id) {
                return h.response("Bracket ID is required").code(400);
            }
            return BracketService.findBracketById(id);
        }
    },
    {
        method: 'GET',
        path: '/get-user-brackets',
        handler: (request: Request, h: ResponseToolkit) => {
            const id = request.query.id as string;  // Access query parameter
            if (!id) {
                return h.response("User ID is required").code(400);
            }
            return BracketService.findBracketByUserId(id);
        }
    }
];
