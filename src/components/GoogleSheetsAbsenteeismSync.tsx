import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, RefreshCw, Settings, Save } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from 'sonner';

interface AbsenteeismRecord {
  id: string;
  nameOfAbsentee: string;
  startDate: string;
  endDate: string;
  noOfDays: number;
  reasonForAbsence: string;
  csp: string;
  absenteeismAuthorised: boolean;
  comment: string;
}

export default function GoogleSheetsAbsenteeismSync() {
  const { user } = useAppContext();
  const [syncing, setSyncing] = useState(false);
  const [records, setRecords] = useState<AbsenteeismRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sheetName, setSheetName] = useState('Absenteeism');
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Settings state
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [absenteeismRange, setAbsenteeismRange] = useState('Absenteesim tracker !A1:AH1000');

  useEffect(() => {
    fetchRecords();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/sync/settings', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setSpreadsheetId(data.settings.spreadsheetId || '');
        setAbsenteeismRange(data.settings.absenteeismRange || 'Absenteesim tracker !A1:AH1000');
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const saveSettings = async () => {
    if (!spreadsheetId) {
      toast.error('Please enter a spreadsheet ID');
      return;
    }
    
    try {
      setSavingSettings(true);
      const response = await fetch('/api/sync/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          spreadsheetId,
          absenteeismRange
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(data.isCspSpecific ? 'Your spreadsheet settings saved successfully!' : 'Settings saved');
        setShowSettings(false);
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchRecords = async () => {
    try {
      const response = await fetch('/api/absenteeism-reports');
      const data = await response.json();
      if (data.success) {
        setRecords(data.data || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch records');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
    }
  };

  const handleSync = async () => {
    if (!spreadsheetId) {
      setError('Please configure your spreadsheet ID first');
      setShowSettings(true);
      return;
    }
    
    try {
      setSyncing(true);
      setError(null);
      setSuccess(false);

      const response = await fetch('/api/sync/absenteeism-from-google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          spreadsheetId,
          apiKey: 'AIzaSyAAeI_njG0BVNK4XkNDxxF0piq281MR4IU',
          sheetName: sheetName || 'Absenteeism',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        await fetchRecords();
        toast.success(`Synced ${data.count || 0} absenteeism records successfully`);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Absenteeism Sync</h1>
          {spreadsheetId && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Connected to: {spreadsheetId.substring(0, 20)}...
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
          >
            <Settings className="w-4 h-4" />
            {showSettings ? 'Hide' : 'Settings'}
          </button>
          <input
            type="text"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            placeholder="Sheet name"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm"
          />
          <button
            onClick={handleSync}
            disabled={syncing || !spreadsheetId}
            className="flex items-center gap-2 px-4 py-2 bg-[#14B8A6] hover:bg-teal-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Sync Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">📝 Spreadsheet Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                Your Google Spreadsheet ID *
              </label>
              <input
                type="text"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                placeholder="e.g., 1XYwfboWvDpwQc43HakjEtybt1kxKEWt59Zlv8xK-_Es"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Find this in your Google Sheet URL: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">https://docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit</code>
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                Absenteeism Sheet Range
              </label>
              <input
                type="text"
                value={absenteeismRange}
                onChange={(e) => setAbsenteeismRange(e.target.value)}
                placeholder="Absenteesim tracker !A1:AH1000"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">📋 Important:</h3>
              <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1 list-disc list-inside">
                <li>Share your spreadsheet with: <code className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">reportinghub@reportinghub-479913.iam.gserviceaccount.com</code></li>
                <li>Grant <strong>Viewer</strong> or <strong>Editor</strong> access</li>
                <li>Make sure your sheet has the correct tab name (e.g., "Absenteesim tracker ")</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveSettings}
                disabled={savingSettings || !spreadsheetId}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-700 dark:text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Card>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-600 text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-600 text-sm">✓ Sync completed successfully</AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Records ({records.length})</h2>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No records. Click "Sync Now" to pull data from Google Sheets.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Name</th>
                  <th className="px-4 py-2 text-left font-semibold">Dates</th>
                  <th className="px-4 py-2 text-left font-semibold">Days</th>
                  <th className="px-4 py-2 text-left font-semibold">Reason</th>
                  <th className="px-4 py-2 text-left font-semibold">CSP</th>
                  <th className="px-4 py-2 text-left font-semibold">Approved</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, idx) => (
                  <tr key={record.id || idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{record.nameOfAbsentee}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {record.startDate && record.endDate ? `${record.startDate} to ${record.endDate}` : '-'}
                    </td>
                    <td className="px-4 py-2">{record.noOfDays || 0}</td>
                    <td className="px-4 py-2">{record.reasonForAbsence || '-'}</td>
                    <td className="px-4 py-2">{record.csp || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        record.absenteeismAuthorised 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {record.absenteeismAuthorised ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
