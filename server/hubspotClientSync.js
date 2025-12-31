// HubSpot Client (Company) Sync (Read-Only)
// Syncs HubSpot companies to clients.json for CILL and leave management

import { fetchHubSpotCompanies, fetchHubSpotCompanyWithContacts } from './connectors.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sync HubSpot companies to local clients
 * Uses existing data, no HubSpot modifications
 */
export async function syncHubSpotClients() {
  try {
    console.log('\n🏢 Syncing HubSpot companies (clients)...');
    
    // Fetch all companies from HubSpot (read-only)
    const companies = await fetchHubSpotCompanies();
    
    if (!companies || companies.length === 0) {
      console.log('⚠️ No companies found in HubSpot');
      return { success: false, message: 'No companies found' };
    }
    
    console.log(`📥 Fetched ${companies.length} companies from HubSpot`);
    
    // Filter for active clients (customize this logic)
    const clients = companies.filter(company => {
      const hasName = company.properties?.name && company.properties.name.trim() !== '';
      // Optional: Filter by type or industry
      const isClient = company.properties?.type !== 'PARTNER' && company.properties?.type !== 'VENDOR';
      return hasName && isClient;
    });
    
    console.log(`🎯 Filtered to ${clients.length} active clients`);
    
    // Map to clients format
    const clientsData = clients.map((company, index) => {
      const props = company.properties || {};
      
      return {
        id: company.id,
        hubspotId: company.id,
        name: props.name || 'Unnamed Client',
        domain: props.domain || null,
        industry: props.industry || 'General',
        location: {
          city: props.city || null,
          state: props.state || null,
          country: props.country || null
        },
        phone: props.phone || null,
        numberOfEmployees: props.numberofemployees || 0,
        type: props.type || 'CLIENT',
        createdDate: props.createdate || null,
        lastModified: props.hs_lastmodifieddate || null,
        // CILL-specific fields (will be populated from CILL sheet or defaults)
        monthlyBillingRate: determineDefaultBillingRate(props.industry, props.numberofemployees),
        billingCurrency: 'USD',
        assignedCSP: null, // Will be populated from team member assignments
        activeContract: true,
        lastSynced: new Date().toISOString()
      };
    });
    
    // Save to JSON file
    const clientsPath = path.join(__dirname, 'clients.json');
    fs.writeFileSync(clientsPath, JSON.stringify(clientsData, null, 2));
    
    console.log(`✅ Synced ${clientsData.length} clients`);
    console.log(`📁 Updated: clients.json`);
    
    // Also create a client mapping for quick lookups
    const clientMapping = {};
    clientsData.forEach(client => {
      clientMapping[client.hubspotId] = client.name;
      if (client.domain) {
        clientMapping[client.domain] = client.name;
      }
    });
    
    const mappingPath = path.join(__dirname, 'clientMapping.json');
    fs.writeFileSync(mappingPath, JSON.stringify(clientMapping, null, 2));
    
    return {
      success: true,
      synced: clientsData.length,
      clients: clientsData
    };
    
  } catch (error) {
    console.error('❌ Error syncing HubSpot clients:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Link team members to clients based on HubSpot associations
 */
export async function linkTeamMembersToClients() {
  try {
    console.log('\n🔗 Linking team members to clients...');
    
    const teamMemberMetaPath = path.join(__dirname, 'teamMemberMeta.json');
    const clientsPath = path.join(__dirname, 'clients.json');
    
    if (!fs.existsSync(teamMemberMetaPath) || !fs.existsSync(clientsPath)) {
      console.log('⚠️ Team members or clients not synced yet');
      return { success: false, message: 'Run sync first' };
    }
    
    const teamMembers = JSON.parse(fs.readFileSync(teamMemberMetaPath, 'utf8'));
    const clients = JSON.parse(fs.readFileSync(clientsPath, 'utf8'));
    
    // Create client lookup by company name
    const clientLookup = {};
    clients.forEach(client => {
      clientLookup[client.name.toLowerCase()] = client;
    });
    
    // Link team members to clients based on company field
    let linkedCount = 0;
    const updatedTeamMembers = teamMembers.map(member => {
      if (member.company) {
        const companyKey = member.company.toLowerCase();
        const matchedClient = clientLookup[companyKey];
        
        if (matchedClient) {
          linkedCount++;
          return {
            ...member,
            assignedClient: matchedClient.name,
            clientHubSpotId: matchedClient.hubspotId,
            clientBillingRate: matchedClient.monthlyBillingRate,
            lastLinked: new Date().toISOString()
          };
        }
      }
      return member;
    });
    
    // Save updated team members
    fs.writeFileSync(teamMemberMetaPath, JSON.stringify(updatedTeamMembers, null, 2));
    
    // Update clients with assigned CSPs
    const cspAssignments = {};
    updatedTeamMembers.forEach(member => {
      if (member.assignedClient && member.csp) {
        cspAssignments[member.assignedClient] = member.csp;
      }
    });
    
    const updatedClients = clients.map(client => ({
      ...client,
      assignedCSP: cspAssignments[client.name] || client.assignedCSP
    }));
    
    fs.writeFileSync(clientsPath, JSON.stringify(updatedClients, null, 2));
    
    console.log(`✅ Linked ${linkedCount} team members to clients`);
    
    return {
      success: true,
      linked: linkedCount,
      totalMembers: teamMembers.length,
      totalClients: clients.length
    };
    
  } catch (error) {
    console.error('❌ Error linking team members to clients:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Sync client data to CILL Verification sheet
 */
export async function syncClientsToCILL() {
  try {
    console.log('\n📊 Syncing clients to CILL Verification...');
    
    const clientsPath = path.join(__dirname, 'clients.json');
    const cillDataPath = path.join(__dirname, 'cillVerificationData.json');
    
    if (!fs.existsSync(clientsPath)) {
      console.log('⚠️ Clients not synced yet');
      return { success: false, message: 'Run client sync first' };
    }
    
    const clients = JSON.parse(fs.readFileSync(clientsPath, 'utf8'));
    
    // Create client reference for CILL records
    const clientReference = {};
    clients.forEach(client => {
      clientReference[client.name] = {
        hubspotId: client.hubspotId,
        billingRate: client.monthlyBillingRate,
        industry: client.industry,
        assignedCSP: client.assignedCSP
      };
    });
    
    // If CILL data exists, enrich it with HubSpot client info
    if (fs.existsSync(cillDataPath)) {
      const cillData = JSON.parse(fs.readFileSync(cillDataPath, 'utf8'));
      
      const enrichedCILL = cillData.map(record => {
        const clientInfo = clientReference[record.client];
        if (clientInfo) {
          return {
            ...record,
            clientHubSpotId: clientInfo.hubspotId,
            hubspotBillingRate: clientInfo.billingRate,
            clientIndustry: clientInfo.industry,
            lastEnriched: new Date().toISOString()
          };
        }
        return record;
      });
      
      fs.writeFileSync(cillDataPath, JSON.stringify(enrichedCILL, null, 2));
      console.log(`✅ Enriched ${enrichedCILL.length} CILL records with HubSpot data`);
    }
    
    return {
      success: true,
      clients: clients.length
    };
    
  } catch (error) {
    console.error('❌ Error syncing to CILL:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get client sync statistics
 */
export function getClientSyncStats() {
  try {
    const clientsPath = path.join(__dirname, 'clients.json');
    
    if (!fs.existsSync(clientsPath)) {
      return { synced: false };
    }
    
    const clients = JSON.parse(fs.readFileSync(clientsPath, 'utf8'));
    const lastSynced = clients[0]?.lastSynced || null;
    
    return {
      synced: true,
      totalClients: clients.length,
      lastSynced,
      industries: [...new Set(clients.map(c => c.industry))],
      csps: [...new Set(clients.map(c => c.assignedCSP).filter(Boolean))],
      avgBillingRate: Math.round(clients.reduce((sum, c) => sum + (c.monthlyBillingRate || 0), 0) / clients.length)
    };
    
  } catch (error) {
    return { synced: false, error: error.message };
  }
}

/**
 * Determine default billing rate based on industry and company size
 */
function determineDefaultBillingRate(industry, numberOfEmployees) {
  // Base rates by industry (monthly, in USD)
  const industryRates = {
    'TECHNOLOGY': 8000,
    'FINANCE': 10000,
    'HEALTHCARE': 7000,
    'MANUFACTURING': 6000,
    'RETAIL': 5000,
    'SERVICES': 4500
  };
  
  let baseRate = industryRates[industry?.toUpperCase()] || 5000;
  
  // Adjust by company size
  const employees = parseInt(numberOfEmployees) || 0;
  if (employees > 100) {
    baseRate *= 1.5;
  } else if (employees > 50) {
    baseRate *= 1.3;
  } else if (employees > 20) {
    baseRate *= 1.1;
  }
  
  return Math.round(baseRate);
}
