import { MongoClient } from 'mongodb';
import redisMock from 'redis-mock';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dbClient from '../../utils/db.js';
import redisClient from '../../utils/redis.js';

redisClient.client = redisMock.createClient();
redisClient.getAsync = key => Promise.resolve(redisClient.client.get(key));
redisClient.setAsync = (...args) =>
  new Promise(res => redisClient.client.set(...args, res));
redisClient.delAsync = key =>
  new Promise(res => redisClient.client.del(key, res));

export async function initMemoryMongo() {
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  dbClient.client = new MongoClient(uri, { useUnifiedTopology: true });
  await dbClient.client.connect();
  dbClient.db = dbClient.client.db(await mongo.getDbName());
  return mongo;
}
