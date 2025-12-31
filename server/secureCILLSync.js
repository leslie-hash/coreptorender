import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Encryption configuration
const ENCRYPTION_KEY = process.env.CILL_ENCRYPTION_KEY || crypto.randomBytes(32); // 256-bit key
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt sensitive data
 */
function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text.toString());
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt sensitive data
 */
function decrypt(text) {
  if (!text) return null;
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

/**
 * Hash employee number for lookups without exposing original
 */
function hashEmployeeNumber(empNumber) {
  return crypto.createHash('sha256').update(empNumber.toString()).digest('hex').substring(0, 16);
}

/**
 * Mask financial data for non-admin users
 */
function maskFinancialData(amount, userRole) {
  if (userRole === 'admin' || userRole === 'finance') {
    return amount;
  }
  
  // Show range instead of exact amount
  if (amount < 1000) return '<1K';
  if (amount < 5000) return '1K-5K';
  if (amount < 10000) return '5K-10K';
  if (amount < 25000) return '10K-25K';
  return '25K+';
}

/**
 * Secure CILL record storage with encryption
 */
export function secureStoreCILLRecord(record) {
  const secureRecord = {
    id: record.id,
    hashedEmployeeNumber: hashEmployeeNumber(record.employeeNumber),
    
    // Encrypted sensitive fields
    employeeNumber: encrypt(record.employeeNumber),
    name: encrypt(record.name),
    surname: encrypt(record.surname),
    
    // Public fields (searchable)
    client: record.client,
    csp: record.csp,
    isActive: record.isActive,
    
    // Encrypted financial data
    monthlyBillingRate: encrypt(record.monthlyBillingRate.toString()),
    billableRate: encrypt(record.billableRate.toString()),
    billableAmount: encrypt(record.billableAmount.toString()),
    amountBilled: encrypt(record.amountBilled.toString()),
    
    // Encrypted personal data
    cspComments: record.cspComments ? encrypt(record.cspComments) : null,
    
    // Non-sensitive operational data
    startDate: record.startDate,
    endDate: record.endDate,
    leaveDays: record.leaveDays,
    workingDays: record.workingDays,
    numberOfDays: record.numberOfDays,
    billingStatus: record.billingStatus,
    
    // Metadata
    syncedAt: record.syncedAt,
    encryptedAt: new Date().toISOString(),
  };
  
  return secureRecord;
}

/**
 * Decrypt CILL record for authorized access
 */
export function decryptCILLRecord(secureRecord, userRole) {
  if (!secureRecord) return null;
  
  // Check authorization
  if (userRole !== 'admin' && userRole !== 'finance' && userRole !== 'payroll' && userRole !== 'csp' && userRole !== 'manager') {
    throw new Error('Unauthorized access to CILL data');
  }
  
  const decrypted = {
    id: secureRecord.id,
    employeeNumber: decrypt(secureRecord.employeeNumber),
    name: decrypt(secureRecord.name),
    surname: decrypt(secureRecord.surname),
    fullName: `${decrypt(secureRecord.name)} ${decrypt(secureRecord.surname)}`,
    
    client: secureRecord.client,
    csp: secureRecord.csp,
    isActive: secureRecord.isActive,
    
    // Decrypt financial data based on role
    monthlyBillingRate: userRole === 'admin' || userRole === 'finance' || userRole === 'payroll'
      ? parseFloat(decrypt(secureRecord.monthlyBillingRate))
      : maskFinancialData(parseFloat(decrypt(secureRecord.monthlyBillingRate)), userRole),
    
    billableRate: userRole === 'admin' || userRole === 'finance' || userRole === 'payroll'
      ? parseFloat(decrypt(secureRecord.billableRate))
      : maskFinancialData(parseFloat(decrypt(secureRecord.billableRate)), userRole),
    
    billableAmount: userRole === 'admin' || userRole === 'finance' || userRole === 'payroll'
      ? parseFloat(decrypt(secureRecord.billableAmount))
      : maskFinancialData(parseFloat(decrypt(secureRecord.billableAmount)), userRole),
    
    amountBilled: userRole === 'admin' || userRole === 'finance' || userRole === 'payroll'
      ? parseFloat(decrypt(secureRecord.amountBilled))
      : maskFinancialData(parseFloat(decrypt(secureRecord.amountBilled)), userRole),
    
    cspComments: secureRecord.cspComments ? decrypt(secureRecord.cspComments) : null,
    
    startDate: secureRecord.startDate,
    endDate: secureRecord.endDate,
    leaveDays: secureRecord.leaveDays,
    workingDays: secureRecord.workingDays,
    numberOfDays: secureRecord.numberOfDays,
    billingStatus: secureRecord.billingStatus,
    syncedAt: secureRecord.syncedAt,
  };
  
  return decrypted;
}

/**
 * Audit log for CILL data access
 */
export function logCILLAccess(userId, action, recordId, userRole) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId,
    userRole,
    action, // 'read', 'update', 'sync', 'export'
    recordId,
    ipAddress: 'server', // In production, get from request
  };
  
  const logPath = path.join(__dirname, 'cill-access-log.json');
  let logs = [];
  
  if (fs.existsSync(logPath)) {
    logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
  }
  
  logs.push(logEntry);
  
  // Keep last 10000 entries
  if (logs.length > 10000) {
    logs = logs.slice(-10000);
  }
  
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
}

/**
 * Secure CSV export with encryption
 */
export function secureExportCILL(records, userRole, password) {
  if (userRole !== 'admin' && userRole !== 'finance' && userRole !== 'payroll') {
    throw new Error('Unauthorized: Only admin/finance/payroll can export CILL data');
  }
  
  // Export with password protection
  const csv = records.map(r => {
    const decrypted = decryptCILLRecord(r, userRole);
    return [
      decrypted.employeeNumber,
      decrypted.name,
      decrypted.surname,
      decrypted.client,
      decrypted.monthlyBillingRate,
      decrypted.billableAmount,
      decrypted.amountBilled,
    ].join(',');
  }).join('\n');
  
  // Encrypt entire CSV with user's password
  const passwordKey = crypto.scryptSync(password, 'salt', 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, passwordKey, iv);
  
  let encrypted = cipher.update(csv, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    data: iv.toString('hex') + ':' + encrypted,
    message: 'Encrypted CSV. Use provided password to decrypt.',
  };
}

/**
 * Role-based access control for CILL data
 */
export function checkCILLAccess(userRole, action) {
  const permissions = {
    admin: ['read', 'write', 'export', 'sync', 'delete'],
    finance: ['read', 'write', 'export', 'sync'],
    payroll: ['read', 'write', 'export', 'sync'], // Full financial access
    csp: ['read'], // Limited read access
    manager: ['read'], // Read-only access
    user: [], // No CILL access
  };
  
  return permissions[userRole]?.includes(action) || false;
}

export { encrypt, decrypt, hashEmployeeNumber, maskFinancialData };
