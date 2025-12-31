/**
 * US Federal Holidays Calculator
 * Supports the 7 major US Federal Holidays
 */

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
 * Get holiday names for display
 * @param {number} year - Year to get holidays for
 * @returns {Array<{date: Date, name: string}>}
 */
export function getUSFederalHolidayNames(year) {
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
