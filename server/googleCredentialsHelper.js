const fs = require('fs');
const path = require('path');

/**
 * Get Google Service Account credentials
 * Tries to read from GOOGLE_CREDENTIALS environment variable first,
 * falls back to google-credentials.json file
 * @returns {Object} Parsed credentials object
 */
function getGoogleCredentials() {
  try {
    // Option 1: Try environment variable (for production/Render)
    if (process.env.GOOGLE_CREDENTIALS) {
      console.log('📋 Using GOOGLE_CREDENTIALS from environment variable');
      return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    }
    
    // Option 2: Try file (for local development)
    const credentialsPath = path.join(__dirname, 'google-credentials.json');
    if (fs.existsSync(credentialsPath)) {
      console.log('📁 Using google-credentials.json file');
      return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    }
    
    throw new Error('Google credentials not found. Set GOOGLE_CREDENTIALS environment variable or provide google-credentials.json file');
  } catch (error) {
    console.error('❌ Error loading Google credentials:', error.message);
    throw error;
  }
}

module.exports = { getGoogleCredentials };
