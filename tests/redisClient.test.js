import redisClient from '../utils/redis.js';

describe('redisClient', () => {
  test('isAlive returns true', () => {
    expect(redisClient.isAlive()).toBe(true);
  });
  test('set / get / del cycle', async () => {
    await redisClient.set('k', 'v', 10);
    expect(await redisClient.get('k')).toBe('v');
    await redisClient.del('k');
    expect(await redisClient.get('k')).toBe(null);
  });
});
