import { syncFromMultiTabSheet } from './centralizedSheetSync.js';

const spreadsheetId = '1IF74fahAyeRS6TcDlvB4cfKPnuS4zznbz9vZOT7zKpw';

console.log('Testing multi-tab sync...');
console.log(`Spreadsheet ID: ${spreadsheetId}`);

try {
  const result = await syncFromMultiTabSheet(spreadsheetId);
  console.log('\n✅ SYNC SUCCESSFUL!');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('\n❌ SYNC FAILED!');
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  if (error.response) {
    console.error('API Response:', JSON.stringify(error.response.data, null, 2));
  }
  process.exit(1);
}
