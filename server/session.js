import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const SECRET = process.env.JWT_SECRET || 'supersecretkey';

export function createSession(user) {
  // user: { name, email, role }
  return jwt.sign(user, SECRET, { expiresIn: '1d' });
}

export function verifySession(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}
