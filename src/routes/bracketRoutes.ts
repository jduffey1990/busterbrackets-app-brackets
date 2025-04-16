// src/routes/users.ts
import { Request, ResponseToolkit } from '@hapi/hapi';
const Bcrypt = require('bcrypt');

import { BracketService } from '../controllers/bracketService';
import { Bracket } from '../models/bracket'
import { ObjectId } from 'mongodb';

export const bracketRoutes = [
    // {
    //     method: 'GET',
    //     path: '/brackets',
    //     handler: (request: Request, h: ResponseToolkit) => {
    //         return BracketService.findAllBrackets()
    //     },
    //     options: {
    //         auth: false
    //     }
    // },
    {
      method: 'GET',
      path: '/ping-bracket',
      handler: (request: Request, h: ResponseToolkit) => {
        return h.response("pinged backend").code(200);
      },
      options: {
        auth: false,
      },
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
    },
    {
        method: 'POST',
        path: '/create-bracket',
        handler: async (request: Request, h: ResponseToolkit) => {
          const payload = request.payload as any;
      
          // Build the bracket object that matches your interface
          const now = new Date()
          const bracket: Bracket = {
            _id: new ObjectId(),
            userId: new ObjectId(payload.userId),
            name: payload.name,
            createdAt: now,
            updatedAt:now,
            bracket:payload.bracket,
            offshootBracket: payload.bracket,
          };
      
          return BracketService.createBracket(bracket);
        },
        options: {
          auth: false,
        },
      }
];
