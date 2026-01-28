import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Eye, User, FileText, CalendarDays, MessageSquare } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

interface LeaveRequest {
  id: string;
  teamMember?: string;
  teamMemberName?: string;
  department?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  submittedDate: string;
  submittedBy?: string;
  // Contactable Options
  address?: string;
  phoneNumber?: string;
  // Coverage
  coverageName?: string;
  coveragePosition?: string;
  coverageAware?: string;
  // Sick Leave
  attachDoctorsNote?: boolean;
  // Signatures
  applicantSignature?: {
    signed: boolean;
    name: string;
    date: string;
  };
  cspSignature?: {
    signed: boolean;
    name: string;
    date: string;
    approved: boolean;
  };
  clientSignature?: {
    signed: boolean;
    name: string;
    date: string;
    approved: boolean;
  };
  // Approval fields
  assignedTo?: string;
  cspApprovedAt?: string;
  cspApprovedBy?: string;
  cspNotes?: string;
  clientApprovedAt?: string;
  clientApprovedBy?: string;
  clientNotes?: string;
  sentToPayrollAt?: string;
  ptoBalance?: {
    annualPTO: number;
    usedPTO: number;
    remainingPTO: number;
  };
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
    case 'csp-review': return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
    case 'pending-client-approval': return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300';
    case 'client-approved': return 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300';
    case 'payroll-processing':
    case 'sent-to-payroll': return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300';
    case 'approved': return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300';
    case 'denied': return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300';
    default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved': 
    case 'payroll-processing':
    case 'sent-to-payroll': 
      return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
    case 'denied': 
      return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
    case 'csp-review':
    case 'pending-client-approval':
    case 'client-approved':
      return <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    default: 
      return <AlertCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
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
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) throw new Error('Failed to fetch requests');
      
      const data = await response.json();
      
      // Filter to only show requests submitted by or for this user
      const myRequests = data.data.filter((req: LeaveRequest) => 
        req.submittedBy === user?.name || 
        req.submittedBy === user?.email ||
        req.teamMember === user?.name ||
        req.teamMember === user?.email
      );
      
      // Sort by submission date (oldest first)
      myRequests.sort((a: LeaveRequest, b: LeaveRequest) => 
        new Date(a.submittedDate).getTime() - new Date(b.submittedDate).getTime()
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A90E2] dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">My Leave Requests</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Track your leave requests through the 5-step approval process
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900">
          <Calendar className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Leave Requests</h3>
          <p className="text-gray-600 dark:text-gray-400">You haven't submitted any leave requests yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const currentStep = getStatusStep(request.status);
            const employeeName = request.teamMemberName || request.teamMember || request.submittedBy || 'Unknown';
            
            return (
              <div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 overflow-hidden">
                {/* Header - Like official form header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-white" />
                      <div>
                        <h3 className="text-lg font-bold text-white">Leave Application Form</h3>
                        <p className="text-blue-100 text-sm">Request ID: {request.id}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${getStatusColor(request.status)}`}>
                      {request.status === 'payroll-processing' ? 'SENT TO PAYROLL' : request.status.replace(/-/g, ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {/* Form-like Layout matching Official Leave Form */}
                  <div className="border dark:border-gray-700 rounded-lg overflow-hidden mb-4">
                    {/* Team Member Information Section */}
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b dark:border-gray-600">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Team Member Information
                      </h4>
                    </div>
                    <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Name</label>
                        <p className="font-semibold text-gray-900 dark:text-white">{employeeName}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Department</label>
                        <p className="font-semibold text-gray-900 dark:text-white">{request.department || 'GTS'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date Submitted</label>
                        <p className="font-semibold text-gray-900 dark:text-white">{formatDate(request.submittedDate)}</p>
                      </div>
                    </div>

                    {/* Type of Leave Section */}
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-t border-b dark:border-gray-600">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Type of Leave</h4>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {['Annual', 'Unpaid', 'Compassionate', 'Maternity', 'Sick Leave'].map((type) => (
                          <span
                            key={type}
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              request.leaveType === type || request.leaveType === type + ' Leave'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                      {(request.leaveType === 'Sick Leave' || request.leaveType === 'Sick') && request.attachDoctorsNote && (
                        <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">📋 Doctor's Note Attached</p>
                      )}
                      {(request.leaveType === 'Maternity' || request.leaveType === 'Maternity Leave') && (
                        <div className="mt-3 p-3 bg-pink-50 dark:bg-pink-900/30 rounded-lg border border-pink-200 dark:border-pink-800 text-sm">
                          <p className="font-medium text-pink-800 dark:text-pink-300 mb-1">📋 Maternity Leave (98 days)</p>
                          <p className="text-pink-700 dark:text-pink-400">Doctor's letter with Expected Date of Delivery (EDD) required.</p>
                        </div>
                      )}
                    </div>

                    {/* Leave Period Section */}
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-t border-b dark:border-gray-600">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" />
                        Leave Period
                      </h4>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Request From</label>
                        <p className="font-semibold text-gray-900 dark:text-white">{formatDate(request.startDate)}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">To</label>
                        <p className="font-semibold text-gray-900 dark:text-white">{formatDate(request.endDate)}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">No. of Days Taken</label>
                        <p className="font-semibold text-gray-900 dark:text-white">{request.days} {request.days === 1 ? 'day' : 'days'}</p>
                      </div>
                    </div>

                    {/* Contactable Options Section */}
                    {(request.address || request.phoneNumber) && (
                      <>
                        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-t border-b dark:border-gray-600">
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Contactable Options</h4>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Address</label>
                            <p className="font-semibold text-gray-900 dark:text-white">{request.address || '-'}</p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phone Number</label>
                            <p className="font-semibold text-gray-900 dark:text-white">{request.phoneNumber || '-'}</p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Coverage Section */}
                    {(request.coverageName || request.coveragePosition) && (
                      <>
                        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-t border-b dark:border-gray-600">
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Coverage (Who will handle your responsibilities)</h4>
                        </div>
                        <div className="p-4 grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Team Member Name</label>
                            <p className="font-semibold text-gray-900 dark:text-white">{request.coverageName || '-'}</p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Position</label>
                            <p className="font-semibold text-gray-900 dark:text-white">{request.coveragePosition || '-'}</p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Is the Team Member Aware</label>
                            <p className="font-semibold text-gray-900 dark:text-white">{request.coverageAware || 'Yes'}</p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Additional Notes Section */}
                    {request.reason && (
                      <>
                        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-t border-b dark:border-gray-600">
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Additional Notes
                          </h4>
                        </div>
                        <div className="p-4">
                          <p className="text-gray-900 dark:text-white">{request.reason}</p>
                        </div>
                      </>
                    )}

                    {/* PTO Balance Section (if available) */}
                    {request.ptoBalance && (
                      <>
                        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-t border-b dark:border-gray-600">
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">PTO Balance at Submission</h4>
                        </div>
                        {request.ptoBalance.remainingPTO !== undefined && request.ptoBalance.annualPTO !== undefined ? (
                          // Full balance info (for CSPs/Admins)
                          <div className="p-4 grid grid-cols-3 gap-4">
                            <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                              <label className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide">Annual PTO</label>
                              <p className="text-lg font-bold text-blue-900 dark:text-blue-200">{request.ptoBalance.annualPTO}</p>
                            </div>
                            <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/30 rounded">
                              <label className="text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wide">Used</label>
                              <p className="text-lg font-bold text-orange-900 dark:text-orange-200">{request.ptoBalance.usedPTO}</p>
                            </div>
                            <div className="text-center p-2 bg-green-50 dark:bg-green-900/30 rounded">
                              <label className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide">Remaining</label>
                              <p className="text-lg font-bold text-green-900 dark:text-green-200">{request.ptoBalance.remainingPTO}</p>
                            </div>
                          </div>
                        ) : (
                          // Simplified balance (for Team Members - only remaining)
                          <div className="p-4 flex justify-center">
                            <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg min-w-[200px]">
                              <label className="text-sm text-green-600 dark:text-green-400 uppercase tracking-wide">Remaining PTO Days</label>
                              <p className="text-3xl font-bold text-green-900 dark:text-green-200 mt-2">
                                {request.ptoBalance.remainingPTO || request.ptoBalance.remaining || 0}
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Signatories Section - Like official form */}
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-t border-b dark:border-gray-600">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Signatories
                      </h4>
                    </div>
                    <div className="p-4">
                      {/* Signatories Table */}
                      <table className="w-full border-collapse border dark:border-gray-600 text-sm mb-4">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-600">
                            <th className="border dark:border-gray-500 px-3 py-2 text-left text-gray-700 dark:text-gray-200">Role</th>
                            <th className="border dark:border-gray-500 px-3 py-2 text-left text-gray-700 dark:text-gray-200">Name</th>
                            <th className="border dark:border-gray-500 px-3 py-2 text-left text-gray-700 dark:text-gray-200">Date</th>
                            <th className="border dark:border-gray-500 px-3 py-2 text-center text-gray-700 dark:text-gray-200">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border dark:border-gray-600 px-3 py-2 font-medium text-gray-900 dark:text-white">Applicant</td>
                            <td className="border dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white">{employeeName}</td>
                            <td className="border dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white">{formatDate(request.submittedDate)}</td>
                            <td className="border dark:border-gray-600 px-3 py-2 text-center">
                              <span className="text-green-600 dark:text-green-400">✓ Signed</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="border dark:border-gray-600 px-3 py-2 font-medium text-gray-900 dark:text-white">CSP Reviewer</td>
                            <td className="border dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white">{request.cspApprovedBy || request.assignedTo || '-'}</td>
                            <td className="border dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white">{request.cspApprovedAt ? formatDate(request.cspApprovedAt) : '-'}</td>
                            <td className="border dark:border-gray-600 px-3 py-2 text-center">
                              {request.cspApprovedBy ? (
                                <span className="text-green-600 dark:text-green-400">✓ Approved</span>
                              ) : request.status === 'denied' ? (
                                <span className="text-red-600 dark:text-red-400">✗ Denied</span>
                              ) : (
                                <span className="text-yellow-600 dark:text-yellow-400">⏳ Pending</span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="border dark:border-gray-600 px-3 py-2 font-medium text-gray-900 dark:text-white">Client Approver</td>
                            <td className="border dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white">{request.clientApprovedBy || '-'}</td>
                            <td className="border dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white">{request.clientApprovedAt ? formatDate(request.clientApprovedAt) : '-'}</td>
                            <td className="border dark:border-gray-600 px-3 py-2 text-center">
                              {request.clientApprovedBy ? (
                                <span className="text-green-600 dark:text-green-400">✓ Approved</span>
                              ) : request.status === 'denied' ? (
                                <span className="text-red-600 dark:text-red-400">✗ Denied</span>
                              ) : request.cspApprovedBy ? (
                                <span className="text-yellow-600 dark:text-yellow-400">⏳ Pending</span>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500">—</span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          {statusSteps.map((step, index) => (
                            <div key={step.key} className="flex-1 flex items-center">
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                                index <= currentStep 
                                  ? 'border-[#4A90E2] bg-[#4A90E2] text-white' 
                                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                              }`}>
                                {index < currentStep ? (
                                  <CheckCircle className="w-5 h-5" />
                                ) : (
                                  <span className="text-xs font-bold">{index + 1}</span>
                                )}
                              </div>
                              {index < statusSteps.length - 1 && (
                                <div className={`flex-1 h-1 mx-2 ${
                                  index < currentStep ? 'bg-[#4A90E2]' : 'bg-gray-300 dark:bg-gray-600'
                                }`} />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 px-1">
                          {statusSteps.map((step, index) => (
                            <div key={step.key} className={`flex-1 text-center ${index === 0 ? 'text-left' : index === statusSteps.length - 1 ? 'text-right' : ''}`}>
                              {step.label.replace('Step ' + (index + 1) + ': ', '')}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* View History Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => setSelectedRequest(selectedRequest?.id === request.id ? null : request)}
                      className="flex items-center gap-2 text-[#4A90E2] dark:text-blue-400 hover:text-[#357ABD] dark:hover:text-blue-300 font-medium text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      {selectedRequest?.id === request.id ? 'Hide' : 'View'} Full History
                    </button>
                  </div>

                  {/* History Timeline */}
                  {selectedRequest?.id === request.id && request.history && request.history.length > 0 && (
                    <div className="mt-4 pt-4 border-t dark:border-gray-700">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Request History</h4>
                      <div className="space-y-3">
                        {request.history.map((entry, index) => (
                          <div key={index} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-2 h-2 rounded-full bg-[#4A90E2]" />
                              {index < request.history!.length - 1 && (
                                <div className="w-px h-full bg-gray-300 dark:bg-gray-600 mt-1" />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <p className="font-medium text-gray-900 dark:text-white">{entry.action.replace(/-/g, ' ').toUpperCase()}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">by {entry.actor}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-500">{formatDate(entry.timestamp)}</p>
                              {entry.note && (
                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 italic">"{entry.note}"</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
