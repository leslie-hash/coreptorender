import React, { useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, Users, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api.service';

interface SyncResult {
  success: boolean;
  message: string;
  csp?: string;
  teamMemberCount?: number;
  teamMembers?: Array<Record<string, string | number | boolean>>;
  error?: string;
}

export default function CSPSheetSync() {
  const [cspEmail, setCspEmail] = useState('');
  const [cspName, setCspName] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('1XYwfboWvDpwQc43HakjEtybt1kxKEWt59Zlv8xK-_Es');
  const [range, setRange] = useState('Team Member Work Details!A2:I');
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const handleSingleSync = async () => {
    if (!cspEmail || !cspName || !spreadsheetId) {
      setResult({
        success: false,
        message: 'Please fill in CSP Email, CSP Name, and Spreadsheet ID',
        error: 'Missing required fields'
      });
      return;
    }

    setSyncing(true);
    setResult(null);

    try {
      const response = await apiService.post('/api/sync/single-csp-sheet', {
        cspEmail,
        cspName,
        spreadsheetId,
        range
      });

      const data = response.data as { message: string; csp: string; teamMemberCount: number; teamMembers: Array<Record<string, string | number | boolean>> };
      setResult({
        success: true,
        message: data.message,
        csp: data.csp,
        teamMemberCount: data.teamMemberCount,
        teamMembers: data.teamMembers
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      setResult({
        success: false,
        message: 'Sync failed',
        error: err.response?.data?.error || err.message
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Single CSP Sync */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          <h4 className="text-lg font-semibold text-gray-900">Test Single CSP Sheet Sync</h4>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CSP Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={cspEmail}
              onChange={(e) => setCspEmail(e.target.value)}
              placeholder="csp@zimworx.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CSP Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={cspName}
              onChange={(e) => setCspName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spreadsheet ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="1XYwfboWvDpwQc43HakjEtybt1kxKEWt59Zlv8xK-_Es"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              From URL: docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Range (optional)
            </label>
            <input
              type="text"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              placeholder="Team Member Work Details!A2:I"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <button
            onClick={handleSingleSync}
            disabled={syncing}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-all ${
              syncing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync CSP Sheet'}
          </button>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div
          className={`border rounded-lg p-6 ${
            result.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h5
                className={`font-semibold mb-2 ${
                  result.success ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {result.success ? 'Sync Successful!' : 'Sync Failed'}
              </h5>
              <p
                className={`text-sm mb-3 ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {result.message}
              </p>

              {result.success && result.teamMemberCount !== undefined && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <Users className="w-4 h-4" />
                  <span>
                    <strong>{result.teamMemberCount}</strong> team members synced for{' '}
                    <strong>{result.csp}</strong>
                  </span>
                </div>
              )}

              {!result.success && result.error && (
                <div className="mt-2 p-3 bg-red-100 border border-red-200 rounded text-sm text-red-800">
                  <strong>Error:</strong> {result.error}
                </div>
              )}

              {result.success && result.teamMembers && result.teamMembers.length > 0 && (
                <div className="mt-4">
                  <h6 className="text-sm font-semibold text-green-900 mb-2">
                    Team Members Preview:
                  </h6>
                  <div className="bg-white border border-green-200 rounded-md p-3 max-h-60 overflow-y-auto">
                    <ul className="space-y-2 text-sm">
                      {result.teamMembers.slice(0, 10).map((member, index) => (
                        <li key={index} className="flex items-start gap-2 text-gray-700">
                          <span className="text-green-600">•</span>
                          <div>
                            <strong>{member.teamMemberName}</strong> ({member.role})
                            <br />
                            <span className="text-xs text-gray-500">
                              Client: {member.clientName} | Email: {member.email}
                            </span>
                          </div>
                        </li>
                      ))}
                      {result.teamMembers.length > 10 && (
                        <li className="text-gray-500 italic">
                          ... and {result.teamMembers.length - 10} more
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <h6 className="font-semibold mb-2">Before syncing:</h6>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Share the Google Sheet with the service account email (found in google-credentials.json)</li>
              <li>Ensure the sheet has a tab named "Team Member Work Details"</li>
              <li>Verify columns A-I contain: Client Name | Team member | Role | Email | Anydesk | Work Station | Floor | Work Start Time | Time Zone</li>
              <li>Enter the CSP's email and name (must match their login credentials)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
