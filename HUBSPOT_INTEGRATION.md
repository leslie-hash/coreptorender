# HubSpot API Integration Guide

## Setup

### 1. Get HubSpot API Key

1. Log in to your HubSpot account
2. Go to **Settings** (gear icon) → **Integrations** → **Private Apps**
3. Click **"Create a private app"**
4. Name it: "Leave Manager Integration"
5. Under **Scopes**, select:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
6. Click **"Create app"** and copy the **Access Token**

### 2. Add API Key to Environment

Add to `server/.env`:
```bash
HUBSPOT_API_KEY=your-private-app-token-here
```

---

## API Endpoints

### 1. Get All Contacts
```
GET /api/hubspot/contacts
```

**Response:**
```json
{
  "success": true,
  "contacts": [
    {
      "id": "123",
      "properties": {
        "email": "john@example.com",
        "firstname": "John",
        "lastname": "Doe",
        "phone": "+1234567890",
        "company": "Acme Corp",
        "jobtitle": "Manager"
      }
    }
  ],
  "count": 1
}
```

### 2. Search Contact by Email
```
GET /api/hubspot/contact/:email
```

**Example:**
```
GET /api/hubspot/contact/john@example.com
```

**Response:**
```json
{
  "success": true,
  "contact": {
    "id": "123",
    "properties": {
      "email": "john@example.com",
      "firstname": "John",
      "lastname": "Doe"
    }
  }
}
```

### 3. Sync Contact to HubSpot
```
POST /api/hubspot/sync-contact
```

**Request Body:**
```json
{
  "email": "jane@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1987654321",
  "company": "Tech Corp",
  "jobTitle": "Developer"
}
```

**Response (New Contact):**
```json
{
  "success": true,
  "action": "created",
  "data": {
    "id": "456",
    "properties": { ... }
  }
}
```

**Response (Existing Contact):**
```json
{
  "success": true,
  "action": "updated",
  "data": {
    "id": "123",
    "properties": { ... }
  }
}
```

---

## Usage Examples

### Fetch All Contacts
```javascript
const response = await fetch('http://localhost:4000/api/hubspot/contacts');
const data = await response.json();
console.log(`Found ${data.count} contacts`);
```

### Find Contact by Email
```javascript
const response = await fetch('http://localhost:4000/api/hubspot/contact/john@example.com');
const data = await response.json();
if (data.contact) {
  console.log('Contact found:', data.contact.properties);
}
```

### Create or Update Contact
```javascript
const response = await fetch('http://localhost:4000/api/hubspot/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'newuser@example.com',
    firstName: 'New',
    lastName: 'User',
    phone: '+1234567890',
    company: 'ZimWorX',
    jobTitle: 'CSP'
  })
});
const data = await response.json();
console.log(`Contact ${data.action}:`, data.data.id);
```

---

## Integration with Leave Management

### Sync Team Members to HubSpot
```javascript
// When a new team member is added
app.post('/api/team-members', async (req, res) => {
  const teamMember = req.body;
  
  // Save to local database
  const saved = saveTeamMember(teamMember);
  
  // Sync to HubSpot
  try {
    await syncContactToHubSpot({
      email: teamMember.email,
      firstName: teamMember.name.split(' ')[0],
      lastName: teamMember.name.split(' ')[1] || '',
      company: 'ZimWorX',
      jobTitle: 'Team Member'
    });
  } catch (error) {
    console.error('HubSpot sync failed:', error);
  }
  
  res.json({ success: true, teamMember: saved });
});
```

### Pull Contact Info for Leave Requests
```javascript
// When submitting leave request, enrich with HubSpot data
app.post('/api/leave-requests', async (req, res) => {
  const leaveRequest = req.body;
  
  try {
    // Get contact from HubSpot
    const contact = await fetchHubSpotContactByEmail(leaveRequest.email);
    
    if (contact) {
      leaveRequest.hubspotContactId = contact.id;
      leaveRequest.phone = contact.properties.phone;
      leaveRequest.company = contact.properties.company;
    }
    
    // Save leave request with enriched data
    saveLeaveRequest(leaveRequest);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Available HubSpot Properties

### Standard Contact Properties:
- `email` - Email address (required)
- `firstname` - First name
- `lastname` - Last name
- `phone` - Phone number
- `company` - Company name
- `jobtitle` - Job title
- `website` - Website URL
- `address` - Street address
- `city` - City
- `state` - State/Region
- `zip` - Postal code
- `country` - Country

### Custom Properties:
You can add custom properties in HubSpot and use them in API calls:
```javascript
properties: {
  email: 'user@example.com',
  firstname: 'John',
  custom_field_name: 'Custom Value'
}
```

---

## Error Handling

### Common Errors:

**401 Unauthorized**
```json
{
  "status": "error",
  "message": "The API key provided is invalid."
}
```
**Solution:** Check your `HUBSPOT_API_KEY` in `.env`

**404 Not Found**
```json
{
  "error": "Contact not found in HubSpot"
}
```
**Solution:** Email doesn't exist in HubSpot

**429 Rate Limit**
```json
{
  "status": "error",
  "message": "Rate limit exceeded"
}
```
**Solution:** HubSpot has rate limits. Implement retry logic with exponential backoff.

---

## Testing

### Test with cURL:

**Get contacts:**
```bash
curl http://localhost:4000/api/hubspot/contacts
```

**Search contact:**
```bash
curl http://localhost:4000/api/hubspot/contact/test@example.com
```

**Create contact:**
```bash
curl -X POST http://localhost:4000/api/hubspot/sync-contact \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "company": "Test Corp"
  }'
```

---

## Rate Limits

HubSpot API limits:
- **Professional/Enterprise:** 100 requests/10 seconds
- **Starter:** 50 requests/10 seconds
- **Free:** 100 requests/day

Implement rate limiting in production:
```javascript
import rateLimit from 'express-rate-limit';

const hubspotLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 90, // limit to 90 requests per window (below HubSpot's limit)
});

app.use('/api/hubspot', hubspotLimiter);
```

---

## Next Steps

1. ✅ Set `HUBSPOT_API_KEY` in `.env`
2. ✅ Test endpoints with Postman or cURL
3. ✅ Integrate with team member registration
4. ✅ Add HubSpot sync to leave request workflow
5. ✅ Set up webhook for real-time HubSpot updates (optional)
6. ✅ Implement error handling and retry logic
7. ✅ Monitor API usage in HubSpot dashboard

---

## Support

- **HubSpot API Docs:** https://developers.hubspot.com/docs/api/crm/contacts
- **Private Apps Guide:** https://developers.hubspot.com/docs/api/private-apps
- **Rate Limits:** https://developers.hubspot.com/docs/api/usage-details
