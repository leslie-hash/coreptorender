// HubSpot Contact Sync (Read-Only)
// Syncs HubSpot contacts to teamMembers.json without modifying HubSpot

import { fetchCRMData } from './connectors.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sync HubSpot contacts to local team members
 * Uses existing data, no HubSpot modifications
 */
export async function syncHubSpotToTeamMembers() {
  try {
    console.log('\n🔄 Syncing HubSpot contacts...');
    
    // Fetch all contacts from HubSpot (read-only)
    const contacts = await fetchCRMData();
    
    if (!contacts || contacts.length === 0) {
      console.log('⚠️ No contacts found in HubSpot');
      return { success: false, message: 'No contacts found' };
    }
    
    console.log(`📥 Fetched ${contacts.length} contacts from HubSpot`);
    
    // Filter for employees (you can customize this filter)
    const employees = contacts.filter(contact => {
      // Example filters - adjust based on your HubSpot data:
      // - Has company name
      // - Has email
      // - Job title indicates employee (not "Client" or "Vendor")
      const hasCompany = contact.company && contact.company.trim() !== '';
      const hasEmail = contact.email && contact.email.includes('@');
      const notClient = !contact.jobtitle?.toLowerCase().includes('client');
      
      return hasCompany && hasEmail && notClient;
    });
    
    console.log(`👥 Filtered to ${employees.length} employees`);
    
    // Map to team members format
    const teamMembers = employees.map(emp => 
      `${emp.firstname || ''} ${emp.lastname || ''}`.trim()
    ).filter(name => name);
    
    // Map to team member metadata
    const teamMemberMeta = employees.map((emp, index) => {
      // Generate employee ID if not available
      const employeeId = `EMP${String(index + 1).padStart(3, '0')}`;
      
      // Determine department from job title or company
      const department = determineDepartment(emp.jobtitle, emp.company);
      
      // Assign CSP based on company or department (customize logic)
      const csp = assignCSP(emp.company, department);
      
      // Default annual PTO (since HubSpot doesn't have this)
      const annualPTO = determineAnnualPTO(emp.jobtitle);
      
      return {
        teamMemberName: `${emp.firstname || ''} ${emp.lastname || ''}`.trim(),
        employeeId,
        department,
        csp,
        annualPTO,
        email: emp.email || null,
        phone: emp.phone || null,
        jobtitle: emp.jobtitle || null,
        company: emp.company || null,
        hubspotCreateDate: emp.createdate || null,
        lastSynced: new Date().toISOString()
      };
    });
    
    // Save to JSON files
    const teamMembersPath = path.join(__dirname, 'teamMembers.json');
    const teamMemberMetaPath = path.join(__dirname, 'teamMemberMeta.json');
    
    fs.writeFileSync(teamMembersPath, JSON.stringify(teamMembers, null, 2));
    fs.writeFileSync(teamMemberMetaPath, JSON.stringify(teamMemberMeta, null, 2));
    
    console.log(`✅ Synced ${teamMembers.length} team members`);
    console.log(`📁 Updated: teamMembers.json, teamMemberMeta.json`);
    
    return {
      success: true,
      synced: teamMembers.length,
      teamMembers,
      teamMemberMeta
    };
    
  } catch (error) {
    console.error('❌ Error syncing HubSpot contacts:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Determine department from job title
 */
function determineDepartment(jobtitle, company) {
  if (!jobtitle) return 'Unassigned';
  
  const title = jobtitle.toLowerCase();
  
  if (title.includes('finance') || title.includes('accounting')) return 'Finance';
  if (title.includes('it') || title.includes('tech') || title.includes('developer')) return 'IT';
  if (title.includes('hr') || title.includes('human resource')) return 'HR';
  if (title.includes('marketing') || title.includes('sales')) return 'Marketing';
  if (title.includes('operations') || title.includes('manager')) return 'Operations';
  
  return 'General';
}

/**
 * Assign CSP based on company or department
 */
function assignCSP(company, department) {
  // Customize this logic based on your CSP assignment rules
  // For now, using simple logic - you can make this more sophisticated
  
  if (company?.toLowerCase().includes('client')) {
    return 'CSP User'; // External client contacts
  }
  
  // Internal employees - assign based on department or round-robin
  if (department === 'Finance' || department === 'IT' || department === 'HR') {
    return 'Leslie Chasinda';
  }
  
  return 'CSP User';
}

/**
 * Determine annual PTO based on job title/seniority
 */
function determineAnnualPTO(jobtitle) {
  if (!jobtitle) return 20; // Default
  
  const title = jobtitle.toLowerCase();
  
  // Senior positions get more PTO
  if (title.includes('director') || title.includes('vp') || title.includes('chief')) {
    return 30;
  }
  
  if (title.includes('senior') || title.includes('manager') || title.includes('lead')) {
    return 25;
  }
  
  // Standard employees
  return 20;
}

/**
 * Get sync statistics
 */
export function getHubSpotSyncStats() {
  try {
    const teamMembersPath = path.join(__dirname, 'teamMembers.json');
    const teamMemberMetaPath = path.join(__dirname, 'teamMemberMeta.json');
    
    if (!fs.existsSync(teamMemberMetaPath)) {
      return { synced: false };
    }
    
    const meta = JSON.parse(fs.readFileSync(teamMemberMetaPath, 'utf8'));
    const lastSynced = meta[0]?.lastSynced || null;
    
    return {
      synced: true,
      totalMembers: meta.length,
      lastSynced,
      departments: [...new Set(meta.map(m => m.department))],
      csps: [...new Set(meta.map(m => m.csp))]
    };
    
  } catch (error) {
    return { synced: false, error: error.message };
  }
}
