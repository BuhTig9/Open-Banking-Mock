import Fastify from 'fastify';
import cors from '@fastify/cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { PersonaData } from './types.js';

// Static secret for signing JWTs.  In a real application this must be stored
// securely and never hard coded.  For a mock demo it is fine to inline.
const JWT_SECRET = 'open-banking-mock-secret';

// Directory containing persona fixtures.  We resolve relative to the process
// working directory.  When running via `npm run dev:server` or tests the
// working directory is the project root so `server/fixtures` resolves
// correctly.  Avoid using `import.meta.url` here because Jest transforms
// TypeScript to CommonJS for tests and does not support it.
const FIXTURES_DIR = path.resolve(process.cwd(), 'server', 'fixtures');

/** Load fixtures synchronously at startup.  Because the data is small and
 * deterministic this approach keeps request handlers simple. */
async function loadFixtures() {
  const personas: Record<string, PersonaData> = {};
  const files = await fs.readdir(FIXTURES_DIR);
  for (const file of files) {
    if (file.endsWith('.json')) {
      const personaName = file.replace(/\.json$/, '');
      const contents = await fs.readFile(path.join(FIXTURES_DIR, file), 'utf8');
      personas[personaName] = JSON.parse(contents) as PersonaData;
    }
  }
  return personas;
}

/** Helper to verify a bearer token and extract the persona from its payload. */
function verifyBearerToken(token?: string): { persona: string; item_id: string } | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { persona: string; item_id: string };
    return payload;
  } catch (err) {
    return null;
  }
}

async function buildServer() {
  const app = Fastify();
  // Allow cross origin requests from the development server
  await app.register(cors, {
    origin: '*'
  });
  const personas = await loadFixtures();

  // POST /link/token/create returns a static link token.  The link token has
  // no meaning in this mock API but mimics Plaid’s initial call.
  app.post('/link/token/create', async (request, reply) => {
    const now = new Date();
    const expiration = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    return { link_token: 'mock-link-token', expiration };
  });

  // POST /item/public_token/exchange converts a public token (persona name)
  // into a signed JWT.  The returned item_id is a random UUID.  In a real
  // system the public token would be an opaque string returned by Plaid Link.
  app.post('/item/public_token/exchange', async (request, reply) => {
    const body = request.body as any;
    const publicToken = body?.public_token;
    if (!publicToken || typeof publicToken !== 'string') {
      return reply.status(400).send({ error: 'public_token is required' });
    }
    if (!personas[publicToken]) {
      return reply.status(400).send({ error: 'invalid persona' });
    }
    const itemId = crypto.randomUUID();
    const token = jwt.sign({ persona: publicToken, item_id: itemId }, JWT_SECRET, { expiresIn: '1h' });
    return { access_token: token, item_id: itemId };
  });

  // Authentication preHandler.  Extracts and verifies the bearer token from
  // Authorization header.  If valid, decorates the request with persona.
  app.addHook('preHandler', async (request, reply) => {
    if (request.routerPath === '/accounts' || request.routerPath === '/transactions') {
      const auth = request.headers['authorization'];
      if (!auth || !auth.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'missing bearer token' });
      }
      const token = auth.substring('Bearer '.length);
      const payload = verifyBearerToken(token);
      if (!payload) {
        return reply.status(401).send({ error: 'invalid token' });
      }
      // @ts-expect-error attach persona to request for later handlers
      request.persona = payload.persona;
      // @ts-expect-error attach item_id for completeness
      request.item_id = payload.item_id;
    }
  });

  // GET /accounts returns all accounts for the authenticated persona.
  app.get('/accounts', async (request, reply) => {
    // @ts-expect-error persona injected by preHandler
    const persona: string = request.persona;
    const data = personas[persona];
    return { accounts: data.accounts };
  });

  // GET /transactions filters transactions by date range for the persona.
  app.get('/transactions', async (request, reply) => {
    // @ts-expect-error persona injected by preHandler
    const persona: string = request.persona;
    const data = personas[persona];
    const start = request.query?.start as string | undefined;
    const end = request.query?.end as string | undefined;
    let transactions = data.transactions;
    if (start) {
      const startDate = new Date(start);
      if (!isNaN(startDate.getTime())) {
        transactions = transactions.filter(t => new Date(t.date) >= startDate);
      }
    }
    if (end) {
      const endDate = new Date(end);
      if (!isNaN(endDate.getTime())) {
        transactions = transactions.filter(t => new Date(t.date) <= endDate);
      }
    }
    return { transactions };
  });

  // Optional webhook to simulate asynchronous events.  Simply logs a
  // TRANSACTIONS_READY event when called.
  app.post('/webhook', async (request, reply) => {
    app.log.info('WEBHOOK: TRANSACTIONS_READY');
    return { status: 'ok' };
  });

  return app;
}

// Export the async factory so tests and the standalone runner can create the server.
export default buildServer;