import React, { useState } from 'react';
import { apiService } from '../services/api.service';

export default function GoogleSheetViewer() {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [range, setRange] = useState('Sheet1!A1:D10');
  const [data, setData] = useState<string[][]>([]);
  const [normalized, setNormalized] = useState<Record<string, string | number | boolean>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSheet = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiService.get(`/api/google-sheets?spreadsheetId=${encodeURIComponent(spreadsheetId)}&range=${encodeURIComponent(range)}`);
      const result = res.data as { values?: string[][]; normalized?: Record<string, string | number | boolean>[]; error?: string };
      if (result.values) setData(result.values);
      if (result.normalized) setNormalized(result.normalized);
      if (!result.values && !result.normalized) setError(result.error || 'No data found');
    } catch (err) {
      setError('Failed to fetch data');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Google Sheet Viewer</h2>
      <input
        type="text"
        placeholder="Spreadsheet ID"
        value={spreadsheetId}
        onChange={e => setSpreadsheetId(e.target.value)}
        style={{ marginRight: 8 }}
      />
      <input
        type="text"
        placeholder="Range (e.g. Sheet1!A1:D10)"
        value={range}
        onChange={e => setRange(e.target.value)}
        style={{ marginRight: 8 }}
      />
      <button onClick={fetchSheet} disabled={loading || !spreadsheetId}>
        {loading ? 'Loading...' : 'Fetch Data'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      {normalized.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4>Summary</h4>
          <div>Rows: {normalized.length}</div>
          <div>Columns: {Object.keys(normalized[0] || {}).join(', ')}</div>
          {/* Advanced summaries: numeric columns */}
          {(() => {
            const cols = Object.keys(normalized[0] || {});
            const numericCols = cols.filter(col => normalized.some(row => !isNaN(Number(row[col])) && row[col] !== ''));
            if (numericCols.length === 0) return null;
            return (
              <div style={{ marginTop: 8 }}>
                <h5>Numeric Column Stats</h5>
                <ul>
                  {numericCols.map(col => {
                    const nums = normalized.map(row => Number(row[col])).filter(v => !isNaN(v));
                    const total = nums.reduce((a, b) => a + b, 0);
                    const avg = nums.length ? (total / nums.length) : 0;
                    return (
                      <li key={col}>
                        <b>{col}</b>: Total = {total}, Average = {avg.toFixed(2)}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()}
        </div>
      )}
      {data.length > 0 && (
        <table border={1} style={{ marginTop: 16 }}>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
