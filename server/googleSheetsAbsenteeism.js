import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'absenteeism-sheets-cache.json');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Read absenteeism data directly from Google Sheets (READ-ONLY)
 * Uses Google Sheets API with API Key (public read access)
 * 
 * IMPORTANT: This is READ-ONLY - never modifies your Google Sheets
 * 
 * @param {string} spreadsheetId - Your Google Sheets ID
 * @param {string} apiKey - Google Sheets API Key
 * @param {string} sheetName - Sheet name (default: "Absenteeism")
 * @returns {Promise<object>} Sync result with records and counts
 */
export async function readAbsenteeismFromGoogleSheets(spreadsheetId, apiKey, sheetName = 'Absenteeism') {
  try {
    if (!spreadsheetId || !apiKey) {
      throw new Error('spreadsheetId and apiKey are required');
    }

    console.log(`[GOOGLE SHEETS READ] Reading from sheet: ${sheetName}`);
    console.log(`[GOOGLE SHEETS READ] Spreadsheet ID: ${spreadsheetId.substring(0, 20)}...`);
    console.log(`[GOOGLE SHEETS READ] READ-ONLY: Will not modify your Google Sheets`);

    // Google Sheets API endpoint
    const range = `${sheetName}!A2:Q`; // 17 columns (A-Q)
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

    console.log(`[GOOGLE SHEETS READ] Fetching from Google Sheets API...`);

    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.data || !response.data.values) {
      console.warn(`[GOOGLE SHEETS READ] No data found in sheet: ${sheetName}`);
      return {
        success: true,
        totalFetched: 0,
        totalNormalized: 0,
        records: [],
        syncedAt: new Date().toISOString(),
        source: 'google-sheets-api'
      };
    }

    const rows = response.data.values;
    console.log(`[GOOGLE SHEETS READ] Retrieved ${rows.length} raw rows from Google Sheets`);

    // Normalize to 17-column format
    const normalizedRecords = rows.map((row, idx) => {
      try {
        return {
          id: `sheet-${Date.now()}-${idx}`,
          weekStart: parseDate(row[0] || ''),
          startDate: parseDate(row[1] || ''),
          endDate: parseDate(row[2] || ''),
          noOfDays: parseInt(row[3]) || 0,
          noOfDaysNoWknd: parseInt(row[4]) || 0,
          nameOfAbsentee: String(row[5] || 'Unknown').trim(),
          reasonForAbsence: String(row[6] || '').trim(),
          absenteeismAuthorised: normalizeBoolean(row[7]),
          leaveFormSent: normalizeBoolean(row[8]),
          comment: String(row[9] || '').trim(),
          client: String(row[10] || 'TBD').trim(),
          csp: String(row[11] || 'N/A').trim(),
          country: String(row[12] || 'Zimbabwe').trim(),
          weekNo: parseInt(row[13]) || 0,
          month: String(row[14] || '').trim(),
          year: parseInt(row[15]) || new Date().getFullYear(),
          timeStamp: row[16] || new Date().toISOString(),
          syncedAt: new Date().toISOString(),
          source: 'google-sheets'
        };
      } catch (err) {
        console.warn(`[GOOGLE SHEETS READ] Failed to parse row ${idx}:`, err.message);
        return null;
      }
    }).filter(r => r !== null);

    console.log(`[GOOGLE SHEETS READ] Normalized ${normalizedRecords.length} records`);

    // Cache to file for reference
    const cacheData = {
      spreadsheetId,
      sheetName,
      totalFetched: rows.length,
      totalNormalized: normalizedRecords.length,
      records: normalizedRecords,
      syncedAt: new Date().toISOString(),
      source: 'google-sheets-api',
      apiKey: apiKey.substring(0, 10) + '...' // Log masked API key
    };

    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    console.log(`[GOOGLE SHEETS READ] Cached ${normalizedRecords.length} records to: ${CACHE_FILE}`);

    return {
      success: true,
      totalFetched: rows.length,
      totalNormalized: normalizedRecords.length,
      records: normalizedRecords,
      syncedAt: new Date().toISOString(),
      source: 'google-sheets-api'
    };
  } catch (error) {
    console.error('[GOOGLE SHEETS READ] Error:', error.message);
    
    // Try to return cached data if API fails
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
        console.warn('[GOOGLE SHEETS READ] Using cached data from last successful sync');
        return {
          success: true,
          totalFetched: cached.records.length,
          totalNormalized: cached.records.length,
          records: cached.records,
          syncedAt: cached.syncedAt,
          source: 'cache',
          fromCache: true,
          error: error.message
        };
      }
    } catch (cacheErr) {
      console.error('[GOOGLE SHEETS READ] No cache available');
    }

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
 * Parse date from various formats
 * @param {string|Date} dateInput - Date input
 * @returns {string} Formatted date (YYYY-MM-DD)
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

    if (isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (err) {
    console.warn('[GOOGLE SHEETS READ] Date parse error:', err.message);
    return '';
  }
}

/**
 * Normalize boolean values
 * @param {any} value - Value to normalize
 * @returns {boolean} Boolean result
 */
function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return /^(yes|true|1|authorised|authorized)$/i.test(value.trim());
  }
  return Boolean(value);
}

/**
 * Get cached records from last sync
 * @returns {array} Cached records
 */
export function getCachedAbsenteeismRecords() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      return cached.records || [];
    }
  } catch (err) {
    console.warn('[GOOGLE SHEETS READ] Failed to read cache:', err.message);
  }
  return [];
}

/**
 * Get cache metadata (last sync time, record count, etc.)
 * @returns {object} Cache metadata
 */
export function getAbsenteeismCacheMetadata() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      return {
        cachedRecords: cached.records.length,
        lastSync: cached.syncedAt,
        spreadsheetId: cached.spreadsheetId,
        sheetName: cached.sheetName,
        cacheFile: CACHE_FILE
      };
    }
  } catch (err) {
    console.warn('[GOOGLE SHEETS READ] Failed to read cache metadata:', err.message);
  }
  return null;
}
