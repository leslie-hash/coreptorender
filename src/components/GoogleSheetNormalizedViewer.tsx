import React, { useState } from 'react';

export default function GoogleSheetNormalizedViewer() {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [range, setRange] = useState('Sheet1!A1:D10');
  const [data, setData] = useState<Record<string, string | number | boolean>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSheet = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/google-sheets?spreadsheetId=${encodeURIComponent(spreadsheetId)}&range=${encodeURIComponent(range)}`
      );
      const result = await res.json();
      if (result.normalized && result.normalized.length > 0) {
        setData(result.normalized);
        setHeaders(Object.keys(result.normalized[0]));
      } else {
        setData([]);
        setHeaders([]);
        setError(result.error || 'No normalized data found');
      }
    } catch (err) {
      setError('Failed to fetch data');
      setData([]);
      setHeaders([]);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Google Sheet Normalized Viewer</h2>
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
      {data.length > 0 && (
        <table border={1} style={{ marginTop: 16 }}>
          <thead>
            <tr>
              {headers.map(header => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {headers.map(header => (
                  <td key={header}>{row[header]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
