import Jwt from '@hapi/jwt';
import { Server } from '@hapi/hapi';
import { createServer } from '../server';
import { TournamentDataService } from '../controllers/tournamentDataService';
import { BracketConsistencyError } from '../controllers/gameDerivation';
import { results2026 } from '../data/tournament2026';

const SECRET = 'test-secret';
const ADMIN_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

const tokenFor = (id: string) => Jwt.token.generate({ id, username: 'test' }, SECRET);

describe('PUT /tournament-data/results', () => {
  let server: Server;
  let updateResults: jest.SpyInstance;

  beforeAll(async () => {
    process.env.ADMIN_USER_ID = ADMIN_ID;
    server = await createServer(SECRET);
  });

  beforeEach(() => {
    updateResults = jest.spyOn(TournamentDataService, 'updateResults');
  });

  afterEach(() => updateResults.mockRestore());

  const put = (token: string | null, payload: object) =>
    server.inject({
      method: 'PUT',
      url: '/tournament-data/results',
      headers: token ? { authorization: `Bearer ${token}` } : {},
      payload,
    });

  it('is 401 without a token', async () => {
    const res = await put(null, { year: 2026, results: results2026 });
    expect(res.statusCode).toBe(401);
    expect(updateResults).not.toHaveBeenCalled();
  });

  it('is 403, not 500, for a signed-in non-admin', async () => {
    const res = await put(tokenFor(OTHER_ID), { year: 2026, results: results2026 });
    expect(res.statusCode).toBe(403);
    expect(res.result).toMatchObject({ message: 'Forbidden: admin access required' });
    expect(updateResults).not.toHaveBeenCalled();
  });

  it('is 400 with the reason when the bracket is inconsistent', async () => {
    updateResults.mockRejectedValue(new BracketConsistencyError('2026 semifinal game 1: winner w1 did not play (e1 vs m1)'));
    const res = await put(tokenFor(ADMIN_ID), { year: 2026, results: results2026 });
    expect(res.statusCode).toBe(400);
    expect(res.result).toEqual({ error: '2026 semifinal game 1: winner w1 did not play (e1 vs m1)' });
  });

  it('is 404 for a year with no tournament data', async () => {
    updateResults.mockResolvedValue(null);
    const res = await put(tokenFor(ADMIN_ID), { year: 1999, results: results2026 });
    expect(res.statusCode).toBe(404);
  });

  it('is 400 when year or results is missing', async () => {
    const res = await put(tokenFor(ADMIN_ID), { year: 2026 });
    expect(res.statusCode).toBe(400);
    expect(updateResults).not.toHaveBeenCalled();
  });

  it('returns the updated document for the admin', async () => {
    const doc = { year: 2026, teams: {}, results: results2026 };
    updateResults.mockResolvedValue(doc as never);
    const res = await put(tokenFor(ADMIN_ID), { year: 2026, results: results2026 });
    expect(res.statusCode).toBe(200);
    expect(updateResults).toHaveBeenCalledWith(2026, results2026);
    expect(res.result).toEqual(doc);
  });
});
