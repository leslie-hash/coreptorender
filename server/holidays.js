/**
 * US Federal Holidays Calculator
 * Supports holidays from Google Sheets CSV or fallback to calculated holidays
 */

import axios from 'axios';

// Google Sheets CSV URL for 2026 Observed Holidays
const HOLIDAYS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vThwgaQ5LQqhBqolyBFX7KnIoku3mqnklo1Tg3oABhB87e4kV4kukxrqbNq1VxZ3qT1h2Xwgd-llHvk/pub?gid=0&single=true&output=csv';

// Cache for holidays fetched from Google Sheets
let cachedHolidays = null;
let cacheTimestamp = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Clear the holidays cache to force refresh
 */
export function clearHolidaysCache() {
  cachedHolidays = null;
  cacheTimestamp = null;
  console.log('🔄 Holidays cache cleared');
}

/**
 * Fetch holidays from Google Sheets CSV
 * @returns {Promise<Array<{date: Date, name: string, region: string}>>}
 */
async function fetchHolidaysFromGoogleSheets() {
  try {
    const response = await axios.get(HOLIDAYS_CSV_URL);
    const csvData = response.data;
    
    // The CSV is all on one line - parse it by splitting on commas while respecting quotes
    const allParts = [];
    let current = '';
    let inQuotes = false;
    
    for (let char of csvData) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        allParts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    allParts.push(current.trim());
    
    // Extract year from first part
    const yearMatch = allParts[0].match(/(\d{4})/);
    const defaultYear = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
    
    const holidays = [];
    
    // US holiday names to help identify them
    const usHolidayNames = [
      'New Year\'s Day', 'Memorial Day', 'Labor Day',
      'Thanksgiving', 'Christmas Day', 'Good Friday', 'Friday After Thanksgiving'
    ];
    
    // Zimbabwe-specific keywords to ensure correct classification
    const zimbabweKeywords = [
      'Independence', 'Heroes', 'Defense', 'Unity', 'Africa Day',
      'Workers', 'Easter', 'Boxing'
    ];
    
    // Parse through all parts looking for holiday name + date pairs
    for (let i = 0; i < allParts.length - 1; i++) {
      const part = allParts[i].trim();
      
      // Skip empty, newlines, and "Not a federal holiday" notes
      if (!part || part === '\n' || part === '' || part === 'Not a federal holiday') continue;
      
      // Skip if it's a header
      if (part.includes('Holidays') || part.includes('2026 Observed')) continue;
      
      // Check if this looks like a holiday name (contains letters, not just a date)
      const hasLetters = /[a-zA-Z]{3,}/.test(part);
      if (!hasLetters) continue;
      
      // Check if it starts with a day of week (likely part of a date, not a name)
      if (/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s/.test(part)) continue;
      
      // Look at the next non-empty part to see if it's a date
      let nextPart = allParts[i + 1];
      let nextIndex = i + 1;
      
      // Skip empty parts to find the date
      while (nextIndex < allParts.length && (!nextPart || nextPart === '\n' || nextPart === '')) {
        nextIndex++;
        nextPart = allParts[nextIndex];
      }
      
      if (!nextPart) continue;
      
      // Check if nextPart looks like a date
      const hasDateIndicators = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December))/i.test(nextPart);
      
      if (hasDateIndicators) {
        const date = parseHolidayDate(nextPart, defaultYear);
        if (date) {
          // Determine region - Zimbabwe first, then US
          const isZimbabweHoliday = zimbabweKeywords.some(keyword => 
            part.toLowerCase().includes(keyword.toLowerCase())
          );
          
          const isUSHoliday = !isZimbabweHoliday && usHolidayNames.some(usName => 
            part.toLowerCase().includes(usName.toLowerCase()) || 
            usName.toLowerCase().includes(part.toLowerCase())
          );
          
          const region = isUSHoliday ? 'us' : 'zimbabwe';
          
          // Check for duplicates
          const exists = holidays.find(h => 
            h.name.toLowerCase() === part.toLowerCase() && 
            h.region === region
          );
          
          if (!exists) {
            holidays.push({ date, name: part, region });
            console.log(`📅 Parsed ${region} holiday: ${part} on ${date}`);
          }
        }
      }
    }
    
    const zimCount = holidays.filter(h => h.region === 'zimbabwe').length;
    const usCount = holidays.filter(h => h.region === 'us').length;
    console.log(`✅ Fetched ${holidays.length} holidays from Google Sheets (${zimCount} Zimbabwean, ${usCount} U.S.)`);
    
    // If no US holidays found, fall back to calculated ones
    if (usCount === 0) {
      console.log('⚠️  No US holidays parsed, adding calculated federal holidays');
      const usFederalHolidays = getUSFederalHolidayNames(year);
      holidays.push(...usFederalHolidays);
    }
    
    return holidays;
  } catch (error) {
    console.error('❌ Error fetching holidays from Google Sheets:', error.message);
    return null;
  }
}

