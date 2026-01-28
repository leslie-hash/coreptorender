import dotenv from 'dotenv';
import { connectMongoDB } from './mongodb.js';
import { registerUser } from './auth.js';

dotenv.config();

async function createUser() {
  try {
    console.log('Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ Connected to MongoDB');
    
    const email = process.argv[2] || 'anele@zimworx.com';
    const password = process.argv[3] || 'password123';
    const name = process.argv[4] || 'Anele Nkomo';
    const role = process.argv[5] || 'csp';
    
    console.log(`Creating user: ${email} with role: ${role}`);
    const result = await registerUser({ 
      name, 
      email, 
      password, 
      role 
    });
    
    if (result) {
      console.log('✅ User created successfully!');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Role: ${role}`);
    } else {
      console.log('❌ Failed to create user (may already exist)');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createUser();
