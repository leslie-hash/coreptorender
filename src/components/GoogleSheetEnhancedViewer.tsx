import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

const PAGE_SIZE = 10;

export default function GoogleSheetEnhancedViewer() {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [range, setRange] = useState('Sheet1!A1:D10');
  const [data, setData] = useState<Record<string, string | number | boolean>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<Record<string, string | number | boolean>>({});

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
        setPage(1);
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

  // Filtering
  const filteredData = useMemo(() => {
    if (!search) return data;
    return data.filter(row =>
      headers.some(header =>
        String(row[header] || '').toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, data, headers]);

  // Pagination
  const pagedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, page]);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);

  // Export to CSV/Excel
  const exportData = (type: 'csv' | 'xlsx') => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    if (type === 'csv') {
      XLSX.writeFile(wb, 'sheet.csv', { bookType: 'csv' });
    } else {
      XLSX.writeFile(wb, 'sheet.xlsx', { bookType: 'xlsx' });
    }
  };

  // Inline editing
  const startEdit = (idx: number) => {
    setEditIdx(idx);
    setEditRow({ ...pagedData[idx] });
  };
  const saveEdit = (idx: number) => {
    const globalIdx = (page - 1) * PAGE_SIZE + idx;
    const newData = [...data];
    newData[globalIdx] = editRow;
    setData(newData);
    setEditIdx(null);
    setEditRow({});
    // TODO: Send update to backend if needed
  };

  // Table rendering
  return (
    <div>
      <h2>Google Sheet Enhanced Viewer</h2>
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
      <button onClick={() => exportData('csv')} disabled={filteredData.length === 0} style={{ marginLeft: 8 }}>
        Export CSV
      </button>
      <button onClick={() => exportData('xlsx')} disabled={filteredData.length === 0} style={{ marginLeft: 8 }}>
        Export Excel
      </button>
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginLeft: 16 }}
      />
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      {pagedData.length > 0 && (
        <table border={1} style={{ marginTop: 16 }}>
          <thead>
            <tr>
              {headers.map(header => (
                <th key={header}>{header}</th>
              ))}
              <th>Edit</th>
            </tr>
          </thead>
          <tbody>
            {pagedData.map((row, i) => (
              <tr key={i}>
                {headers.map(header => (
                  <td key={header}>
                    {editIdx === i ? (
                      <input
                        value={String(editRow[header] || '')}
                        onChange={e => setEditRow({ ...editRow, [header]: e.target.value })}
                      />
                    ) : (
                      row[header]
                    )}
                  </td>
                ))}
                <td>
                  {editIdx === i ? (
                    <>
                      <button onClick={() => saveEdit(i)}>Save</button>
                      <button onClick={() => setEditIdx(null)}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(i)}>Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {totalPages > 1 && (
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setPage(page - 1)} disabled={page === 1}>Prev</button>
          <span style={{ margin: '0 8px' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(page + 1)} disabled={page === totalPages}>Next</button>
        </div>
      )}
    </div>
  );
}
