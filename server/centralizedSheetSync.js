import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sync from centralized Google Sheet with all team members
 * 
 * This approach syncs from ONE master sheet that contains all clients and team members,
 * then assigns them to CSPs based on client-to-CSP mapping
 */

/**
 * Get Google Sheets auth client
 */
async function getAuthClient() {
  const credentialsPath = path.join(__dirname, 'google-credentials.json');
  if (!fs.existsSync(credentialsPath)) {
    throw new Error('google-credentials.json not found');
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return await auth.getClient();
}

/**
 * Sync from multi-tab Google Sheet where each tab = CSP
 * 
 * @param {string} spreadsheetId - The Google Sheet ID
 * @param {boolean} useAuth - Whether to use Google API (true) or public access (false)
 * 
 * This function reads ALL tabs from the spreadsheet.
 * Each tab name is treated as the CSP name/email.
 * All team members on that tab are assigned to that CSP.
 */
export async function syncFromMultiTabSheet(spreadsheetId, useAuth = true) {
  try {
    console.log('🔄 Starting multi-tab sheet sync...');
    console.log(`📋 Spreadsheet ID: ${spreadsheetId}`);
    
    console.log('🔑 Getting auth client...');
    const auth = await getAuthClient();
    console.log('✅ Auth client obtained');
    
    const sheets = google.sheets({ version: 'v4', auth });
    console.log('📊 Google Sheets API client created');
    
    // Step 1: Get all sheet/tab names
    console.log('📋 Fetching spreadsheet metadata...');
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    console.log('✅ Spreadsheet metadata retrieved');
    
    const sheetTabs = spreadsheet.data.sheets;
    console.log(`📑 Found ${sheetTabs.length} tabs in spreadsheet`);
    
    const teamMembers = [];
    const teamMemberMeta = [];
    const cspStats = {};
    
    // Step 2: Read each tab and assign CSP based on tab name
    for (const sheet of sheetTabs) {
      const tabName = sheet.properties.title;
      console.log(`\n📖 Reading tab: "${tabName}"`);
      
      // Skip tabs that look like templates or documentation
      const skipTabs = ['template', 'instructions', 'readme', 'admin', 'master'];
      if (skipTabs.some(skip => tabName.toLowerCase().includes(skip))) {
        console.log(`⏭️  Skipping tab: ${tabName}`);
        continue;
      }
      
      // Read data from this tab (skip header row)
      const range = `${tabName}!A2:L`;
      let rows;
      
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
        });
        rows = response.data.values || [];
      } catch (error) {
        console.log(`⚠️  Could not read tab "${tabName}": ${error.message}`);
        continue;
      }
      
      if (rows.length === 0) {
        console.log(`⚠️  No data in tab "${tabName}"`);
        continue;
      }
      
      console.log(`   Found ${rows.length} rows`);
      
      // Load tab name to CSP email mapping
      let tabMapping = {};
      try {
        const mappingPath = path.join(__dirname, 'tabNameToCspEmailMapping.json');
        if (fs.existsSync(mappingPath)) {
          tabMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
        }
      } catch (error) {
        console.log(`⚠️  Could not load tab mapping: ${error.message}`);
      }
      
      // Derive CSP info from tab name using mapping or fallback
      let cspEmail, cspName;
      
      // First, check if we have a mapping for this tab name
      if (tabMapping[tabName]) {
        cspEmail = tabMapping[tabName].cspEmail;
        cspName = tabMapping[tabName].cspName;
        console.log(`   ✅ Mapped CSP: ${cspName} (${cspEmail})`);
      } else if (tabName.includes('@')) {
        // Tab name is already an email
        cspEmail = tabName.trim();
        cspName = tabName.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        console.log(`   📧 CSP from email: ${cspName} (${cspEmail})`);
      } else {
        // Tab name is a person's name - use @zimworx.com
        cspName = tabName.trim();
        // Generate email: "Leslie Chasinda" -> "leslie.chasinda@zimworx.com"
        cspEmail = tabName.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') + '@zimworx.com';
        console.log(`   ⚠️  No mapping found, generated: ${cspName} (${cspEmail})`);
      }
      
      // Initialize CSP stats
      if (!cspStats[cspEmail]) {
        cspStats[cspEmail] = {
          cspEmail,
          cspName,
          teamMemberCount: 0,
          clients: new Set()
        };
      }
      
      // Process each team member in this tab
      for (const row of rows) {
        const [
          clientName,
          teamMemberName,
          workStation,
          anydesk,
          floor,
          pmsSoftware,
          schedule,
          timeZone,
          homeAddress,
          email,
          phoneNumber,
          birthday
        ] = row;

        // Skip rows with no team member name
        if (!teamMemberName || teamMemberName.trim() === '') continue;

        // Create team member metadata
        const memberMeta = {
          teamMemberName: teamMemberName.trim(),
          clientName: clientName?.trim() || 'Unknown Client',
          employeeId: teamMemberName.trim(),
          workStation: workStation?.trim() || null,
          anydesk: anydesk?.trim() || null,
          floor: floor?.trim() || null,
          pmsSoftware: pmsSoftware?.trim() || null,
          schedule: schedule?.trim() || null,
          timeZone: timeZone?.trim() || 'CST',
          homeAddress: homeAddress?.trim() || null,
          email: email?.trim() || null,
          phoneNumber: phoneNumber?.trim() || null,
          birthday: birthday?.trim() || null,
          
          // CSP assignment from tab name
          csp: cspEmail,
          cspName: cspName,
          
          // PTO defaults
          annualPTO: 20,
          currentRemainingPTO: 20,
          sickDays: 10,
          
          // Sync metadata
          syncedAt: new Date().toISOString(),
          source: 'multi_tab_sheet',
          sourceTab: tabName
        };

        teamMembers.push(teamMemberName.trim());
        teamMemberMeta.push(memberMeta);

        // Update CSP stats
        cspStats[cspEmail].teamMemberCount++;
        if (clientName?.trim()) {
          cspStats[cspEmail].clients.add(clientName.trim());
        }
      }
      
      console.log(`   ✅ Added ${cspStats[cspEmail].teamMemberCount} team members for ${cspName}`);
    }
    
    // Save to files
    const teamMembersPath = path.join(__dirname, 'teamMembers.json');
    const teamMemberMetaPath = path.join(__dirname, 'teamMemberMeta.json');
    const cspSummaryPath = path.join(__dirname, 'cspSummary.json');

    fs.writeFileSync(teamMembersPath, JSON.stringify(teamMembers, null, 2));
    fs.writeFileSync(teamMemberMetaPath, JSON.stringify(teamMemberMeta, null, 2));
    
    // Convert CSP stats to array
    const cspSummary = Object.values(cspStats).map(stat => ({
      ...stat,
      clients: Array.from(stat.clients)
    }));
    
    fs.writeFileSync(cspSummaryPath, JSON.stringify(cspSummary, null, 2));

    console.log('\n✅ Multi-tab sync complete!');
    console.log(`   Total team members: ${teamMembers.length}`);
    console.log(`   Total CSPs: ${cspSummary.length}`);
    console.log(`   Files saved: teamMembers.json, teamMemberMeta.json, cspSummary.json`);

    return {
      teamMembers,
      teamMemberMeta,
      cspSummary,
      totalTeamMembers: teamMembers.length,
      totalCSPs: cspSummary.length,
      totalClients: [...new Set(teamMemberMeta.map(m => m.clientName))].length
    };
  } catch (error) {
    console.error('❌ Error syncing from multi-tab sheet:', error.message);
    console.error('Error details:', error);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Sync from centralized Google Sheet
 * 
 * @param {string} spreadsheetId - The Google Sheet ID or published CSV URL
 * @param {string} range - Sheet range (e.g., "Sheet1!A2:L") or leave empty for published sheet
 * @param {Object} clientToCspMapping - Map of client names to CSP info
 * 
 * Example clientToCspMapping:
 * {
 *   "Akeso Oral Surgery": {
 *     cspEmail: "leslie.chasinda@zimworx.org",
 *     cspName: "Leslie Chasinda"
 *   },
 *   "Elite Orthodontics Nova": {
 *     cspEmail: "tsungirirai.samhungu@zimworx.com",
 *     cspName: "Tsungirirai Samhungu"
 *   }
 * }
 */
export async function syncFromCentralizedSheet(spreadsheetId, range = 'Sheet1!A2:L', clientToCspMapping = {}) {
  try {
    console.log('🔄 Starting centralized sheet sync...');
    
    // Method 1: If it's a published CSV URL
    if (spreadsheetId.startsWith('http')) {
      return await syncFromPublishedCsv(spreadsheetId, clientToCspMapping);
    }
    
    // Method 2: If it's a regular Google Sheet ID
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('⚠️  No data found in sheet');
      return { teamMembers: [], teamMemberMeta: [], cspSummary: [] };
    }

    return processSheetData(rows, clientToCspMapping);
  } catch (error) {
    console.error('Error syncing from centralized sheet:', error.message);
    throw error;
  }
}

