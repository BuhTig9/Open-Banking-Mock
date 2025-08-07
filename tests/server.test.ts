import buildServer from '../server/index.js';
import supertest from 'supertest';

describe('Open banking mock API', () => {
  /** Fastify instance */
  let server: Awaited<ReturnType<typeof buildServer>>;
  /** Test client */
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    server = await buildServer();
    await server.listen({ port: 0 });
    request = supertest(server.server);
  });

  afterAll(async () => {
    await server.close();
  });

  it('should create a link token', async () => {
    const res = await request.post('/link/token/create').send();
    expect(res.status).toBe(200);
    expect(res.body.link_token).toBeDefined();
    expect(res.body.expiration).toBeDefined();
  });

  it('should reject exchange without public_token', async () => {
    const res = await request.post('/item/public_token/exchange').send({});
    expect(res.status).toBe(400);
  });

  it('should reject invalid persona', async () => {
    const res = await request
      .post('/item/public_token/exchange')
      .send({ public_token: 'unknown' });
    expect(res.status).toBe(400);
  });

  it('should perform token exchange and access protected endpoints', async () => {
    // Exchange token
    const exchangeRes = await request
      .post('/item/public_token/exchange')
      .send({ public_token: 'steady' });
    expect(exchangeRes.status).toBe(200);
    const { access_token } = exchangeRes.body;
    expect(access_token).toBeDefined();

    // Missing bearer token should fail
    const accResFail = await request.get('/accounts');
    expect(accResFail.status).toBe(401);

    // Valid token should return accounts
    const accRes = await request
      .get('/accounts')
      .set('Authorization', `Bearer ${access_token}`);
    expect(accRes.status).toBe(200);
    expect(Array.isArray(accRes.body.accounts)).toBe(true);
    expect(accRes.body.accounts.length).toBeGreaterThan(0);

    // Transactions without filters returns full list
    const txRes = await request
      .get('/transactions')
      .set('Authorization', `Bearer ${access_token}`);
    expect(txRes.status).toBe(200);
    expect(Array.isArray(txRes.body.transactions)).toBe(true);
    expect(txRes.body.transactions.length).toBeGreaterThan(0);

    // Transactions with a narrow date range should filter results
    const narrowRes = await request
      .get('/transactions?start=2100-01-01&end=2100-12-31')
      .set('Authorization', `Bearer ${access_token}`);
    expect(narrowRes.status).toBe(200);
    expect(narrowRes.body.transactions.length).toBe(0);
  });
});