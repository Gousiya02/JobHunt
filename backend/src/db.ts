import mongoose from 'mongoose';
import { SeekerProfile, CompanyProfile } from './models';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/job_hunt';

export async function connectToDatabase() {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB successfully');
    
    // Ensure geo indexes are built
    await SeekerProfile.createIndexes();
    await CompanyProfile.createIndexes();
    console.log('Database indexes synchronized successfully');
    
    return mongoose.connection;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}
