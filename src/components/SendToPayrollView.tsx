import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Send, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
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
  clientApprovedBy?: string;
  clientApprovedAt?: string;
  clientApprovalNotes?: string;
  assignedTo?: string;
  assignedToEmail?: string;
}

export default function SendToPayrollView() {
  const { user } = useAppContext();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await apiService.get('/api/leave-requests');
      const allRequests = response.data || [];
      
      // Filter for client-approved status assigned to current CSP
      const filtered = allRequests.filter((r: LeaveRequest) => 
        r.status === 'client-approved' && 
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

  const handleSendToPayroll = async (id: string) => {
    setSending({ ...sending, [id]: true });
    try {
      await apiService.post(`/api/leave-requests/${id}/send-to-payroll`, {
        cspName: user?.name
      });

      alert('Request successfully sent to payroll!');
      fetchRequests();
    } catch (err) {
      console.error('Failed to send to payroll:', err);
      alert('Failed to send request to payroll. Please try again.');
    } finally {
      setSending({ ...sending, [id]: false });
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
              <Send className="w-6 h-6 text-blue-600" />
              Send to Payroll
            </h3>
            <p className="text-gray-600 text-sm mt-2">
              Step 4: Forward client-approved requests to payroll for processing
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
              <Send className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-1">No approved requests ready for payroll</p>
              <p className="text-gray-500 text-sm">
                Requests will appear here after you mark them as client-approved
              </p>
            </div>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="border border-green-200 bg-green-50 rounded-lg p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h5 className="font-semibold text-lg text-gray-900">
                        {request.teamMember}
                      </h5>
                    </div>
                    <div className="text-sm text-gray-700 space-y-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-medium">Leave Type:</span>{' '}
                          <span className="capitalize">{request.leaveType}</span>
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {request.days} days
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Dates:</span>{' '}
                        <span className="text-gray-900">{request.startDate} → {request.endDate}</span>
                      </div>
                      {request.reason && (
                        <div>
                          <span className="font-medium">Reason:</span> {request.reason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Client Approval Details */}
                <div className="bg-white rounded-lg p-3 mb-4 border border-green-200">
                  <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-2">
                    <CheckCircle className="w-4 h-4" />
                    Client Approval Details
                  </div>
                  <div className="text-sm text-gray-700 space-y-1">
                    {request.clientApprovedBy && (
                      <div>
                        <span className="font-medium">Approved by:</span> {request.clientApprovedBy}
                      </div>
                    )}
                    {request.clientApprovedAt && (
                      <div>
                        <span className="font-medium">Approved on:</span>{' '}
                        {new Date(request.clientApprovedAt).toLocaleString()}
                      </div>
                    )}
                    {request.clientApprovalNotes && (
                      <div>
                        <span className="font-medium">Notes:</span> {request.clientApprovalNotes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Send to Payroll Button */}
                <button
                  onClick={() => handleSendToPayroll(request.id)}
                  disabled={sending[request.id]}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending[request.id] ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send to Payroll
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">What happens when you send to payroll?</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Request status changes to "Sent to Payroll"</li>
              <li>Payroll team receives notification</li>
              <li>Team member is notified their request is being processed</li>
              <li>Request appears in payroll processing queue</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
