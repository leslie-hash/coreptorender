import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { CheckCircle, XCircle, RefreshCw, CheckSquare, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api.service';

interface LeaveRequest {
  id: string;
  teamMember: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason?: string;
  assignedTo?: string;
  assignedToEmail?: string;
}

export default function ClientApprovalMarking() {
  const { user } = useAppContext();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [clientApprovalMethod, setClientApprovalMethod] = useState<Record<string, string>>({});
  const [clientApprovalNotes, setClientApprovalNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await apiService.get('/api/leave-requests');
      const allRequests = response.data || [];
      
      // Filter for pending-client-approval status assigned to current CSP
      const filtered = allRequests.filter((r: LeaveRequest) => 
        r.status === 'pending-client-approval' && 
        (r.assignedToEmail === user?.email || r.assignedTo === user?.name)
      );
      
      setRequests(filtered);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      setRequests([]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleMarkClientApproved = async (id: string) => {
    const approvalMethod = clientApprovalMethod[id] || 'offline';
    const notes = clientApprovalNotes[id] || '';
    const clientName = clientNames[id] || 'Client';

    if (!notes.trim()) {
      alert('Please provide approval details explaining how the client approved this request.');
      return;
    }

    try {
      await apiService.post(`/api/leave-requests/${id}/mark-client-approved`, {
        approvalMethod,
        notes,
        clientName,
        cspName: user?.name
      });

      alert('Request marked as client-approved! It will now appear in "Send to Payroll" section.');
      fetchRequests();
    } catch (err) {
      console.error('Failed to mark as approved:', err);
      alert('Failed to mark request as approved. Please try again.');
    }
  };

  const handleMarkClientRejected = async (id: string) => {
    const approvalMethod = clientApprovalMethod[id] || 'offline';
    const notes = clientApprovalNotes[id] || '';
    const clientName = clientNames[id] || 'Client';

    if (!notes.trim()) {
      alert('Please provide rejection reason from the client.');
      return;
    }

    try {
      await apiService.post(`/api/leave-requests/${id}/mark-client-rejected`, {
        approvalMethod,
        notes,
        clientName,
        cspName: user?.name
      });

      alert('Request marked as client-rejected. Team member has been notified.');
      fetchRequests();
    } catch (err) {
      console.error('Failed to mark as rejected:', err);
      alert('Failed to mark request as rejected. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-blue-600" />
              Client Approval
            </h3>
            <p className="text-gray-600 text-sm mt-2">
              Step 3: After forwarding to client via email/call/meeting, record their response here
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-1">No requests awaiting client approval</p>
              <p className="text-gray-500 text-sm">
                Requests will appear here after you verify and forward them to clients
              </p>
            </div>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="border border-blue-200 bg-blue-50 rounded-lg p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h5 className="font-semibold text-lg text-gray-900 mb-2">{request.teamMember}</h5>
                    <div className="text-sm text-gray-700 space-y-1">
                      <div>
                        <span className="font-medium">Leave Type:</span>{' '}
                        <span className="capitalize">{request.leaveType}</span>
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span> {request.days} days
                      </div>
                      <div>
                        <span className="font-medium">Dates:</span> {request.startDate} → {request.endDate}
                      </div>
                      {request.reason && (
                        <div>
                          <span className="font-medium">Reason:</span> {request.reason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 space-y-3 mt-4">
                  <div className="flex items-center gap-2 text-blue-700 text-sm mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Record client's offline response:</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name:
                    </label>
                    <input
                      type="text"
                      value={clientNames[request.id] || ''}
                      onChange={(e) => setClientNames({ ...clientNames, [request.id]: e.target.value })}
                      placeholder="Enter client name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      How did client respond?
                    </label>
                    <select
                      value={clientApprovalMethod[request.id] || 'email'}
                      onChange={(e) => setClientApprovalMethod({ ...clientApprovalMethod, [request.id]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="email">Email</option>
                      <option value="call">Phone Call</option>
                      <option value="meeting">Meeting/Check-in</option>
                      <option value="system">System (Client approved directly)</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Approval/Rejection Details <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={clientApprovalNotes[request.id] || ''}
                      onChange={(e) => setClientApprovalNotes({ ...clientApprovalNotes, [request.id]: e.target.value })}
                      placeholder='e.g., "Approved via email on 12/5/2025" or "Client declined - budget constraints"'
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleMarkClientApproved(request.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors font-medium"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Client Approved
                    </button>
                    <button
                      onClick={() => handleMarkClientRejected(request.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition-colors font-medium"
                    >
                      <XCircle className="w-5 h-5" />
                      Client Rejected
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
