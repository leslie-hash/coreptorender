// Converts a 2D array from Google Sheets into an array of objects
// Assumes first row contains headers
export function normalizeSheetData(values) {
  if (!values || values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] || '';
    });
    return obj;
  });
}
