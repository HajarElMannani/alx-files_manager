import { promises } from 'fs';
import mime from 'mime-types';
import path from 'path';
import { v4 } from 'uuid';
import pkg from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import fileQueue from '../utils/bqueue';

const { ObjectId } = pkg;
class FilesController {
  static async postUpload(req, res) {
    const envPath = process.env.FOLDER_PATH && process.env.FOLDER_PATH.trim();
    const baseDir = envPath && envPath.length ? envPath : '/tmp/files_manager';
    try {
      const token = req.header('X-Token');
      const userId = token && (await redisClient.get(`auth_${token}`));
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const userObjectId = ObjectId(userId);
      const {
        name,
        type,
        parentId = 0,
        isPublic = false,
        data,
      } = req.body || {};
      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }
      const valid = ['file', 'folder', 'image'];
      if (!type || !valid.includes(type)) {
        return res.status(400).json({ error: 'Missing type' });
      }
      if (type !== 'folder' && !data) {
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
          return res.status(400).json({ error: 'Parent not found' });
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
          parentId: parentIdForDb,
        });
      }
      await promises.mkdir(baseDir, { recursive: true });
      const nameLocal = v4();
      const filePath = path.join(baseDir, nameLocal);
      await promises.writeFile(filePath, Buffer.from(data, 'base64'));
      const doc = {
        userId: userObjectId,
        name,
        type,
        isPublic,
        parentId: parentIdForDb,
        localPath: filePath,
      };
      const result = await dbClient.db.collection('files').insertOne(doc);
      if (type === 'image') {
        fileQueue.add({
          userId,
          fileId: result.insertedId.toString(),
        });
      }
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

  static async getShow(req, res) {
    const token = req.header('X-Token');
    const uid = token && await redisClient.get(`auth_${token}`);
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    let docId;
    try {
      docId = ObjectId(req.params.id);
    } catch (e) {
      return res.status(404).json({ error: 'Not found' });
    }
    const file = await dbClient.db.collection('files')
      .findOne({
        _id: docId,
        userId: ObjectId(uid),
      });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    const {
      _id,
      localPath,
      userId,
      parentId,
      ...others
    } = file;
    return res.status(200).json({
      id: _id.toString(),
      userId: userId.toString(),
      parentId: typeof parentId === 'object' ? parentId.toString() : parentId,
      ...others,
    });
  }

  static async getIndex(req, res) {
    const token = req.header('X-Token');
    const uid = token && await redisClient.get(`auth_${token}`);
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const parentId = req.query.parentId || '0';
    const page = Number.parseInt(req.query.page || '0', 10);
    const pageSize = 20;
    const match = { userId: ObjectId(uid) };
    if (parentId !== '0') {
      try {
        match.parentId = ObjectId(parentId);
      } catch (e) {
        match.parentId = new ObjectId();
      }
    } else {
      match.parentId = 0;
    }
    const cursor = dbClient.db.collection('files')
      .aggregate([
        { $match: match },
        { $skip: page * pageSize },
        { $limit: pageSize },
      ]);
    const docs = await cursor.toArray();
    const out = docs.map(({
      _id,
      localPath,
      userId,
      parentId,
      ...rest
    }) => ({
      id: _id.toString(),
      userId: userId.toString(),
      parentId: typeof parentId === 'object' ? parentId.toString() : parentId,
      ...rest,
    }));
    return res.status(200).json(out);
  }

  static async toggleVisibility(req, res, makePublic) {
    const token = req.header('X-Token');
    const uid = token && await redisClient.get(`auth_${token}`);
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    let docId;
    try {
      docId = ObjectId(req.params.id);
    } catch (e) {
      return res.status(404).json({ error: 'Not found' });
    }
    const file = await dbClient.db.collection('files').findOneAndUpdate(
      { _id: docId, userId: ObjectId(uid) },
      { $set: { isPublic: makePublic } },
      { returnOriginal: false },
    ).then((r) => r.value);
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    const {
      _id,
      localPath,
      userId,
      parentId,
      ...rest
    } = file;
    return res.status(200).json({
      id: _id.toString(),
      userId: userId.toString(),
      parentId: typeof parentId === 'object' ? parentId.toString() : parentId,
      isPublic: file.isPublic,
      ...rest,
    });
  }

  static async putPublish(req, res) {
    return FilesController.toggleVisibility(req, res, true);
  }

  static async putUnpublish(req, res) {
    return FilesController.toggleVisibility(req, res, false);
  }

  static async getFile(req, res) {
    const file = await (async () => {
      let id;
      try {
        id = ObjectId(req.params.id);
      } catch (e) {
        return null;
      }
      const token = req.header('X-Token');
      const uid = token && await redisClient.get(`auth_${token}`);
      const match = uid
        ? {
          _id: id,
          $or: [{ isPublic: true }, { userId: ObjectId(uid) }],
        }
        : { _id: id, isPublic: true };
      return dbClient.db.collection('files').findOne(match);
    })();
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }
    const { size } = req.query;
    if (size && !['100', '250', '500'].includes(size)) {
      return res.status(400).json({ error: 'Invalid size' });
    }
    const wantedPath = size ? `${file.localPath}_${size}` : file.localPath;
    try {
      const data = await promises.readFile(wantedPath);
      const mimeType = mime.lookup(file.name) || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      return res.status(200).send(data);
    } catch (e) {
      return res.status(404).json({ error: 'Not found' });
    }
  }
}
export default FilesController;
