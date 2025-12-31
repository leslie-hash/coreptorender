
import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { apiService } from '../services/api.service';

interface Leave {
  type: string;
  dates: string;
  days: number;
  reason: string;
  timestamp: string;
}

interface AttendanceRecord {
  teamMemberName: string;
  totalPTO: number;
  leaves: Leave[];
}

export default function AttendanceTracker() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    apiService.get('/api/attendance-records')
      .then(res => {
        const result = res.data as { records?: AttendanceRecord[] };
        setRecords(result.records || []);
      })
      .catch(() => {
        setError('Failed to fetch attendance records');
        setRecords([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Sort by most PTO taken
  const sortedRecords = [...records].sort((a, b) => b.totalPTO - a.totalPTO);
  const totalPTO = records.reduce((sum, r) => sum + r.totalPTO, 0);
  const avgPTO = records.length ? (totalPTO / records.length).toFixed(1) : '0';
  const maxPTO = Math.max(...records.map(r => r.totalPTO), 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Attendance & PTO Records</h3>
      <div className="flex gap-6 mb-6">
        <div className="bg-blue-50 px-4 py-2 rounded-lg">
          <span className="text-blue-700 font-bold text-lg">Total PTO:</span>
          <span className="ml-2 text-blue-900 font-semibold">{totalPTO} days</span>
        </div>
        <div className="bg-green-50 px-4 py-2 rounded-lg">
          <span className="text-green-700 font-bold text-lg">Average PTO:</span>
          <span className="ml-2 text-green-900 font-semibold">{avgPTO} days</span>
        </div>
        <div className="bg-purple-50 px-4 py-2 rounded-lg">
          <span className="text-purple-700 font-bold text-lg">Max PTO:</span>
          <span className="ml-2 text-purple-900 font-semibold">{maxPTO} days</span>
        </div>
      </div>
      {loading && <div>Loading attendance records...</div>}
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      <div className="space-y-4">
        {sortedRecords.map((record, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-semibold text-gray-900">{record.teamMemberName}</span>
                <span className={`ml-2 text-sm px-2 py-1 rounded-full ${
                  record.totalPTO === maxPTO ? 'bg-purple-100 text-purple-700 font-bold' :
                  record.totalPTO > Number(avgPTO) ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  PTO: {record.totalPTO} days
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Approved Leaves:</h4>
              {record.leaves.length === 0 ? (
                <div className="text-gray-500 text-sm">No approved leaves</div>
              ) : (
                <ul className="list-disc ml-6 text-sm">
                  {record.leaves.map((leave, lidx) => (
                    <li key={lidx}>
                      <span className="font-semibold">{leave.type}</span> - {leave.dates} ({leave.days} days): {leave.reason}
                      <span className="ml-2 text-gray-400">[{new Date(leave.timestamp).toLocaleDateString()}]</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
