// src/routes/oddsRoutes.ts
import { Request, ResponseToolkit } from '@hapi/hapi';
import { OddsService } from '../controllers/oddsService';

export const oddsRoutes = [
  {
    method: 'GET',
    path: '/odds',
    handler: async (request: Request, h: ResponseToolkit) => {
      const year = parseInt(request.query.year as string, 10);
      if (!year || isNaN(year)) {
        return h.response({ error: 'Valid year query parameter is required' }).code(400);
      }
      const odds = await OddsService.forYear(year);
      return {
        year,
        priorStrength: odds.priorStrength,
        strengths: odds.strengths.slice(1),
        matchups: Object.fromEntries(odds.matchups),
      };
    },
  },
];
