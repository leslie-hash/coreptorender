import fs from 'fs';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_PATH = path.join(__dirname, 'users.json');

export function getUserByEmail(email) {
  if (!fs.existsSync(USERS_PATH)) return null;
  const users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
  return users.find(u => u.email === email) || null;
}

export function registerUser({ name, email, password, role }) {
  let users = [];
  if (fs.existsSync(USERS_PATH)) {
    users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
  }
  if (users.find(u => u.email === email)) return false;
  const hash = bcrypt.hashSync(password, 10);
  users.push({ name, email, password: hash, role });
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
  return true;
}

export function validateLogin(email, password) {
  try {
    const user = getUserByEmail(email);
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

export function resetPassword(email, newPassword) {
  if (!fs.existsSync(USERS_PATH)) return false;
  const users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
  const idx = users.findIndex(u => u.email === email);
  if (idx === -1) return false;
  users[idx].password = bcrypt.hashSync(newPassword, 10);
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
  return true;
}
