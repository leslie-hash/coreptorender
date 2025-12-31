import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { apiService } from '../services/api.service';

interface PendingApproval {
  id: string;
  teamMember: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'csp-review' | 'pending' | 'approved' | 'rejected';
  submittedBy?: string;
  submittedAt?: string;
  history?: Array<{
    action: string;
    actor: string;
    timestamp: string;
    note?: string;
  }>;
}

export default function ApprovalWorkflow() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [memberFilter, setMemberFilter] = useState<string>('');
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaveRequests = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiService.get(`/api/leave-requests?page=${page}&limit=${limit}`);
        console.log('Approval Workflow - API Response:', res);
        const responseData = res.data as PendingApproval[] | { data: PendingApproval[] };
        // Handle both array and object with data property
        const allRequests = Array.isArray(responseData) ? responseData : (responseData.data || []);
        console.log('Approval Workflow - All Requests:', allRequests);
        
        // Filter for requests in 'pending' status (awaiting client approval after CSP approved)
        const pendingRequests = allRequests.filter((r) => r.status === 'pending');
        console.log('Approval Workflow - Pending Client Approval:', pendingRequests);
        
        setApprovals(pendingRequests);
        setTotal(pendingRequests.length);
      } catch (err) {
        console.error('Failed to fetch leave requests:', err);
        setError('Failed to fetch leave requests');
        setApprovals([]);
      }
      setLoading(false);
    };
    fetchLeaveRequests();
  }, [page, limit]);

  const sendNotification = async (approval: PendingApproval, action: 'approved' | 'rejected') => {
    // Replace with real email lookup if available
    const to = `${approval.teamMember.replace(/\s+/g, '').toLowerCase()}@gmail.com`;
    const subject = `Leave Request ${action.charAt(0).toUpperCase() + action.slice(1)}`;
    const dates = `${approval.startDate} to ${approval.endDate}`;
    const message = `Hello ${approval.teamMember},\n\nYour leave request for ${dates} (${approval.leaveType}, ${approval.days} days) has been ${action}.\nReason: ${approval.reason}\n\nRegards,\nHR Team`;
    try {
      await apiService.post('/api/notify-leave', { to, subject, message, approval });
    } catch (err) {
      // Optionally handle notification error
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiService.put(`/api/leave-requests/${id}`, { status: 'approved' });
      setApprovals(prev => prev.map(a => {
        if (a.id === id) {
          sendNotification({ ...a, status: 'approved' }, 'approved');
          return { ...a, status: 'approved' };
        }
        return a;
      }));
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiService.put(`/api/leave-requests/${id}`, { status: 'rejected' });
      setApprovals(prev => prev.map(a => {
        if (a.id === id) {
          sendNotification({ ...a, status: 'rejected' }, 'rejected');
          return { ...a, status: 'rejected' };
        }
        return a;
      }));
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const pendingCount = approvals.filter(a => a.status === 'pending').length;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h3 className="text-2xl font-bold text-gray-900">PTO Approval Workflow</h3>
        <p className="text-gray-600 mt-1">Review and approve PTO requests submitted by CSPs for their team members</p>
      </div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Pending Approvals</h3>
        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
          {pendingCount} pending
        </span>
      </div>
      <div className="flex flex-wrap gap-4 mb-4">
        <select value={sortField} onChange={e => setSortField(e.target.value)} className="px-2 py-1 border rounded">
          <option value="date">Sort by Date</option>
          <option value="teamMember">Sort by Team Member</option>
          <option value="status">Sort by Status</option>
        </select>
        <select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')} className="px-2 py-1 border rounded">
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-2 py-1 border rounded">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-2 py-1 border rounded">
          <option value="all">All Types</option>
          <option value="Vacation">Vacation</option>
          <option value="Sick Leave">Sick Leave</option>
          <option value="Personal">Personal</option>
        </select>
        <input
          type="text"
          value={memberFilter}
          onChange={e => setMemberFilter(e.target.value)}
          placeholder="Filter by team member"
          className="px-2 py-1 border rounded"
        />
      </div>
      {loading && (
        <div className="flex items-center justify-center mb-4">
          <span className="text-blue-600">Loading approvals...</span>
          <svg className="animate-spin ml-2 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
        </div>
      )}
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
  <div className="space-y-4">
      <div className="flex justify-center items-center gap-2 mt-6">
        <button
          className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span className="text-sm font-medium">Page {page} of {Math.ceil(total / limit) || 1}</span>
        <button
          className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
          onClick={() => setPage(p => p + 1)}
          disabled={page >= Math.ceil(total / limit)}
        >
          Next
        </button>
      </div>
        {approvals
          .filter(a => statusFilter === 'all' || a.status === statusFilter)
          .filter(a => typeFilter === 'all' || a.leaveType === typeFilter)
          .filter(a => memberFilter === '' || a.teamMember.toLowerCase().includes(memberFilter.toLowerCase()))
          .sort((a, b) => {
            let valA: number | string;
            let valB: number | string;
            if (sortField === 'date') {
              valA = new Date(a.startDate).getTime();
              valB = new Date(b.startDate).getTime();
            } else if (sortField === 'teamMember') {
              valA = a.teamMember.toLowerCase();
              valB = b.teamMember.toLowerCase();
            } else if (sortField === 'status') {
              valA = a.status;
              valB = b.status;
            }
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          })
          .map((approval) => {
            const dates = `${new Date(approval.startDate).toLocaleDateString()} - ${new Date(approval.endDate).toLocaleDateString()}`;
            return (
          <div key={approval.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{approval.teamMember}</h4>
                  <p className="text-sm text-gray-600">{approval.leaveType} - {approval.days} days</p>
                </div>
              </div>
              {approval.status === 'pending' && <Clock className="w-5 h-5 text-yellow-500" />}
              {approval.status === 'approved' && <CheckCircle className="w-5 h-5 text-green-500" />}
              {approval.status === 'rejected' && <XCircle className="w-5 h-5 text-red-500" />}
            </div>
            {approval.history && approval.history.length > 0 && (
              <div className="mb-2">
                <h5 className="text-xs font-semibold text-gray-700 mb-1">History:</h5>
                <ul className="text-xs text-gray-600 space-y-1">
                  {approval.history.map((h, idx) => (
                    <li key={idx}>
                      <span className="font-medium">{h.action}</span> by <span className="font-medium">{h.actor}</span> at {new Date(h.timestamp).toLocaleString()}
                      {h.note && <span className="text-gray-500"> - {h.note}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mb-3 text-sm">
              <p className="text-gray-700"><span className="font-medium">Dates:</span> {dates}</p>
              <p className="text-gray-700"><span className="font-medium">Reason:</span> {approval.reason}</p>
              {approval.submittedBy && (
                <p className="text-gray-700"><span className="font-medium">Submitted by:</span> {approval.submittedBy}</p>
              )}
            </div>
            {approval.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(approval.id)}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => handleReject(approval.id)}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            )}
            {approval.status === 'approved' && (
              <div className="bg-green-50 text-green-700 py-2 px-4 rounded-md text-center font-medium">
                Approved
              </div>
            )}
            {approval.status === 'rejected' && (
              <div className="bg-red-50 text-red-700 py-2 px-4 rounded-md text-center font-medium">
                Rejected
              </div>
            )}
          </div>
        )})}
      </div>
    </div>
  );
}
