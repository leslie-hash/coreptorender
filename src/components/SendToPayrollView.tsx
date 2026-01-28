import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Send, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api.service';

// Helper function to calculate days between two dates
function calculateDays(startDate: string, endDate: string): number {
  try {
    const parseDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      
      // Try ISO format first (2025-01-15)
      let date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date;
      
      // Try "30 August 2024" format
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                         'july', 'august', 'september', 'october', 'november', 'december'];
      const parts = dateStr.toLowerCase().split(' ');
      if (parts.length >= 2) {
        const day = parseInt(parts[0]);
        const monthIdx = monthNames.indexOf(parts[1]);
        const year = parts[2] ? parseInt(parts[2]) : new Date().getFullYear();
        if (!isNaN(day) && monthIdx !== -1) {
          return new Date(year, monthIdx, day);
        }
      }
      return null;
    };
    
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    
    if (start && end) {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 1;
  } catch {
    return 1;
  }
}

interface LeaveRequest {
  id: string;
  teamMember: string;
  teamMemberName?: string;
  client?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days?: number;
  status: string;
  reason?: string;
  clientApprovedBy?: string;
  clientApprovedAt?: string;
  clientApprovalNotes?: string;
  assignedTo?: string;
  assignedToEmail?: string;
}

// Helper to get actual days
function getDays(request: LeaveRequest): number {
  // First try the days field
  if (request.days && typeof request.days === 'number' && request.days > 0) {
    return request.days;
  }
  // Then calculate from dates
  if (request.startDate && request.endDate) {
    const calculated = calculateDays(request.startDate, request.endDate);
    if (calculated > 0) return calculated;
  }
  // Fallback to 1
  return 1;
}

// Helper to get team member name (handle legacy data)
function getTeamMemberName(request: LeaveRequest): string {
  // For legacy data where id is first name and teamMemberName is last name
  const isLegacyData = request.id && !request.id.startsWith('LR') && !request.id.includes('-');
  if (isLegacyData && request.teamMemberName) {
    return `${request.id} ${request.teamMemberName}`;
  }
  return request.teamMember || request.teamMemberName || 'Unknown';
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
      const response = await apiService.post(`/api/leave-requests/${id}/send-to-payroll`, {
        cspName: user?.name
      });

      if (response.data.packageUrl) {
        const downloadConfirm = window.confirm(
          '✅ Comprehensive payroll package created!\n\n' +
          'Package includes:\n' +
          '• Official Leave Application Form (DOCX)\n' +
          '• Detailed Summary Sheet (Excel)\n' +
          '• All Supporting Documents\n' +
          '• README with Instructions\n\n' +
          'Would you like to download the package now?'
        );
        
        if (downloadConfirm) {
          window.open(response.data.packageUrl, '_blank');
        }
      }

      alert('✅ Complete payroll package sent successfully!');
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
                        {getTeamMemberName(request)}
                      </h5>
                      {request.client && (
                        <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {request.client}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-700 space-y-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-medium">Team Member:</span>{' '}
                          <span>{getTeamMemberName(request)}</span>
                        </div>
                        <div>
                          <span className="font-medium">Client:</span>{' '}
                          <span>{request.client || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium">Leave Type:</span>{' '}
                          <span>PTO</span>
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {getDays(request)} days
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
