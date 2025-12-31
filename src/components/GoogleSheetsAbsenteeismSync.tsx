import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

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
  const [syncing, setSyncing] = useState(false);
  const [records, setRecords] = useState<AbsenteeismRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sheetName, setSheetName] = useState('Absenteeism');

  useEffect(() => {
    fetchRecords();
  }, []);

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
    try {
      setSyncing(true);
      setError(null);
      setSuccess(false);

      const response = await fetch('/api/sync/absenteeism-from-google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: '1Jzu-uUuq4JhV2u85Fn7r31nabJVEyoDrt5Q5pDhNgC8',
          apiKey: 'AIzaSyAAeI_njG0BVNK4XkNDxxF0piq281MR4IU',
          sheetName: sheetName || 'Absenteeism',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        await fetchRecords();
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
        <h1 className="text-2xl font-bold">Absenteeism Sync</h1>
        <div className="flex gap-2">
          <input
            type="text"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            placeholder="Sheet name"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <button
            onClick={handleSync}
            disabled={syncing}
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
