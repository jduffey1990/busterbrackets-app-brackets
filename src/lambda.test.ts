// lambda.test.ts
//
// Drives the real Lambda handler with API Gateway HTTP API (v2) events, the
// same shape production receives. Mongo is mocked; nothing here needs a
// network or a database.
process.env.JWT_SECRET = 'test-secret';

const connect = jest.fn().mockResolvedValue({});
jest.mock('./controllers/mongodb.service', () => ({
  DatabaseService: {
    getInstance: () => ({
      connect,
      getDb: () => {
        throw new Error('getDb should not be reached in these tests');
      },
    }),
  },
}));

import Jwt from '@hapi/jwt';
import { handler, resetForTests } from './lambda';
import { TournamentGameService } from './controllers/tournamentGameService';
import { historicalGames } from './data/historicalGames';
import type { TournamentGame } from './models/tournamentGame';

function httpEvent(opts: { method: string; path: string; query?: string; headers?: Record<string, string> }) {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: opts.path,
    rawQueryString: opts.query ?? '',
    headers: { host: 'brackets-api.busterbrackets.com', ...(opts.headers ?? {}) },
    requestContext: {
      accountId: '123456789012',
      apiId: 'api',
      domainName: 'brackets-api.busterbrackets.com',
      http: {
        method: opts.method,
        path: opts.path,
        protocol: 'HTTP/1.1',
        sourceIp: '203.0.113.7',
        userAgent: 'jest',
      },
      requestId: 'req-1',
      routeKey: '$default',
      stage: '$default',
      time: '04/Nov/2026:12:00:00 +0000',
      timeEpoch: 1793793600000,
    },
    isBase64Encoded: false,
  };
}

const lambdaContext = {
  awsRequestId: 'aws-req-1',
  functionName: 'bb-brackets',
  getRemainingTimeInMillis: () => 29000,
};

beforeEach(() => {
  resetForTests();
  connect.mockClear();
  connect.mockResolvedValue({});
});

describe('lambda handler', () => {
  it('connects Mongo once per container across requests', async () => {
    const first: any = await handler(httpEvent({ method: 'GET', path: '/odds', query: 'year=2026' }), lambdaContext);
    const second: any = await handler(httpEvent({ method: 'GET', path: '/odds', query: 'year=2026' }), lambdaContext);

    expect(first.statusCode).toBe(401);
    expect(second.statusCode).toBe(401);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('retries the cold start after a failed Mongo connect instead of failing forever', async () => {
    connect.mockRejectedValueOnce(new Error('atlas unreachable'));

    await expect(handler(httpEvent({ method: 'GET', path: '/odds', query: 'year=2026' }), lambdaContext)).rejects.toThrow('atlas unreachable');
    const retried: any = await handler(httpEvent({ method: 'GET', path: '/odds', query: 'year=2026' }), lambdaContext);

    expect(retried.statusCode).toBe(401);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('rejects a protected route without a token', async () => {
    const res: any = await handler(httpEvent({ method: 'GET', path: '/odds', query: 'year=2026' }), lambdaContext);
    expect(res.statusCode).toBe(401);
  });

  it('answers a CORS preflight from the production origin', async () => {
    const res: any = await handler(
      httpEvent({
        method: 'OPTIONS',
        path: '/odds',
        headers: {
          origin: 'https://busterbrackets.com',
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'x-csrftoken',
        },
      }),
      lambdaContext,
    );

    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://busterbrackets.com');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('serves an authenticated JSON route with its query string intact', async () => {
    const findBefore = jest
      .spyOn(TournamentGameService, 'findBefore')
      .mockResolvedValue(historicalGames().filter((g) => g.year < 2026) as unknown as TournamentGame[]);
    const token = Jwt.token.generate({ id: 'u1', username: 'test' }, 'test-secret');

    try {
      const res: any = await handler(
        httpEvent({
          method: 'GET',
          path: '/odds',
          query: 'year=2026',
          headers: { authorization: `Bearer ${token}`, origin: 'https://busterbrackets.com' },
        }),
        lambdaContext,
      );

      expect(res.statusCode).toBe(200);
      expect(findBefore).toHaveBeenCalledWith(2026);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers['access-control-allow-origin']).toBe('https://busterbrackets.com');
      expect(typeof JSON.parse(res.body)).toBe('object');
    } finally {
      findBefore.mockRestore();
    }
  });
});
