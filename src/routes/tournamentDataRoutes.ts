// src/routes/tournamentDataRoutes.ts
import { Request, ResponseToolkit } from '@hapi/hapi';
import { TournamentDataService } from '../controllers/tournamentDataService';
import { StructuredBracket } from '../models/tournamentData';

/**
 * Admin guard helper.
 * Checks the authenticated user's ID against the ADMIN_USER_ID env var.
 * 
 * This avoids needing to modify the JWT payload or make cross-service calls.
 * Set ADMIN_USER_ID in your .env to your own MongoDB user _id string.
 */
function assertAdmin(request: Request, h: ResponseToolkit): void {
  const userId = request.auth.credentials.userId as string;
  const adminId = process.env.ADMIN_USER_ID;

  if (!adminId) {
    throw new Error('ADMIN_USER_ID environment variable is not configured.');
  }

  if (userId !== adminId) {
    throw h.response({ error: 'Forbidden: admin access required' }).code(403).takeover();
  }
}

export const tournamentDataRoutes = [

  // ─── Public (authenticated) routes ─────────────────────────────────

  {
    method: 'GET',
    path: '/tournament-data',
    handler: async (request: Request, h: ResponseToolkit) => {
      const year = parseInt(request.query.year as string, 10);
      if (!year || isNaN(year)) {
        return h.response({ error: 'Valid year query parameter is required' }).code(400);
      }
      const data = await TournamentDataService.findByYear(year);
      if (!data) {
        return h.response({ error: `No tournament data found for ${year}` }).code(404);
      }
      return data;
    },
  },

  {
    method: 'GET',
    path: '/tournament-data/current',
    handler: async (request: Request, h: ResponseToolkit) => {
      const data = await TournamentDataService.findCurrent();
      if (!data) {
        return h.response({ error: 'No tournament data found for the current year' }).code(404);
      }
      return data;
    },
  },

  {
    method: 'GET',
    path: '/tournament-data/years',
    handler: async (request: Request, h: ResponseToolkit) => {
      const years = await TournamentDataService.findAllYears();
      return { years };
    },
  },

  // ─── Admin-only routes ─────────────────────────────────────────────

  {
    method: 'POST',
    path: '/tournament-data',
    handler: async (request: Request, h: ResponseToolkit) => {
      assertAdmin(request, h);

      const payload = request.payload as any;
      if (!payload.year || !payload.teams) {
        return h.response({ error: 'year and teams are required' }).code(400);
      }

      // Basic validation: should have 64 team entries
      const teamKeys = Object.keys(payload.teams);
      if (teamKeys.length !== 64) {
        return h.response({ 
          error: `Expected 64 team entries, got ${teamKeys.length}` 
        }).code(400);
      }

      // Validate all expected keys are present
      const expectedPrefixes = ['e', 'w', 's', 'm'];
      const expectedSeeds = Array.from({ length: 16 }, (_, i) => i + 1);
      const expectedKeys = expectedPrefixes.flatMap(p => expectedSeeds.map(s => `${p}${s}`));
      const missingKeys = expectedKeys.filter(k => !payload.teams[k]);
      if (missingKeys.length > 0) {
        return h.response({ 
          error: `Missing team entries: ${missingKeys.join(', ')}` 
        }).code(400);
      }

      try {
        const data = await TournamentDataService.create(payload.year, payload.teams);
        if (data === null) {
          return h.response({ error: 'Failed to create tournament data' }).code(500);
        }
        return h.response(data).code(201);
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          return h.response({ error: error.message }).code(409);
        }
        throw error;
      }
    },
  },

  {
    method: 'PUT',
    path: '/tournament-data/teams',
    handler: async (request: Request, h: ResponseToolkit) => {
      assertAdmin(request, h);

      const payload = request.payload as any;
      if (!payload.year || !payload.teams) {
        return h.response({ error: 'year and teams are required' }).code(400);
      }

      const data = await TournamentDataService.updateTeams(payload.year, payload.teams);
      if (!data) {
        return h.response({ error: `No tournament data found for ${payload.year}` }).code(404);
      }
      return data;
    },
  },

  {
    method: 'PUT',
    path: '/tournament-data/results',
    handler: async (request: Request, h: ResponseToolkit) => {
      assertAdmin(request, h);

      const payload = request.payload as any;
      if (!payload.year || !payload.results) {
        return h.response({ error: 'year and results are required' }).code(400);
      }

      const results = payload.results as StructuredBracket;
      const data = await TournamentDataService.updateResults(payload.year, results);
      if (!data) {
        return h.response({ error: `No tournament data found for ${payload.year}` }).code(404);
      }
      return data;
    },
  },
];