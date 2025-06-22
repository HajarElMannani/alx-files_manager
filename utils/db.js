import pkg from 'mongodb';

const { MongoClient } = pkg;
class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const dbname = process.env.DB_DATABASE || 'files_manager';
    this.client = new MongoClient(`mongodb://${host}:${port}`, { useUnifiedTopology: true });
    this.db = null;
    this.client.connect()

      .then(() => {
        this.db = this.client.db(dbname);
      })
      .catch((error) => console.error('Error:', error));
  }

  isAlive() {
    return this.client && this.client.isConnected();
  }

  async nbUsers() {
    if (!this.isAlive()) {
      return 0;
    }
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    if (!this.isAlive()) {
      return 0;
    }
    return this.db.collection('files').countDocuments();
  }
}
const dbClient = new DBClient();
export default dbClient;