/**
 * Sync from published CSV URL (public Google Sheet)
 * This is the recommended approach for the URL you provided
 */
export async function syncFromPublishedCsv(csvUrl, clientToCspMapping = {}) {
  try {
    console.log('📥 Fetching published CSV...');
    
    // Fetch CSV using node-fetch or axios
    const axios = (await import('axios')).default;
    const response = await axios.get(csvUrl);
    const csvData = response.data;
    
    // Parse CSV manually (simple parser)
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      // Simple CSV parsing (handles basic cases)
      const values = lines[i].split(',').map(v => v.trim());
      rows.push(values);
    }
    
    console.log(`📊 Parsed ${rows.length} rows from CSV`);
    
    return processSheetData(rows, clientToCspMapping, headers);
  } catch (error) {
    console.error('Error fetching CSV:', error.message);
    throw error;
  }
}

/**
 * Process sheet data and assign CSPs based on client mapping
 */
async function processSheetData(rows, clientToCspMapping, customHeaders = null) {
  const teamMembers = [];
  const teamMemberMeta = [];
  const cspStats = {};

  // Expected columns from your sheet:
  // Client Name | TEAM MEMBER | WORKSTATION NUMBER | ANYDESK ID | FLOOR | 
  // PMS/SOFTWARE | SCHEDULE | TIME ZONE | HOME ADDRESS | EMAIL | PHONE NUMBER | BIRTHDAY

  for (const row of rows) {
    const [
      clientName,
      teamMemberName,
      workStation,
      anydesk,
      floor,
      pmsSoftware,
      schedule,
      timeZone,
      homeAddress,
      email,
      phoneNumber,
      birthday
    ] = row;

    // Skip rows with no team member name
    if (!teamMemberName || teamMemberName.trim() === '') continue;

    // Get CSP assignment from mapping
    const cspInfo = clientToCspMapping[clientName?.trim()] || {
      cspEmail: 'unassigned@zimworx.org',
      cspName: 'Unassigned'
    };

    // Create team member metadata
    const memberMeta = {
      teamMemberName: teamMemberName.trim(),
      clientName: clientName?.trim() || 'Unknown Client',
      employeeId: teamMemberName.trim(), // Use name as ID for now
      workStation: workStation?.trim() || null,
      anydesk: anydesk?.trim() || null,
      floor: floor?.trim() || null,
      pmsSoftware: pmsSoftware?.trim() || null,
      schedule: schedule?.trim() || null,
      timeZone: timeZone?.trim() || 'CST',
      homeAddress: homeAddress?.trim() || null,
      email: email?.trim() || null,
      phoneNumber: phoneNumber?.trim() || null,
      birthday: birthday?.trim() || null,
      
      // CSP assignment
      csp: cspInfo.cspEmail,
      cspName: cspInfo.cspName,
      
      // PTO defaults (can be updated later)
      annualPTO: 20,
      currentRemainingPTO: 20,
      sickDays: 10,
      
      // Sync metadata
      syncedAt: new Date().toISOString(),
      source: 'centralized_sheet'
    };

    teamMembers.push(teamMemberName.trim());
    teamMemberMeta.push(memberMeta);

    // Track CSP stats
    const cspKey = cspInfo.cspEmail;
    if (!cspStats[cspKey]) {
      cspStats[cspKey] = {
        cspEmail: cspInfo.cspEmail,
        cspName: cspInfo.cspName,
        teamMemberCount: 0,
        clients: new Set()
      };
    }
    cspStats[cspKey].teamMemberCount++;
    cspStats[cspKey].clients.add(clientName?.trim() || 'Unknown');
  }

  // Convert stats to summary array
  const cspSummary = Object.values(cspStats).map(stat => ({
    ...stat,
    clients: Array.from(stat.clients)
  }));

  // Save to files
  const teamMembersPath = path.join(__dirname, 'teamMembers.json');
  const teamMemberMetaPath = path.join(__dirname, 'teamMemberMeta.json');
  const cspSummaryPath = path.join(__dirname, 'cspSummary.json');

  fs.writeFileSync(teamMembersPath, JSON.stringify(teamMembers, null, 2));
  fs.writeFileSync(teamMemberMetaPath, JSON.stringify(teamMemberMeta, null, 2));
  fs.writeFileSync(cspSummaryPath, JSON.stringify(cspSummary, null, 2));

  console.log('\n✅ FILES SAVED');
  console.log(`   📊 Total Team Members: ${teamMembers.length}`);
  console.log(`   👥 Total CSPs: ${cspSummary.length}`);
  console.log(`   🏢 Total Clients: ${new Set(teamMemberMeta.map(tm => tm.clientName)).size}`);

  // Save to MongoDB
  console.log('\n🔄 Saving to MongoDB...');
  try {
    const { TeamMember } = await import('./models/index.js');
    
    // Use bulkWrite with selective field updates to preserve existing data
    const bulkOps = teamMemberMeta.map(member => ({
      updateOne: {
        filter: { 
          teamMemberName: member.teamMemberName,
          clientName: member.clientName
        },
        update: { 
          $set: {
            // Only update fields from the sheet - preserve existing MongoDB data
            workStation: member.workStation,
            anydesk: member.anydesk,
            floor: member.floor,
            pmsSoftware: member.pmsSoftware,
            schedule: member.schedule,
            timeZone: member.timeZone,
            homeAddress: member.homeAddress,
            phoneNumber: member.phoneNumber,
            birthday: member.birthday,
            csp: member.csp,
            cspName: member.cspName,
            syncedAt: new Date(),
            source: member.source
          },
          // Initialize fields only for new documents
          $setOnInsert: {
            email: member.email,
            employeeId: member.employeeId,
            annualPTO: member.annualPTO || 20,
            currentRemainingPTO: member.currentRemainingPTO || 20,
            sickDays: member.sickDays || 10,
            createdAt: new Date()
          }
        },
        upsert: true
      }
    }));

    const result = await TeamMember.bulkWrite(bulkOps);
    
    console.log(`✅ MongoDB sync complete:`);
    console.log(`   ✨ Inserted: ${result.upsertedCount} new team members`);
    console.log(`   🔄 Updated: ${result.modifiedCount} existing team members`);
    console.log(`   ⚡ Matched: ${result.matchedCount} existing records`);
  } catch (mongoError) {
    console.error('⚠️  MongoDB sync failed:', mongoError.message);
    console.log('   Data saved to JSON files successfully');
  }

  // Show CSP summary
  console.log('\n📋 CSP Summary:');
  cspSummary.forEach(csp => {
    console.log(`   ${csp.cspName}: ${csp.teamMemberCount} team members across ${csp.clients.length} clients`);
  });

  return {
    teamMembers,
    teamMemberMeta,
    cspSummary,
    totalCount: teamMembers.length,
    totalCSPs: cspSummary.length,
    totalClients: new Set(teamMemberMeta.map(tm => tm.clientName)).size
  };
}

