import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sync absenteeism data from your Google Sheets API (READ-ONLY)
 * 
 * IMPORTANT: This function ONLY READS data from your Google Sheets API.
 * It does NOT modify, delete, or write to the original Google Sheets.
 * Data is cached locally and stored in your Neon database only.
 * 
 * @param {string} sheetApiUrl - Your Google Sheets API endpoint URL
 * @param {object} options - Optional config { apiKey, headers }
 * @returns {Promise<object>} Sync result with counts and status
 */
export async function syncAbsenteeismFromSheets(sheetApiUrl, options = {}) {
  try {
    if (!sheetApiUrl) {
      throw new Error('Google Sheets API URL is required');
    }

    console.log(`[ABSENTEEISM SYNC] Fetching from: ${sheetApiUrl}`);
    console.log(`[ABSENTEEISM SYNC] READ-ONLY: Data will not be written back to Google Sheets`);

    // READ-ONLY: Fetch data from your Google Sheets API (GET request only)
    // Never makes POST, PUT, PATCH, or DELETE requests to the sheets
    const response = await axios.get(sheetApiUrl, {
      timeout: 30000,
      headers: options.headers || {}
    });

    if (!response.data) {
      throw new Error('No data returned from Google Sheets API');
    }

    // Parse response - support both array and paginated responses
    let records = Array.isArray(response.data) 
      ? response.data 
      : response.data.data || response.data.records || [];

    if (!Array.isArray(records)) {
      throw new Error('Invalid response format: expected array of records');
    }

    console.log(`[ABSENTEEISM SYNC] Retrieved ${records.length} raw records`);

    // Normalize and validate records
    const normalizedRecords = records.map((row, idx) => {
      try {
        // Support both column indices and header names
        const extract = (key) => row[key] || row[Object.keys(row)[key]] || null;

        return {
          id: row.id || `sheet-${Date.now()}-${idx}`,
          weekStart: parseDate(extract('weekStart') || extract(0)),
          startDate: parseDate(extract('startDate') || extract(1)),
          endDate: parseDate(extract('endDate') || extract(2)),
          noOfDays: parseInt(extract('noOfDays') || extract(3)) || 0,
          noOfDaysNoWknd: parseInt(extract('noOfDaysNoWknd') || extract(4)) || 0,
          nameOfAbsentee: String(extract('nameOfAbsentee') || extract(5) || 'Unknown').trim(),
          reasonForAbsence: String(extract('reasonForAbsence') || extract(6) || '').trim(),
          absenteeismAuthorised: normalizeBoolean(extract('absenteeismAuthorised') || extract(7)),
          leaveFormSent: normalizeBoolean(extract('leaveFormSent') || extract(8)),
          comment: String(extract('comment') || extract(9) || '').trim(),
          client: String(extract('client') || extract(10) || 'TBD').trim(),
          csp: String(extract('csp') || extract(11) || 'N/A').trim(),
          country: String(extract('country') || extract(12) || 'Zimbabwe').trim(),
          weekNo: parseInt(extract('weekNo') || extract(13)) || 0,
          month: String(extract('month') || extract(14) || '').trim(),
          year: parseInt(extract('year') || extract(15)) || new Date().getFullYear(),
          timeStamp: extract('timeStamp') || extract(16) || new Date().toISOString(),
          syncedAt: new Date().toISOString(),
          source: 'google-sheets'
        };
      } catch (err) {
        console.warn(`[ABSENTEEISM SYNC] Failed to parse row ${idx}:`, err.message);
        return null;
      }
    }).filter(r => r !== null);

    console.log(`[ABSENTEEISM SYNC] Normalized ${normalizedRecords.length} records`);

    // Cache to file for reference
    const cacheDir = path.join(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cacheFile = path.join(cacheDir, 'absenteeism-sync-cache.json');
    fs.writeFileSync(cacheFile, JSON.stringify({
      syncedAt: new Date().toISOString(),
      totalRecords: normalizedRecords.length,
      records: normalizedRecords
    }, null, 2));

    console.log(`[ABSENTEEISM SYNC] Cached ${normalizedRecords.length} records to ${cacheFile}`);

    return {
      success: true,
      totalFetched: records.length,
      totalNormalized: normalizedRecords.length,
      records: normalizedRecords,
      syncedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[ABSENTEEISM SYNC] Error:', error.message);
    return {
      success: false,
      error: error.message,
      totalFetched: 0,
      totalNormalized: 0,
      records: []
    };
  }
}

/**
 * Deduplicate absenteeism records by (nameOfAbsentee, startDate, endDate)
 * Keeps most recent record if duplicates found
 * @param {array} records - Records to deduplicate
 * @returns {array} Deduplicated records
 */
export function deduplicateRecords(records) {
  const seen = {};
  const deduplicated = [];

  for (const record of records) {
    const key = `${record.nameOfAbsentee}|${record.startDate}|${record.endDate}`;
    
    if (!seen[key]) {
      seen[key] = record;
      deduplicated.push(record);
    } else {
      // Keep most recent (by timeStamp or syncedAt)
      const existing = seen[key];
      const existingTime = new Date(existing.timeStamp || existing.syncedAt).getTime();
      const newTime = new Date(record.timeStamp || record.syncedAt).getTime();
      
      if (newTime > existingTime) {
        const idx = deduplicated.indexOf(existing);
        if (idx !== -1) {
          deduplicated[idx] = record;
          seen[key] = record;
        }
      }
    }
  }

  console.log(`[DEDUPLICATION] Reduced ${records.length} records to ${deduplicated.length}`);
  return deduplicated;
}

/**
 * Validate and clean absenteeism record
 * @param {object} record - Record to validate
 * @returns {object} Validation result { valid: boolean, errors: array, cleanedRecord: object }
 */
export function validateAbsenteeismRecord(record) {
  const errors = [];
  const cleaned = { ...record };

  // Required fields
  if (!cleaned.nameOfAbsentee || cleaned.nameOfAbsentee.length === 0) {
    errors.push('nameOfAbsentee is required');
  }
  if (!cleaned.startDate) {
    errors.push('startDate is required');
  }
  if (!cleaned.endDate) {
    errors.push('endDate is required');
  }

  // Date validations
  if (cleaned.startDate && cleaned.endDate) {
    const start = new Date(cleaned.startDate);
    const end = new Date(cleaned.endDate);
    if (start > end) {
      errors.push('startDate must be before or equal to endDate');
    }
    if (isNaN(start.getTime())) {
      errors.push('startDate is not a valid date');
    }
    if (isNaN(end.getTime())) {
      errors.push('endDate is not a valid date');
    }
  }

  // Number validations
  if (cleaned.noOfDays < 0) {
    errors.push('noOfDays cannot be negative');
  }
  if (cleaned.noOfDaysNoWknd < 0) {
    errors.push('noOfDaysNoWknd cannot be negative');
  }

  // Business days should not exceed calendar days
  if (cleaned.noOfDaysNoWknd > cleaned.noOfDays) {
    cleaned.noOfDaysNoWknd = cleaned.noOfDays;
    console.warn(`[VALIDATION] Adjusted noOfDaysNoWknd for ${cleaned.nameOfAbsentee} (was > calendar days)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    cleanedRecord: cleaned
  };
}

/**
 * Helper: Parse date string to YYYY-MM-DD format
 * @param {string|Date} dateInput - Date input
 * @returns {string} Formatted date or empty string
 */
function parseDate(dateInput) {
  if (!dateInput) return '';
  
  try {
    let date;
    if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      return '';
    }

    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (err) {
    return '';
  }
}

/**
 * Helper: Convert various boolean representations to standard format
 * @param {any} value - Value to convert
 * @returns {string} 'Yes' or 'No'
 */
function normalizeBoolean(value) {
  if (typeof value === 'string') {
    return value.toLowerCase().includes('yes') || value.toLowerCase() === 'true' ? 'Yes' : 'No';
  }
  return value ? 'Yes' : 'No';
}

/**
 * Load cached absenteeism records from file
 * @returns {array} Cached records or empty array
 */
export function getCachedRecords() {
  try {
    const cacheFile = path.join(__dirname, 'cache', 'absenteeism-sync-cache.json');
    if (fs.existsSync(cacheFile)) {
      const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      return data.records || [];
    }
  } catch (err) {
    console.error('[CACHE] Failed to load cached records:', err.message);
  }
  return [];
}
