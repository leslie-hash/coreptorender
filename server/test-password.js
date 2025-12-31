import bcrypt from 'bcryptjs';

const password = 'password';
const hash = bcrypt.hashSync(password, 10);
console.log('New hash for "password":', hash);

// Test the existing hashes
const testHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
const isValid = bcrypt.compareSync('password', testHash);
console.log('Test hash valid:', isValid);

// Generate new one specifically for this system
const newHash = bcrypt.hashSync('password', 10);
console.log('Fresh hash:', newHash);
