import Jwt from '@hapi/jwt';
import { Server } from '@hapi/hapi';
import { createServer } from '../server';
import { TournamentGameService } from '../controllers/tournamentGameService';
import { gamesFromBracket } from '../controllers/gameDerivation';
import { historicalGames } from '../data/historicalGames';
import type { TournamentGame } from '../models/tournamentGame';
import type { StructuredBracket } from '../models/tournamentData';

const SECRET = 'test-secret';
type Result = { year: number; seed: string; priorStrength: number; bracket: StructuredBracket };

describe('POST /simulate-bracket', () => {
  let server: Server;
  let findBefore: jest.SpyInstance;
  const token = Jwt.token.generate({ id: 'u1', username: 'test' }, SECRET);

  beforeAll(async () => {
    server = await createServer(SECRET);
  });

  beforeEach(() => {
    findBefore = jest.spyOn(TournamentGameService, 'findBefore')
      .mockResolvedValue(historicalGames().filter((g) => g.year < 2026) as unknown as TournamentGame[]);
  });

  afterEach(() => findBefore.mockRestore());

  const post = (payload: unknown, auth = true) =>
    server.inject({ method: 'POST', url: '/simulate-bracket', headers: auth ? { authorization: `Bearer ${token}` } : {}, payload: payload as object });

  it('is 401 without a token', async () => {
    expect((await post({ year: 2026 }, false)).statusCode).toBe(401);
    expect(findBefore).not.toHaveBeenCalled();
  });

  it('validates year, favorite, boost and seed', async () => {
    expect((await post({})).statusCode).toBe(400);
    expect((await post({ year: 'next' })).statusCode).toBe(400);
    expect((await post({ year: 2026, favorite: 'Duke' })).statusCode).toBe(400);
    expect((await post({ year: 2026, favorite: 'e17' })).statusCode).toBe(400);
    expect((await post({ year: 2026, favorite: 'e01' })).statusCode).toBe(400);
    expect((await post({ year: 2026, favorite: 7 })).statusCode).toBe(400);
    expect((await post({ year: 2026, boost: 101 })).statusCode).toBe(400);
    expect((await post({ year: 2026, boost: 'lots' })).statusCode).toBe(400);
    expect((await post({ year: 2026, seed: '' })).statusCode).toBe(400);
    expect(findBefore).not.toHaveBeenCalled();
  });

  it('returns a complete bracket with its seed, from games before the year', async () => {
    const res = await post({ year: 2026 });
    expect(res.statusCode).toBe(200);
    expect(findBefore).toHaveBeenCalledWith(2026);
    const body = res.result as Result;
    expect(body.year).toBe(2026);
    expect(body.seed).toMatch(/^[0-9a-f]{16}$/);
    expect(body.priorStrength).toBe(80);
    expect(gamesFromBracket(2026, body.bracket)).toHaveLength(63);
  });

  it('replays the same bracket for the same seed and honors a favorite', async () => {
    const first = (await post({ year: 2026, seed: 'replay' })).result as Result;
    const again = (await post({ year: 2026, seed: 'replay' })).result as Result;
    expect(again.bracket).toEqual(first.bracket);
    const loyal = (await post({ year: 2026, favorite: 's15', boost: 100, seed: 'replay' })).result as Result;
    expect(loyal.bracket.finals.champion).toBe('s15');
  });
});
