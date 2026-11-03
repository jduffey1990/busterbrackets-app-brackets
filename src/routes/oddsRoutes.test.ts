import Jwt from '@hapi/jwt';
import { Server } from '@hapi/hapi';
import { createServer } from '../server';
import { TournamentGameService } from '../controllers/tournamentGameService';
import { historicalGames } from '../data/historicalGames';
import type { TournamentGame } from '../models/tournamentGame';

const SECRET = 'test-secret';

describe('GET /odds', () => {
  let server: Server;
  let findBefore: jest.SpyInstance;

  beforeAll(async () => {
    server = await createServer(SECRET);
  });

  beforeEach(() => {
    findBefore = jest.spyOn(TournamentGameService, 'findBefore');
  });

  afterEach(() => findBefore.mockRestore());

  const get = (url: string, token?: string) =>
    server.inject({ method: 'GET', url, headers: token ? { authorization: `Bearer ${token}` } : {} });

  it('is 401 without a token', async () => {
    const res = await get('/odds?year=2026');
    expect(res.statusCode).toBe(401);
    expect(findBefore).not.toHaveBeenCalled();
  });

  it('is 400 without a usable year', async () => {
    const token = Jwt.token.generate({ id: 'u1', username: 'test' }, SECRET);
    expect((await get('/odds', token)).statusCode).toBe(400);
    expect((await get('/odds?year=soon', token)).statusCode).toBe(400);
    expect(findBefore).not.toHaveBeenCalled();
  });

  it('returns the table built from games before the requested year', async () => {
    const before2026 = historicalGames().filter((g) => g.year < 2026) as unknown as TournamentGame[];
    findBefore.mockResolvedValue(before2026);
    const token = Jwt.token.generate({ id: 'u1', username: 'test' }, SECRET);
    const res = await get('/odds?year=2026', token);
    expect(res.statusCode).toBe(200);
    expect(findBefore).toHaveBeenCalledWith(2026);
    const body = res.result as { year: number; priorStrength: number; strengths: number[]; matchups: Record<string, { wins: number; losses: number; prior: number; probability: number }> };
    expect(body.year).toBe(2026);
    expect(body.strengths).toHaveLength(16);
    expect(Object.keys(body.matchups)).toHaveLength(120);
    expect(body.matchups['1vs16']).toMatchObject({ wins: 158, losses: 2 });
    expect(body.matchups['1vs16'].probability).toBeGreaterThan(0.95);
  });
});
