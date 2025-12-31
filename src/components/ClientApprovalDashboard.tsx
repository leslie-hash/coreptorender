import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, User, Calendar } from 'lucide-react';
import { apiService } from '../services/api.service';
import { useAppContext } from '@/contexts/AppContext';

interface LeaveRequest {
  id: string;
  teamMember: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  submittedBy: string;
  submittedAt: string;
  cspApprovedBy?: string;
  cspNotes?: string;
  assignedTo?: string;
  ptoBalance: {
    annualPTO: number;
    usedPTO: number;
    remainingPTO: number;
  };
}

export default function ClientApprovalDashboard() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState<{ [key: string]: string }>({});
  const { user } = useAppContext();

  useEffect(() => {
    fetchPendingRequests();
    
    // Auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchPendingRequests();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/api/leave-requests?page=1&limit=100');
      const allRequests = Array.isArray(res.data) ? res.data : (res.data.data || []);
      // Filter for requests pending client approval
      const pending = allRequests.filter((r: LeaveRequest) => r.status === 'pending-client-approval');
      setRequests(pending);
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
      setRequests([]);
    }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    const notes = approvalNotes[id] || '';
    try {
      await apiService.post(`/api/leave-requests/${id}/client-approval`, {
        approved: true,
        notes,
        clientName: user?.name || 'Client'
      });
      alert('✅ Request approved! CSP will send to payroll.');
      fetchPendingRequests();
    } catch (err) {
      alert('Failed to approve request');
    }
  };

  const handleDeny = async (id: string) => {
    const notes = approvalNotes[id] || '';
    if (!notes) {
      alert('Please provide a reason for denial');
      return;
    }
    try {
      await apiService.post(`/api/leave-requests/${id}/client-approval`, {
        approved: false,
        notes,
        clientName: user?.name || 'Client'
      });
      alert('❌ Request denied');
      fetchPendingRequests();
    } catch (err) {
      alert('Failed to deny request');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Loading requests...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900">Client Approval Dashboard</h3>
        <p className="text-gray-600 mt-1">Review and approve leave requests for your team members</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h4 className="text-xl font-semibold text-gray-800">Pending Your Approval</h4>
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
          {requests.length} pending
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No pending approval requests</p>
          <p className="text-gray-500 text-sm mt-1">Leave requests for your team members will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-gray-500" />
                    <h5 className="font-semibold text-lg text-gray-900">{request.teamMember}</h5>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      CSP Verified
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium text-gray-900 capitalize">{request.leaveType}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Days:</span>{' '}
                      <span className="font-medium text-gray-900">{request.days}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-gray-600">Dates:</span>{' '}
                      <span className="font-medium text-gray-900">{request.startDate} → {request.endDate}</span>
                    </div>
                  </div>

                  {request.reason && (
                    <div className="mb-3 text-sm bg-gray-50 p-3 rounded border border-gray-200">
                      <span className="text-gray-600 font-medium">Reason:</span>{' '}
                      <span className="text-gray-800">{request.reason}</span>
                    </div>
                  )}

                  {/* CSP Notes */}
                  {request.cspNotes && (
                    <div className="mb-3 text-sm bg-blue-50 p-3 rounded border border-blue-200">
                      <span className="text-blue-700 font-medium">CSP Notes:</span>{' '}
                      <span className="text-blue-900">{request.cspNotes}</span>
                      <div className="text-xs text-blue-600 mt-1">
                        Verified by: {request.cspApprovedBy}
                      </div>
                    </div>
                  )}

                  {/* PTO Balance Info */}
                  <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                    <p className="text-sm font-semibold text-green-900 mb-1">PTO Balance:</p>
                    <div className="flex gap-4 text-sm text-green-800">
                      <span>Annual: <strong>{request.ptoBalance?.annualPTO || 'N/A'}</strong></span>
                      <span>Used: <strong>{request.ptoBalance?.usedPTO || 0}</strong></span>
                      <span>Remaining: <strong>{request.ptoBalance?.remainingPTO || 'N/A'}</strong></span>
                    </div>
                  </div>

                  {/* Approval Notes */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Notes (optional for approval, required for denial):
                    </label>
                    <textarea
                      value={approvalNotes[request.id] || ''}
                      onChange={(e) => setApprovalNotes({ ...approvalNotes, [request.id]: e.target.value })}
                      placeholder="Add any comments or conditions for approval..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleApprove(request.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => handleDeny(request.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
