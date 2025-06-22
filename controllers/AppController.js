import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static getStatus(req, res) {
    res.status(200).json({
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    });
  }

  static async getStats(req, res) {
    const [users, files] = await Promise.all([
      dbClient.nbUsers(),
      dbClient.nbFiles(),
    ]);
    res.status(200).json({ users, files });
  }
}
export default AppController;
