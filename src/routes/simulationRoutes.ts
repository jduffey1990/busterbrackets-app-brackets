// src/routes/simulationRoutes.ts
import { Request, ResponseToolkit } from '@hapi/hapi';
import { SimulationService } from '../controllers/simulationService';
import { seedOf } from '../controllers/simulation';

export const simulationRoutes = [
  {
    method: 'POST',
    path: '/simulate-bracket',
    handler: async (request: Request, h: ResponseToolkit) => {
      const payload = (request.payload ?? {}) as Record<string, unknown>;
      const year = Number(payload.year);
      if (!Number.isInteger(year) || year < 1985) {
        return h.response({ error: 'year must be an integer tournament year' }).code(400);
      }
      const favorite = payload.favorite;
      if (favorite !== undefined && favorite !== null && favorite !== '') {
        try {
          seedOf(String(favorite));
        } catch {
          return h.response({ error: 'favorite must be a seed key like "m1"' }).code(400);
        }
      }
      const boost = payload.boost === undefined || payload.boost === null ? 0 : Number(payload.boost);
      if (!Number.isFinite(boost) || boost < 0 || boost > 100) {
        return h.response({ error: 'boost must be a number from 0 to 100' }).code(400);
      }
      const seed = payload.seed;
      if (seed !== undefined && (typeof seed !== 'string' || seed.length === 0 || seed.length > 64)) {
        return h.response({ error: 'seed must be a string of 1 to 64 characters' }).code(400);
      }

      return SimulationService.simulate({
        year,
        favorite: favorite ? (favorite as string) : undefined,
        boost,
        seed: seed as string | undefined,
      });
    },
  },
];