/**
 * Load client-to-CSP mapping from configuration file
 */
export function loadClientCspMapping() {
  const mappingPath = path.join(__dirname, 'clientToCspMapping.json');
  
  if (!fs.existsSync(mappingPath)) {
    console.warn('⚠️  clientToCspMapping.json not found. Creating template...');
    
    // Create template
    const template = {
      "Akeso Oral Surgery": {
        "cspEmail": "leslie.chasinda@zimworx.org",
        "cspName": "Leslie Chasinda"
      },
      "Elite Orthodontics Nova": {
        "cspEmail": "tsungirirai.samhungu@zimworx.com",
        "cspName": "Tsungirirai Samhungu"
      },
      "Integrity Dental Specialists/EAOFDFW": {
        "cspEmail": "csp3@zimworx.org",
        "cspName": "CSP Name 3"
      }
      // Add all other clients...
    };
    
    fs.writeFileSync(mappingPath, JSON.stringify(template, null, 2));
    console.log('✅ Template created at clientToCspMapping.json');
    console.log('   Please update with your actual CSP assignments');
    
    return template;
  }
  
  return JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
}

/**
 * Automatically detect and suggest CSP assignments based on existing data
 */
export function suggestCspAssignments(teamMemberMetaPath) {
  if (!fs.existsSync(teamMemberMetaPath)) {
    return {};
  }
  
  const existingMeta = JSON.parse(fs.readFileSync(teamMemberMetaPath, 'utf8'));
  const clientToCsp = {};
  
  // Build mapping from existing assignments
  existingMeta.forEach(member => {
    if (member.clientName && member.csp && member.csp.includes('@')) {
      if (!clientToCsp[member.clientName]) {
        clientToCsp[member.clientName] = {
          cspEmail: member.csp,
          cspName: member.cspName || 'Unknown'
        };
      }
    }
  });
  
  return clientToCsp;
}

export default {
  syncFromCentralizedSheet,
  syncFromPublishedCsv,
  loadClientCspMapping,
  suggestCspAssignments
};
