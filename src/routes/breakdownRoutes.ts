// src/routes/breakdownRoutes.ts
import { Request, ResponseToolkit } from '@hapi/hapi';
import { BreakdownService } from '../controllers/breakdownService';

export const breakdownRoutes = [
  {
    // Authenticated by default (jwt). The server owns the whole flow:
    // load bracket + tournament data, compare, prompt, and call OpenAI.
    method: 'GET',
    path: '/breakdown',
    handler: async (request: Request, h: ResponseToolkit) => {
      const id = request.query.id as string;
      if (!id) {
        return h.response({ error: 'Bracket id is required' }).code(400);
      }

      try {
        const result = await BreakdownService.buildBreakdown(id);
        if (!result) {
          return h.response({ error: `No bracket found for id ${id}` }).code(404);
        }
        return result;
      } catch (err: any) {
        console.error('Breakdown generation failed:', err?.message ?? err);
        return h.response({ error: 'Failed to generate breakdown' }).code(502);
      }
    },
  },
];
