// Belina Payroll connector stub
// Replace with real Belina API integration
export async function syncLeaveWithBelinaPayroll(leaveRecord) {
  // TODO: Implement Belina Payroll API call
  // Example:
  // const response = await axios.post('https://api.belina.co.zw/payroll/leave', leaveRecord, { headers: { Authorization: `Bearer ${token}` } });
  // return response.data;
  return { success: true, message: 'Stub: leave synced to Belina Payroll.' };
}
// Payroll/HR system connector stub
// Example: BambooHR, Workday, ADP, etc.
export async function syncLeaveWithPayrollHR(leaveRecord) {
  // TODO: Replace with real API call to payroll/HR system
  // Example:
  // const response = await axios.post('https://api.bamboohr.com/api/gateway.php/company/v1/time_off/requests', leaveRecord, { headers: { Authorization: `Bearer ${token}` } });
  // return response.data;
  return { success: true, message: 'Stub: leave synced to payroll/HR system.' };
}
// Example connector stubs for CRM, ERP, Email, etc.
import { google } from 'googleapis';
import xlsx from 'xlsx';
import axios from 'axios';

// HubSpot CRM API Integration (Read-Only)
export async function fetchCRMData() {
  const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
  
  if (!HUBSPOT_API_KEY) {
    console.warn('HUBSPOT_API_KEY not set in environment variables');
    return [];
  }
  
  try {
    // Fetch contacts from HubSpot (READ ONLY)
    const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        limit: 100,
        properties: 'firstname,lastname,email,phone,company,jobtitle,createdate,lastmodifieddate'
      }
    });
    
    return response.data.results || [];
  } catch (error) {
    console.error('HubSpot API error:', error.response?.data || error.message);
    return [];
  }
}

// Fetch HubSpot Companies (Clients) - READ ONLY
export async function fetchHubSpotCompanies() {
  const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
  
  if (!HUBSPOT_API_KEY) {
    console.warn('HUBSPOT_API_KEY not set in environment variables');
    return [];
  }
  
  try {
    // Fetch companies from HubSpot (READ ONLY)
    const response = await axios.get('https://api.hubapi.com/crm/v3/objects/companies', {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        limit: 100,
        properties: 'name,domain,industry,city,state,country,phone,createdate,hs_lastmodifieddate,numberofemployees,type'
      }
    });
    
    return response.data.results || [];
  } catch (error) {
    console.error('HubSpot Companies API error:', error.response?.data || error.message);
    return [];
  }
}

// Get company by ID with associated contacts - READ ONLY
export async function fetchHubSpotCompanyWithContacts(companyId) {
  const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
  
  if (!HUBSPOT_API_KEY) {
    console.warn('HUBSPOT_API_KEY not set in environment variables');
    return null;
  }
  
  try {
    // Get company details
    const companyResponse = await axios.get(`https://api.hubapi.com/crm/v3/objects/companies/${companyId}`, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        properties: 'name,domain,industry,city,state,country,phone,createdate,numberofemployees'
      }
    });
    
    const company = companyResponse.data;
    
    // Get associated contacts
    try {
      const contactsResponse = await axios.get(
        `https://api.hubapi.com/crm/v3/objects/companies/${companyId}/associations/contacts`,
        {
          headers: {
            'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      company.associatedContacts = contactsResponse.data.results || [];
    } catch (err) {
      company.associatedContacts = [];
    }
    
    return company;
  } catch (error) {
    console.error('HubSpot Company fetch error:', error.response?.data || error.message);
    return null;
  }
}

// Fetch specific contact from HubSpot by email (READ ONLY)
export async function fetchHubSpotContactByEmail(email) {
  const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
  
  if (!HUBSPOT_API_KEY) {
    throw new Error('HUBSPOT_API_KEY not configured');
  }
  
  try {
    const response = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }]
        }],
        properties: ['firstname', 'lastname', 'email', 'phone', 'company', 'jobtitle']
      },
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.results?.[0] || null;
  } catch (error) {
    console.error('HubSpot search error:', error.response?.data || error.message);
    return null;
  }
}

// Fetch multiple contacts by IDs (READ ONLY)
export async function fetchHubSpotContactsByIds(contactIds) {
  const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
  
  if (!HUBSPOT_API_KEY) {
    throw new Error('HUBSPOT_API_KEY not configured');
  }
  
  try {
    const response = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/contacts/batch/read',
      {
        inputs: contactIds.map(id => ({ id })),
        properties: ['firstname', 'lastname', 'email', 'phone', 'company', 'jobtitle']
      },
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.results || [];
  } catch (error) {
    console.error('HubSpot batch read error:', error.response?.data || error.message);
    return [];
  }
}

// Example: Odoo REST API integration
export async function fetchERPData() {
  // Replace with real ERP API call
  // Example for Odoo:
  // const response = await axios.get('https://your-odoo-instance.com/api/endpoint', { headers: { Authorization: `Bearer ${token}` } });
  // return response.data;
  return [];
}

// Example: Gmail API integration
// Real Gmail connector using Google APIs
export async function fetchEmailData(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  const response = await gmail.users.messages.list({ userId: 'me', maxResults: 10 });
  return response.data.messages || [];
}

export async function fetchSpreadsheetData() {
  // Example: Fetch from Google Sheets and Excel
  // You can call fetchGoogleSheetsData and fetchExcelData here and merge results
  return [];
}

// Google Sheets connector
export async function fetchGoogleSheetsData(auth, spreadsheetId, range) {
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return response.data.values;
}

// Excel connector
export async function fetchExcelData(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);
  return data;
}

// Send Gmail notification
export async function sendGmailNotification(auth, to, subject, message) {
  const gmail = google.gmail({ version: 'v1', auth });
  const emailLines = [
    `To: ${to}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    message,
  ];
  const email = emailLines.join('\r\n');
  const encodedMessage = Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });
}
