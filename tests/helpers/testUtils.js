import request from 'supertest';
import app from '../../server.js';
import { v4 as uuidv4 } from 'uuid';

export async function registerAndLogin() {
  const email = `${uuidv4()}@test.com`;
  const password = 'secret123!';
  
  await request(app)
    .post('/users')
    .send({ email, password })
    .expect(201);
  
  const basic = Buffer.from(`${email}:${password}`).toString('base64');
  const res = await request(app)
        .get('/connect')
        .set('Authorization', `Basic ${basic}`)
        .expect(200);
  return { email, password, token: res.body.token };
}
