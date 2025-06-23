import request from 'supertest';
import app from '../server.js';

describe('GET /status', () => {
  test('return 200 and  {redis:true, db:true}', async () => {
    const res = await request(app).get('/status');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ redis: true, db: true });
  });
});

describe('GET /stats', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/stats');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      users: expect.any(Number),
      files: expect.any(Number),
    });
  });
});
