import dbClient from '../utils/db.js';
import { initMemoryMongo } from './helpers/setupClients.js';
let mongo;
beforeAll(async () => { mongo = await initMemoryMongo(); });
afterAll(async () => { await mongo.stop(); });

test('isAlive true & counters default 0', async () => {
  expect(dbClient.isAlive()).toBe(true);
  expect(await dbClient.nbUsers()).toBe(0);
  expect(await dbClient.nbFiles()).toBe(0);
});
