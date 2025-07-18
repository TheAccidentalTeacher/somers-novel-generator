import { MongoClient } from 'mongodb';

class MongoDBManager {
  constructor() {
    this.client = null;
    this.db = null;
    this.connected = false;
    
    // Connection string - replace <db_password> with actual password
    this.connectionString = process.env.MONGODB_URI || 
      'mongodb+srv://scosom:nonPhubic4@brainstorm-cluster.bg60my0.mongodb.net/?retryWrites=true&w=majority&appName=Brainstorm-Cluster';
    
    this.dbName = 'novel-generator';
    this.jobsCollection = 'generation-jobs';
  }

  async connect() {
    try {
      if (this.connected) {
        return this.db;
      }

      console.log('🔄 Connecting to MongoDB Atlas...');
      
      this.client = new MongoClient(this.connectionString, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.connected = true;
      
      console.log('✅ MongoDB Atlas connected successfully');
      return this.db;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      this.connected = false;
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.connected = false;
      console.log('📝 MongoDB connection closed');
    }
  }

  async getJobsCollection() {
    if (!this.connected) {
      await this.connect();
    }
    return this.db.collection(this.jobsCollection);
  }

  // Job management methods
  async createJob(jobData) {
    try {
      const collection = await this.getJobsCollection();
      const result = await collection.insertOne({
        ...jobData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`📝 Job ${jobData.id} stored in MongoDB`);
      return result.insertedId;
    } catch (error) {
      console.error('MongoDB createJob error:', error);
      throw error;
    }
  }

  async getJob(jobId) {
    try {
      const collection = await this.getJobsCollection();
      const job = await collection.findOne({ id: jobId });
      return job;
    } catch (error) {
      console.error('MongoDB getJob error:', error);
      return null;
    }
  }

  async updateJob(jobId, updates) {
    try {
      const collection = await this.getJobsCollection();
      await collection.updateOne(
        { id: jobId },
        { 
          $set: { 
            ...updates, 
            updatedAt: new Date() 
          } 
        }
      );
    } catch (error) {
      console.error('MongoDB updateJob error:', error);
      // Don't throw here as this is often called in background
    }
  }

  async deleteJob(jobId) {
    try {
      const collection = await this.getJobsCollection();
      await collection.deleteOne({ id: jobId });
    } catch (error) {
      console.error('MongoDB deleteJob error:', error);
      // Don't throw here as cleanup operations should be non-blocking
    }
  }

  // Get connection status
  isConnected() {
    return this.connected;
  }
}

export default new MongoDBManager();
