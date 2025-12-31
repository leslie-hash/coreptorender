import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api.service';
import BarChartWidget from './charts/BarChartWidget';
import LineChartWidget from './charts/LineChartWidget';
import PieChartWidget from './charts/PieChartWidget';
import HeatmapWidget from './charts/HeatmapWidget';

interface SheetConfig {
  spreadsheetId: string;
  range: string;
  [key: string]: string;
}

interface MergedDataResult {
  merged?: Record<string, string | number | boolean>[];
  error?: string;
}

export default function AnalyticsDashboard() {
  const [sheets, setSheets] = useState<SheetConfig[]>([
    { spreadsheetId: '', range: 'Sheet1!A1:D10' }
  ]);
  const [data, setData] = useState<Record<string, string | number | boolean>[]>([]);
  const [field, setField] = useState('');
  const [op, setOp] = useState('sum');
  const [groupField, setGroupField] = useState('');
  const [dateField, setDateField] = useState('');
  const [valueField, setValueField] = useState('');
  const [text, setText] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [trendResult, setTrendResult] = useState<Array<{ date: string; value: number }>>([]);
  const [predictResult, setPredictResult] = useState<Record<string, unknown> | null>(null);
  const [sentimentResult, setSentimentResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dynamic sheet selection
  const handleSheetChange = (idx: number, field: keyof SheetConfig, value: string) => {
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

  // Fetch merged data when sheets change
  useEffect(() => {
    const fetchMerged = async () => {
      setLoading(true);
      setError('');
      try {
        const validSheets = sheets.filter(s => s.spreadsheetId);
        if (validSheets.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }
        const res = await apiService.post('/api/merge-sheets', { sheets: validSheets });
        const result = res.data as MergedDataResult;
        if (result.merged && result.merged.length > 0) {
          setData(result.merged);
        } else {
          setData([]);
          setError(result.error || 'No merged data found');
        }
      } catch (err) {
        setError('Failed to fetch merged data');
        setData([]);
      }
      setLoading(false);
    };
    fetchMerged();
  }, [sheets]);

  // UI for selecting fields (replace with dynamic options from your data)
  const sampleFields = data.length > 0 ? Object.keys(data[0]) : ['field1', 'field2', 'date', 'value', 'category'];

  return (
    <div>
      <h2>Analytics Dashboard</h2>
      <div style={{ marginBottom: 16 }}>
        <h4>Sheets to Merge</h4>
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
      </div>
      {/* Chart visualizations */}
      {data.length > 0 && field && (
        <BarChartWidget data={data} xKey={field} yKey={valueField || field} title="Bar Chart" />
      )}
      {trendResult.length > 0 && dateField && valueField && (
        <LineChartWidget data={trendResult} xKey="date" yKey="value" title="Trend Line Chart" />
      )}
      {groupField && result && typeof result === 'object' && (
        <PieChartWidget
          data={Object.entries(result).map(([key, rows]) => ({ name: key, value: Array.isArray(rows) ? rows.length : 0 }))}
          dataKey="value"
          nameKey="name"
          title="Group By Pie Chart"
        />
      )}
      {/* For demo, heatmap expects a 2D array and labels */}
      {/* <HeatmapWidget data={heatmapData} xLabels={xLabels} yLabels={yLabels} title="Attendance Heatmap" /> */}
      <div style={{ marginBottom: 16 }}>
        <h4>Aggregation</h4>
        <select value={field} onChange={e => setField(e.target.value)}>
          <option value="">Select field</option>
          {sampleFields.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={op} onChange={e => setOp(e.target.value)}>
          <option value="sum">Sum</option>
          <option value="avg">Average</option>
          <option value="min">Min</option>
          <option value="max">Max</option>
        </select>
        <button onClick={async () => {
          const res = await fetch('/api/aggregate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, field, op }),
          });
          const json = await res.json();
          setResult(json.result);
        }} disabled={!field}>Aggregate</button>
        {result !== null && <div>Result: {JSON.stringify(result)}</div>}
      </div>
      <div style={{ marginBottom: 16 }}>
        <h4>Group By</h4>
        <select value={groupField} onChange={e => setGroupField(e.target.value)}>
          <option value="">Select field</option>
          {sampleFields.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <button onClick={async () => {
          const res = await fetch('/api/group-by', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, field: groupField }),
          });
          const json = await res.json();
          setResult(json.result);
        }} disabled={!groupField}>Group</button>
        {result && typeof result === 'object' && <pre>{JSON.stringify(result, null, 2)}</pre>}
      </div>
      <div style={{ marginBottom: 16 }}>
        <h4>Trend Analysis</h4>
        <select value={dateField} onChange={e => setDateField(e.target.value)}>
          <option value="">Date field</option>
          {sampleFields.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={valueField} onChange={e => setValueField(e.target.value)}>
          <option value="">Value field</option>
          {sampleFields.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <button onClick={async () => {
          const res = await fetch('/api/trend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, dateField, valueField }),
          });
          const json = await res.json();
          setTrendResult(json.result);
        }} disabled={!dateField || !valueField}>Analyze Trend</button>
        {trendResult.length > 0 && <pre>{JSON.stringify(trendResult, null, 2)}</pre>}
        <button onClick={async () => {
          const res = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ series: trendResult }),
          });
          const json = await res.json();
          setPredictResult(json.result);
        }} disabled={trendResult.length === 0}>Predict Next Value</button>
        {predictResult && <div>Prediction: {JSON.stringify(predictResult)}</div>}
      </div>
      <div style={{ marginBottom: 16 }}>
        <h4>Sentiment Analysis</h4>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Enter text to analyze" rows={3} style={{ width: 300 }} />
        <button onClick={async () => {
          const res = await fetch('/api/sentiment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          });
          const json = await res.json();
          setSentimentResult(json.result);
        }} disabled={!text}>Analyze</button>
        {sentimentResult && <div>Sentiment: {JSON.stringify(sentimentResult)}</div>}
      </div>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}