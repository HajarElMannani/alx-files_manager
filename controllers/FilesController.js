import { promises } from 'fs';
import path from 'path';
import { v4 } from 'uuid';
import pkg from 'mongodb';
import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';

const {ObjectId} = pkg;
class FilesController {
  static async postUpload (req, res) {
    const envPath = process.env.FOLDER_PATH && process.env.FOLDER_PATH.trim();
    const baseDir = envPath && envPath.length ? envPath : '/tmp/files_manager';
    try {
      const token = req.header('X-Token');
      const userId = token && (await redisClient.get(`auth_${token}`));
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized'});
      }
      const userObjectId = ObjectId(userId);
      const {
        name,
        type,
        parentId = 0,
        isPublic = false,
        data
      } = req.body || {};
      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }
      const valid = ['file', 'folder', 'image'];
      if (!type || !valid.includes(type)) {
        return res.status(400).json({ error: 'Missing type' });
      }
      if (type !== 'folder' && ! data) {
        return res.status(400).json({ error: 'Missing data' });
      }
	    let parentIdForDb = parentId;
      if (parentId !== 0) {
        let parentDocument;
        try {
          parentDocument = await dbClient.db
            .collection('files')
            .findOne({ _id: ObjectId(parentId) });
        } catch (e) {
          return res.status(400).json({ error: 'parent not found' });
        }
        if (!parentDocument) {
          return res.status(400).json({ error: 'Parent not found' });
        }
        if (parentDocument.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
        parentIdForDb = parentDocument._id;
      }
      if (type === 'folder') {
        const doc = {
          userId: userObjectId,
          name,
          type,
          isPublic,
          parentId: parentIdForDb,
        };
        const result = await dbClient.db.collection('files').insertOne(doc);
        return res.status(201).json({
          id: result.insertedId.toString(),
          userId,
          name,
          type,
          isPublic,
          parentId: parentIdForDb
        });
      }
      await promises.mkdir(baseDir, {recursive: true});
      const nameLocal = v4();
      const filePath = path.join(baseDir, nameLocal);
      await promises.writeFile(filePath, Buffer.from(data, 'base64'));
      const doc = {
        userId: userObjectId,
        name,
        type,
        isPublic,
        parentId: parentIdForDb,
        localPath: filePath
      };
      const result = await dbClient.db.collection('files').insertOne(doc);
      return res.status(201).json({
        id: result.insertedId.toString(),
        userId,
        name,
        type,
        isPublic,
        parentId: parentIdForDb,
      });
    } catch (err) {
      console.error('postUpload error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
export default FilesController;

