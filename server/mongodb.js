/**
 * MongoDB Connection Manager
 * Handles connection, reconnection, and connection pooling
 */

import mongoose from 'mongoose';

let isConnected = false;

export async function connectMongoDB() {
  if (isConnected) {
    console.log('📦 Using existing MongoDB connection');
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    console.log('💡 Add MONGODB_URI to your .env file:');
    console.log('   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/corepto');
    throw new Error('MONGODB_URI environment variable is required');
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log('✅ MongoDB connected successfully');
    
    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
      isConnected = true;
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    isConnected = false;
    throw error;
  }
}

export async function disconnectMongoDB() {
  if (!isConnected) {
    return;
  }
  
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('✅ MongoDB disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
    throw error;
  }
}

export function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export default {
  connectMongoDB,
  disconnectMongoDB,
  isMongoConnected
};
