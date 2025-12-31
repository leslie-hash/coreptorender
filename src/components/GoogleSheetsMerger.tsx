import React, { useState } from 'react';

export default function GoogleSheetsMerger() {
  const [sheets, setSheets] = useState([
    { spreadsheetId: '', range: 'Sheet1!A1:D10' }
  ]);
  const [merged, setMerged] = useState<Record<string, string | number | boolean>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSheetChange = (idx: number, field: string, value: string) => {
    const newSheets = [...sheets];
    newSheets[idx][field] = value;
    setSheets(newSheets);
  };

  const addSheet = () => {
    setSheets([...sheets, { spreadsheetId: '', range: 'Sheet1!A1:D10' }]);
  };

  const removeSheet = (idx: number) => {
    setSheets(sheets.filter((_, i) => i !== idx));
  };

  const mergeSheets = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/merge-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheets }),
      });
      const result = await res.json();
      if (result.merged && result.merged.length > 0) {
        setMerged(result.merged);
        setHeaders(Object.keys(result.merged[0]));
      } else {
        setMerged([]);
        setHeaders([]);
        setError(result.error || 'No merged data found');
      }
    } catch (err) {
      setError('Failed to merge sheets');
      setMerged([]);
      setHeaders([]);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Google Sheets Merger</h2>
      {sheets.map((sheet, idx) => (
        <div key={idx} style={{ marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Spreadsheet ID"
            value={sheet.spreadsheetId}
            onChange={e => handleSheetChange(idx, 'spreadsheetId', e.target.value)}
            style={{ marginRight: 8 }}
          />
          <input
            type="text"
            placeholder="Range (e.g. Sheet1!A1:D10)"
            value={sheet.range}
            onChange={e => handleSheetChange(idx, 'range', e.target.value)}
            style={{ marginRight: 8 }}
          />
          {sheets.length > 1 && (
            <button onClick={() => removeSheet(idx)} style={{ marginRight: 8 }}>Remove</button>
          )}
        </div>
      ))}
      <button onClick={addSheet} style={{ marginRight: 8 }}>Add Sheet</button>
      <button onClick={mergeSheets} disabled={loading || sheets.some(s => !s.spreadsheetId)}>
        {loading ? 'Merging...' : 'Merge Sheets'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      {merged.length > 0 && (
        <table border={1} style={{ marginTop: 16 }}>
          <thead>
            <tr>
              {headers.map(header => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {merged.map((row, i) => (
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
