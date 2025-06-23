import request from 'supertest';
import app from '../server.js';

describe('/status & /stats', () => {
  test('/status is 200 {redis:true, db:true}', async () => {
    const res = await request(app).get('/status');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ redis: true, db: true });
  });
});
