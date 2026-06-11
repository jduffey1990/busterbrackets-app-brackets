// src/routes/newsRoutes.ts
import { Request, ResponseToolkit } from '@hapi/hapi';
import { NewsService } from '../controllers/newsService';

export const newsRoutes = [
  {
    method: 'GET',
    path: '/news',
    handler: async (request: Request, h: ResponseToolkit) => {
      try {
        return await NewsService.getLatest();
      } catch (error) {
        console.error('Failed to fetch news:', error);
        return h.response({ error: 'News is unavailable right now' }).code(502);
      }
    },
  },
];
