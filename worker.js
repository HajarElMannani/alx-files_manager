import { promises } from 'fs';
import imageThumbnail from 'image-thumbnail';
import mime from 'mime-types';
import fileQueue from './utils/bqueue.js';
import dbClient from './utils/db.js';
import pkg from 'mongodb';

const { ObjectId } = pkg;
fileQueue.process(async job => {
  const { fileId, userId } = job.data;
  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }
  const file = await dbClient.db.collection('files')
        .findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
  if (!file) {
    throw new Error('File not found');
  }
  if (file.type !== 'image') {
    return;
  }
  const widths = [500, 250, 100];
  await Promise.all(
    widths.map(async w => {
      const thumb = await imageThumbnail(file.localPath, { width: w });
      await promises.writeFile(`${file.localPath}_${w}`, thumb);
    })
  );
  return true;
});
