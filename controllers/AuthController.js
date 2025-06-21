import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';

class AuthController {
  static async getConnect (req, res) {
    const hdr = req.header('Authorization') || '';
    if (!hdr.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const creds = Buffer.from(hdr.slice(6), 'base64').toString();
    const [email, password] = creds.split(':');
    if (!email || !password) {
      return res.status(401).json({error: 'Unauthorized' });
    }
    const hashed = crypto.createHash('sha1').update(password).digest('hex');
    const user = await dbClient.db.collection('users').findOne({ email,
                                                                 password: hashed });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const uid = uuidv4();
    await redisClient.set(`auth_${uid}`, user._id.toString(), 86400);
    return res.status(200).json({ token: uid });
  }
  static async getDisconnect (req, res) {
    const token = req.header('X-Token');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const redisKey = `auth_${token}`;
    const userId = await redisClient.get(redisKey);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await redisClient.del(redisKey);
    return res.status(204).end();
  }
}
export default AuthController;