/**
 * Parse holiday date from various formats
 * @param {string} dateStr - Date string to parse
 * @param {number} defaultYear - Default year to use if not specified
 * @returns {Date|null}
 */
function parseHolidayDate(dateStr, defaultYear = 2026) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  // Clean up the date string
  dateStr = dateStr.trim();
  
  // Try parsing as is (handles formats like "Thursday, January 1, 2026")
  let date = new Date(dateStr);
  if (!isNaN(date.getTime()) && date.getFullYear() > 2000) {
    return date;
  }
  
  // Try ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Try MM/DD/YYYY or M/D/YYYY format
  const slashParts = dateStr.split('/');
  if (slashParts.length === 3) {
    const month = parseInt(slashParts[0]) - 1;
    const day = parseInt(slashParts[1]);
    const year = parseInt(slashParts[2]);
    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
      date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  // Try "Weekday Month Day" format (e.g., "Thursday Jan 1", "Monday May 25")
  const weekdayMonthDayMatch = dateStr.match(/(?:\w+day,?\s+)?(\w+)\s+(\d{1,2})(?:,?\s+(\d{4}))?/i);
  if (weekdayMonthDayMatch) {
    const monthStr = weekdayMonthDayMatch[1].toLowerCase();
    const day = parseInt(weekdayMonthDayMatch[2]);
    const year = weekdayMonthDayMatch[3] ? parseInt(weekdayMonthDayMatch[3]) : defaultYear;
    
    const monthMap = {
      'january': 0, 'jan': 0,
      'february': 1, 'feb': 1, 'februrary': 1, // typo in CSV
      'march': 2, 'mar': 2,
      'april': 3, 'apr': 3,
      'may': 4,
      'june': 5, 'jun': 5,
      'july': 6, 'jul': 6,
      'august': 7, 'aug': 7,
      'september': 8, 'sep': 8, 'sept': 8,
      'october': 9, 'oct': 9,
      'november': 10, 'nov': 10,
      'december': 11, 'dec': 11
    };
    
    const month = monthMap[monthStr];
    if (month !== undefined) {
      date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  // Try "DD Month" or "DD Month YYYY" formats (e.g., "21 February")
  const dayMonthMatch = dateStr.match(/(\d{1,2})\s+(\w+)(?:\s+(\d{4}))?/);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1]);
    const monthStr = dayMonthMatch[2].toLowerCase();
    const year = dayMonthMatch[3] ? parseInt(dayMonthMatch[3]) : defaultYear;
    
    const monthMap = {
      'january': 0, 'jan': 0,
      'february': 1, 'feb': 1, 'februrary': 1, // typo in CSV
      'march': 2, 'mar': 2,
      'april': 3, 'apr': 3,
      'may': 4,
      'june': 5, 'jun': 5,
      'july': 6, 'jul': 6,
      'august': 7, 'aug': 7,
      'september': 8, 'sep': 8, 'sept': 8,
      'october': 9, 'oct': 9,
      'november': 10, 'nov': 10,
      'december': 11, 'dec': 11
    };
    
    const month = monthMap[monthStr];
    if (month !== undefined) {
      date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return null;
}

/**
 * Get holidays with caching
 * @param {number} year - Year to get holidays for
 * @returns {Promise<Array<{date: Date, name: string}>>}
 */
async function getHolidaysWithCache(year) {
  // Check cache
  const now = Date.now();
  if (cachedHolidays && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
    return cachedHolidays.filter(h => h.date.getFullYear() === year);
  }
  
  // Fetch from Google Sheets
  const sheetsHolidays = await fetchHolidaysFromGoogleSheets();
  
  if (sheetsHolidays && sheetsHolidays.length > 0) {
    cachedHolidays = sheetsHolidays;
    cacheTimestamp = now;
    return sheetsHolidays.filter(h => h.date.getFullYear() === year);
  }
  
  // Fallback to calculated holidays
  console.log('⚠️  Using fallback calculated holidays');
  return null;
}

/**
 * Get all US Federal Holidays for a given year
 * @param {number} year - The year to get holidays for
 * @returns {Date[]} Array of holiday dates
 */
export function getUSFederalHolidays(year) {
  const holidays = [];
  
  // 1. New Year's Day - January 1
  holidays.push(new Date(year, 0, 1));
  
  // 2. Memorial Day - Last Monday of May
  const memorialDay = getLastMondayOfMonth(year, 4); // May is month 4 (0-indexed)
  holidays.push(memorialDay);
  
  // 3. Independence Day - July 4
  holidays.push(new Date(year, 6, 4));
  
  // 4. Labor Day - First Monday of September
  const laborDay = getFirstMondayOfMonth(year, 8); // September is month 8
  holidays.push(laborDay);
  
  // 5. Thanksgiving - Fourth Thursday of November
  const thanksgiving = getFourthThursdayOfMonth(year, 10); // November is month 10
  holidays.push(thanksgiving);
  
  // 6. Christmas Eve - December 24
  holidays.push(new Date(year, 11, 24));
  
  // 7. Christmas Day - December 25
  holidays.push(new Date(year, 11, 25));
  
  return holidays;
}

/**
 * Get the last Monday of a given month
 */
function getLastMondayOfMonth(year, month) {
  const lastDay = new Date(year, month + 1, 0); // Last day of the month
  let day = lastDay.getDate();
  
  // Go backwards to find Monday (day 1)
  while (lastDay.getDay() !== 1) {
    day--;
    lastDay.setDate(day);
  }
  
  return lastDay;
}

/**
 * Get the first Monday of a given month
 */
function getFirstMondayOfMonth(year, month) {
  const firstDay = new Date(year, month, 1);
  let day = 1;
  
  // Go forwards to find Monday (day 1)
  while (firstDay.getDay() !== 1) {
    day++;
    firstDay.setDate(day);
  }
  
  return firstDay;
}

/**
 * Get the fourth Thursday of a given month
 */
function getFourthThursdayOfMonth(year, month) {
  const firstDay = new Date(year, month, 1);
  let day = 1;
  
  // Find first Thursday
  while (firstDay.getDay() !== 4) { // Thursday is day 4
    day++;
    firstDay.setDate(day);
  }
  
  // Add 3 weeks to get fourth Thursday
  firstDay.setDate(day + 21);
  
  return firstDay;
}

/**
 * Check if a date is a US Federal Holiday
 * @param {Date|string} date - Date to check
 * @returns {boolean}
 */
export function isUSFederalHoliday(date) {
  const checkDate = new Date(date);
  const year = checkDate.getFullYear();
  const holidays = getUSFederalHolidays(year);
  
  // Normalize to just compare year, month, day
  const checkDateStr = checkDate.toDateString();
  
  return holidays.some(holiday => holiday.toDateString() === checkDateStr);
}

/**
 * Calculate business days between two dates, excluding weekends and US Federal Holidays
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Number of business days
 */
export function calculateBusinessDays(startDate, endDate) {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  // Get holidays for all years in the range
  const startYear = current.getFullYear();
  const endYear = end.getFullYear();
  const allHolidays = [];
  
  for (let year = startYear; year <= endYear; year++) {
    allHolidays.push(...getUSFederalHolidays(year));
  }
  
  // Convert holidays to date strings for easy comparison
  const holidayStrings = allHolidays.map(h => h.toDateString());
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    const currentDateStr = current.toDateString();
    
    // Count if it's not a weekend and not a holiday
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayStrings.includes(currentDateStr)) {
      count++;
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Get holiday names for display (async version with Google Sheets support)
 * @param {number} year - Year to get holidays for
 * @returns {Promise<Array<{date: Date, name: string, region: string}>>}
 */
export async function getUSFederalHolidayNames(year) {
  // Try to get from Google Sheets first
  const sheetsHolidays = await getHolidaysWithCache(year);
  
  if (sheetsHolidays && sheetsHolidays.length > 0) {
    return sheetsHolidays;
  }
  
  // Fallback to calculated holidays (US holidays only)
  const holidays = getUSFederalHolidays(year);
  const names = [
    'New Year\'s Day',
    'Memorial Day',
    'Independence Day',
    'Labor Day',
    'Thanksgiving',
    'Christmas Eve',
    'Christmas Day'
  ];
  
  return holidays.map((date, index) => ({
    date,
    name: names[index],
    region: 'us'
  }));
}

/**
 * Get holiday names for display (sync version - fallback only)
 * @param {number} year - Year to get holidays for
 * @returns {Array<{date: Date, name: string}>}
 */
export function getUSFederalHolidayNamesSync(year) {
  const holidays = getUSFederalHolidays(year);
  const names = [
    'New Year\'s Day',
    'Memorial Day',
    'Independence Day',
    'Labor Day',
    'Thanksgiving',
    'Christmas Eve',
    'Christmas Day'
  ];
  
  return holidays.map((date, index) => ({
    date,
    name: names[index]
  }));
}

/**
 * Count holidays in a date range
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number}
 */
export function countHolidaysInRange(startDate, endDate) {
  const current = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  
  const startYear = current.getFullYear();
  const endYear = end.getFullYear();
  const allHolidays = [];
  
  for (let year = startYear; year <= endYear; year++) {
    allHolidays.push(...getUSFederalHolidays(year));
  }
  
  const holidayStrings = allHolidays.map(h => h.toDateString());
  
  while (current <= end) {
    if (holidayStrings.includes(current.toDateString())) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}
