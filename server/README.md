# Backend Data Aggregation Service

This backend service collects and aggregates client data from multiple sources (CRM, ERP, email, spreadsheets) for the enterprise automation platform.

## Structure
- `index.js`: Express server and API endpoints
- `connectors.js`: Source connectors (CRM, ERP, Email, Spreadsheets)

## Usage
1. Install dependencies:
   ```bash
   npm install express
   ```
2. Start the server:
   ```bash
   node index.js
   ```
3. Health check:
   - GET `/health` returns `{ status: 'ok' }`
4. Aggregated client data:
   - GET `/api/client-data` returns `{ clients: [...] }`

## Next Steps
- Implement real connectors for each data source
- Add authentication and security
- Normalize and deduplicate client data
- Connect frontend to this API
