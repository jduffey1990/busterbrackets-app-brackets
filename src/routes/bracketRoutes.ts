// src/routes/bracketRoutes.ts
import { Request, ResponseToolkit } from '@hapi/hapi';
import { BracketService } from '../controllers/bracketService';
import { Bracket } from '../models/bracket';
import { StructuredBracket } from '../models/tournamentData';
import { ObjectId } from 'mongodb';

export const bracketRoutes = [
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
            const id = request.query.id as string;
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
            const id = request.query.id as string;
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

          // Validate the structured bracket payload
          const bracketData = payload.bracket as StructuredBracket;
          if (!bracketData || !bracketData.east || !bracketData.west || 
              !bracketData.south || !bracketData.midwest || !bracketData.finals) {
            return h.response({ 
              error: 'Invalid bracket structure. Must include east, west, south, midwest, and finals.' 
            }).code(400);
          }

          const now = new Date();
          const bracket: Bracket = {
            _id: new ObjectId(),
            userId: new ObjectId(payload.userId),
            name: payload.name,
            createdAt: now,
            updatedAt: now,
            bracket: bracketData,
            offshootBracket: bracketData,  // copy at creation time, same as before
          };

          return BracketService.createBracket(bracket);
        },
        options: {
          auth: false,
        },
    }
];