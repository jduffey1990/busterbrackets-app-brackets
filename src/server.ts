// src/server.ts
//
// Builds the Hapi server: CORS, the JWT strategy, and every route. app.ts
// connects to Mongo and starts it; tests create one with a known secret and
// drive it through server.inject without a network or a database.
const Hapi = require('@hapi/hapi');
import { Server, ServerRoute } from '@hapi/hapi';
import { AuthService } from './controllers/authService';
import routes from './routes';

export async function createServer(jwtSecret: string | undefined): Promise<Server> {
  const server: Server = Hapi.server({
    port: 3000,
    host: '0.0.0.0',
    routes: {
      cors: {
        origin: [
          'http://localhost:4000',
          'http://busterbrackets.com.s3-website.us-east-2.amazonaws.com',
          'https://main.d2pmlcs4q5ckgp.amplifyapp.com',
          'https://busterbrackets.com',
          'http://busterbrackets.com',
        ],
        credentials: true, // allow cookies / Authorization headers
        additionalHeaders: ['X-CSRFToken', 'Content-Type'],
      },
    },
  });

  await server.register(require('@hapi/jwt'));

  server.auth.strategy('jwt', 'jwt', {
    keys: jwtSecret,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: 14400, // Tokens expire in 4 hours
    },
    validate: AuthService.validateToken,
  });

  server.auth.default('jwt');

  // The route modules declare `method` as plain strings; Hapi validates them at registration.
  server.route(routes as ServerRoute[]);
  return server;
}
