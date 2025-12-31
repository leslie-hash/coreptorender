import React, { useEffect, useState } from 'react';
import { Table } from './ui/table';
import { apiService } from '../services/api.service';

interface ApprovalRecord {
  id: string;
  teamMemberName: string;
  type: string;
  dates: string;
  days: number;
  reason: string;
  action: 'approved' | 'rejected';
  timestamp: string;
  actor: string;
}

export default function ApprovalHistory() {
  const [history, setHistory] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    apiService.get('/api/approval-history')
      .then(res => {
        const result = res.data as { history?: ApprovalRecord[] };
        setHistory(result.history || []);
      })
      .catch(() => {
        setError('Failed to fetch approval history');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-8">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Approval History</h3>
      {loading && <div>Loading approval history...</div>}
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      <Table>
        <thead>
          <tr>
            <th>Team Member</th>
            <th>Type</th>
            <th>Dates</th>
            <th>Days</th>
            <th>Reason</th>
            <th>Action</th>
            <th>Timestamp</th>
            <th>Actor</th>
          </tr>
        </thead>
        <tbody>
          {history.map((rec, idx) => (
            <tr key={idx}>
              <td>{rec.teamMemberName}</td>
              <td>{rec.type}</td>
              <td>{rec.dates}</td>
              <td>{rec.days}</td>
              <td>{rec.reason}</td>
              <td className={rec.action === 'approved' ? 'text-green-600' : 'text-red-600'}>{rec.action}</td>
              <td>{new Date(rec.timestamp).toLocaleString()}</td>
              <td>{rec.actor}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
