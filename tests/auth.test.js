import request from 'supertest';
import app from '../server.js';
import { initMemoryMongo } from './helpers/setupClients.js';
import { registerAndLogin } from './helpers/testUtils.js';

let mongo;
beforeAll(async () => { mongo = await initMemoryMongo(); });
afterAll(async () => { await mongo.stop(); });
describe('Authentication flow', () => {
  test('POST /users registers, duplicate fails', async () => {
    const email = 'john@test.com';
    const password = 'pwd123!';
    await request(app).post('/users').send({ email, password }).expect(201);
    await request(app).post('/users').send({ email, password }).expect(400);
  });
  test('login /connect, /users/me, /disconnect', async () => {
    const { token } = await registerAndLogin();
    const me = await request(app)
          .get('/users/me')
          .set('X-Token', token)
          .expect(200);
    expect(me.body).toHaveProperty('email');
    await request(app).get('/disconnect').set('X-Token', token).expect(204);
    await request(app).get('/users/me').set('X-Token', token).expect(401);
  });
});
