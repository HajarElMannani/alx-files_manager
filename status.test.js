import request from 'supertest';
import app from '../server.js';

describe('/status & /stats', () => {
  test('/status is 200 {redis:true, db:true}', async () => {
    const res = await request(app).get('/status');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ redis: true, db: true });
  });
});

describe('POST /files', () => {
  let token;
  beforeAll(async () => { token = (await registerAndLogin()).token; });
  test('upload text file OK', async () => {
    const res = await request(app)
          .post('/files')
          .set('X-Token', token)
          .send({ name: 'a.txt', type: 'file', data: Buffer.from('hi').toString('base64') });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'a.txt', type: 'file' });
  });
});

test('GET /files paginated', async () => {
  const page0 = await request(app).get('/files').set('X-Token', token);
  const page1 = await request(app).get('/files?page=1').set('X-Token', token);
  expect(page0.body.length).toBe(20);
  expect(page1.body.length).toBe(5);
});

test('GET /files/:id/data?size=100', async () => {
  const img = id;
  const res = await request(app).get(`/files/${img}/data?size=100`);
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch(/^image\//);
});
