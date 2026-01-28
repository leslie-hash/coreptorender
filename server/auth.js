import bcrypt from 'bcryptjs';
import { User } from './models/index.js';

export async function getUserByEmail(email) {
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    return user ? user.toObject() : null;
  } catch (error) {
    console.error('getUserByEmail error:', error.message);
    return null;
  }
}

export async function registerUser({ name, email, password, role, cspName, cspEmail, clientName }) {
  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return false;
    
    const hash = bcrypt.hashSync(password, 10);
    await User.create({ 
      name, 
      email: email.toLowerCase(), 
      password: hash, 
      role,
      cspName,
      cspEmail,
      clientName,
      isActive: true
    });
    return true;
  } catch (error) {
    console.error('registerUser error:', error.message);
    return false;
  }
}

export async function validateLogin(email, password) {
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      console.log('User not found:', email);
      return null;
    }
    if (!user.password) {
      console.log('User has no password hash:', email);
      return null;
    }
    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      console.log('Invalid password for user:', email);
      return null;
    }
    return { 
      name: user.name, 
      email: user.email, 
      role: user.role,
      cspName: user.cspName || null
    };
  } catch (error) {
    console.error('validateLogin error:', error.message, error.stack);
    throw error;
  }
}

export async function resetPassword(email, newPassword) {
  try {
    const result = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { password: bcrypt.hashSync(newPassword, 10), updatedAt: new Date() }
    );
    return !!result;
  } catch (error) {
    console.error('resetPassword error:', error.message);
    return false;
  }
}

export async function getAllUsers() {
  try {
    const users = await User.find({}).select('-password').lean();
    return users;
  } catch (error) {
    console.error('getAllUsers error:', error.message);
    return [];
  }
}

export async function updateUser(email, updates) {
  try {
    const result = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    return !!result;
  } catch (error) {
    console.error('updateUser error:', error.message);
    return false;
  }
}

export function logout() {
  // This is a client-side function - should be in frontend
  if (typeof localStorage !== 'undefined') {
    localStorage.clear(); 
    sessionStorage.clear(); 
    location.reload();
  }
}
