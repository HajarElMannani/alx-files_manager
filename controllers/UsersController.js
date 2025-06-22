import crypto from 'crypto';
import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';
import pkg from 'mongodb';

const { ObjectId } = pkg;
class UsersController {
  static async postNew (req, res) {
    const {email, password } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }
    const existing = await dbClient.db.collection('users').findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Already exist' });
    }
      const hashed = crypto.createHash('sha1').update(password).digest('hex');
      const result = await dbClient.db
            .collection('users')
            .insertOne({ email, password: hashed });
      return res.status(201).json({ id : result.insertedId.toString(),
                                    email
                                  });
    
  }
  static async getMe (req, res) {
    const token = req.header('X-Token');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await dbClient.db.collection(`users`).findOne({ _id: objectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(200).json({ id: user._id.toString(), email: user.email });
    }
  }
}
export default UsersController;
