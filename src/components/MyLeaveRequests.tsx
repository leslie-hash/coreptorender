import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  submittedDate: string;
  submittedBy?: string;
  assignedTo?: string;
  cspApprovedAt?: string;
  cspApprovedBy?: string;
  cspNotes?: string;
  clientApprovedAt?: string;
  clientApprovedBy?: string;
  clientNotes?: string;
  sentToPayrollAt?: string;
  history?: Array<{
    action: string;
    actor: string;
    timestamp: string;
    note?: string;
  }>;
}

const statusSteps = [
  { key: 'csp-review', label: 'Step 1: CSP Review', color: 'blue' },
  { key: 'pending-client-approval', label: 'Step 2: Awaiting Client', color: 'yellow' },
  { key: 'client-approved', label: 'Step 3: Client Approved', color: 'purple' },
  { key: 'sent-to-payroll', label: 'Step 4: Sent to Payroll', color: 'green' },
  { key: 'approved', label: 'Step 5: Completed', color: 'green' }
];

const getStatusStep = (status: string): number => {
  // Map payroll-processing to sent-to-payroll step
  if (status === 'payroll-processing') status = 'sent-to-payroll';
  const index = statusSteps.findIndex(s => s.key === status);
  return index >= 0 ? index : 0;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'csp-review': return 'bg-blue-100 text-blue-800';
    case 'pending-client-approval': return 'bg-yellow-100 text-yellow-800';
    case 'client-approved': return 'bg-purple-100 text-purple-800';
    case 'payroll-processing':
    case 'sent-to-payroll': return 'bg-green-100 text-green-800';
    case 'approved': return 'bg-green-100 text-green-800';
    case 'denied': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved': 
    case 'payroll-processing':
    case 'sent-to-payroll': 
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'denied': 
      return <XCircle className="w-5 h-5 text-red-600" />;
    case 'csp-review':
    case 'pending-client-approval':
    case 'client-approved':
      return <Clock className="w-5 h-5 text-blue-600" />;
    default: 
      return <AlertCircle className="w-5 h-5 text-gray-600" />;
  }
};

export default function MyLeaveRequests() {
  const { user } = useAppContext();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  useEffect(() => {
    fetchMyRequests();
  }, [user]);

  const fetchMyRequests = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch('/api/leave-requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch requests');
      
      const data = await response.json();
      
      // Filter to only show requests submitted by this user
      const myRequests = data.data.filter((req: LeaveRequest) => 
        req.submittedBy === user?.name || req.submittedBy === user?.email
      );
      
      // Sort by submission date (most recent first)
      myRequests.sort((a: LeaveRequest, b: LeaveRequest) => 
        new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()
      );
      
      setRequests(myRequests);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A90E2]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Leave Requests</h2>
        <p className="text-sm text-gray-600">
          Track your leave requests through the 5-step approval process
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Leave Requests</h3>
          <p className="text-gray-600">You haven't submitted any leave requests yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const currentStep = getStatusStep(request.status);
            
            return (
              <div key={request.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(request.status)}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.leaveType}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {formatDate(request.startDate)} - {formatDate(request.endDate)} ({request.days} days)
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                      {request.status === 'payroll-processing' ? 'SENT TO PAYROLL' : request.status.replace(/-/g, ' ').toUpperCase()}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      {statusSteps.map((step, index) => (
                        <div key={step.key} className="flex-1 flex items-center">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                            index <= currentStep 
                              ? 'border-[#4A90E2] bg-[#4A90E2] text-white' 
                              : 'border-gray-300 bg-white text-gray-400'
                          }`}>
                            {index < currentStep ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <span className="text-xs font-bold">{index + 1}</span>
                            )}
                          </div>
                          {index < statusSteps.length - 1 && (
                            <div className={`flex-1 h-1 mx-2 ${
                              index < currentStep ? 'bg-[#4A90E2]' : 'bg-gray-300'
                            }`} />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600 px-1">
                      {statusSteps.map((step, index) => (
                        <div key={step.key} className={`flex-1 text-center ${index === 0 ? 'text-left' : index === statusSteps.length - 1 ? 'text-right' : ''}`}>
                          {step.label.replace('Step ' + (index + 1) + ': ', '')}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="border-t pt-4 mt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Reason:</span>
                        <p className="font-medium text-gray-900">{request.reason}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Submitted:</span>
                        <p className="font-medium text-gray-900">{formatDate(request.submittedDate)}</p>
                      </div>
                      {request.assignedTo && (
                        <div>
                          <span className="text-gray-600">Assigned CSP:</span>
                          <p className="font-medium text-gray-900">{request.assignedTo}</p>
                        </div>
                      )}
                      {request.cspApprovedBy && (
                        <div>
                          <span className="text-gray-600">CSP Approved By:</span>
                          <p className="font-medium text-gray-900">{request.cspApprovedBy}</p>
                        </div>
                      )}
                      {request.clientApprovedBy && (
                        <div>
                          <span className="text-gray-600">Client Approved By:</span>
                          <p className="font-medium text-gray-900">{request.clientApprovedBy}</p>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="mt-4">
                      <button
                        onClick={() => setSelectedRequest(selectedRequest?.id === request.id ? null : request)}
                        className="flex items-center gap-2 text-[#4A90E2] hover:text-[#357ABD] font-medium text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        {selectedRequest?.id === request.id ? 'Hide' : 'View'} Full History
                      </button>
                    </div>

                    {/* History Timeline */}
                    {selectedRequest?.id === request.id && request.history && request.history.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold text-gray-900 mb-3">Request History</h4>
                        <div className="space-y-3">
                          {request.history.map((entry, index) => (
                            <div key={index} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className="w-2 h-2 rounded-full bg-[#4A90E2]" />
                                {index < request.history!.length - 1 && (
                                  <div className="w-px h-full bg-gray-300 mt-1" />
                                )}
                              </div>
                              <div className="flex-1 pb-4">
                                <p className="font-medium text-gray-900">{entry.action.replace(/-/g, ' ').toUpperCase()}</p>
                                <p className="text-sm text-gray-600">by {entry.actor}</p>
                                <p className="text-xs text-gray-500">{formatDate(entry.timestamp)}</p>
                                {entry.note && (
                                  <p className="text-sm text-gray-700 mt-1 italic">"{entry.note}"</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
