import request from 'supertest';
import app from '../server.js';
import { initMemoryMongo } from './helpers/setupClients.js';
import { registerAndLogin } from './helpers/testUtils.js';
import fs from 'fs/promises';

let mongo;
beforeAll(async () => { mongo = await initMemoryMongo(); });
afterAll(async () => { await mongo.stop(); });
describe('Files endpoints', () => {
  let token;
  let fileId;
  let folderId;
  const helloB64 = Buffer.from('Hello Webstack!').toString('base64');
  const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X4zOEAAAAASUVORK5CYII=';
  beforeAll(async () => {
    ({ token } = await registerAndLogin());
  });
  test('POST /files uploads text file root', async () => {
    const res = await request(app)
          .post('/files')
          .set('X-Token', token)
          .send({ name: 'root.txt', type: 'file', data: helloB64 })
          .expect(201);

    fileId = res.body.id;
  });

  test('POST /files uploads folder', async () => {
    const res = await request(app)
          .post('/files')
          .set('X-Token', token)
          .send({ name: 'images', type: 'folder' })
          .expect(201);
    folderId = res.body.id;
  });
  test('POST /files uploads image', async () => {
    await request(app)
      .post('/files')
      .set('X-Token', token)
      .send({
        name: 'pic.png',
        type: 'image',
        isPublic: true,
        data: pngB64,
        parentId: folderId,
      })
      .expect(201);
  });

  test('GET /files all files', async () => {
    const page0 = await request(app)
          .get('/files')
          .set('X-Token', token)
          .expect(200);
    expect(page0.body.length).toBeGreaterThanOrEqual(2);
    const page98 = await request(app)
          .get('/files?page=98')
          .set('X-Token', token)
          .expect(200);
    expect(page98.body).toEqual([]);
  });

  test('GET /files/:id doc', async () => {
    const res = await request(app)
          .get(`/files/${fileId}`)
          .set('X-Token', token)
          .expect(200);
    expect(res.body).toHaveProperty('name', 'root.txt');
  });

  test('PUT publish/unpublish', async () => {
    const pub = await request(app)
          .put(`/files/${fileId}/publish`)
          .set('X-Token', token)
          .expect(200);
    expect(pub.body.isPublic).toBe(true);
    const unpub = await request(app)
          .put(`/files/${fileId}/unpublish`)
          .set('X-Token', token)
          .expect(200);
    expect(unpub.body.isPublic).toBe(false);
  });

  test('GET /files/:id/data returns data', async () => {
    const res = await request(app)
          .get(`/files/${fileId}/data`)
          .set('X-Token', token)
          .expect(200);
    expect(res.text).toBe('Hello Webstack!');
    await fs.writeFile('/tmp/out.bin', res.body);
  });
});
