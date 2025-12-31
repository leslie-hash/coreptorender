import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Send, CheckSquare } from 'lucide-react';
import { apiService } from '../services/api.service';
import { useAppContext } from '@/contexts/AppContext';

interface ReviewRequest {
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
  assignedTo?: string;
  assignedToEmail?: string;
  ptoBalance: {
    annualPTO: number;
    usedPTO: number;
    remainingPTO: number;
  };
  validationPassed: boolean;
  submissionMethod?: string;
  sickNoteUrl?: string;
}

interface TeamMember {
  teamMemberName: string;
  csp: string;
  client?: string;
  email?: string;
  [key: string]: string | number | boolean | undefined;
}

export default function CSPReviewWorkflow() {
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [pendingClientApprovalRequests, setPendingClientApprovalRequests] = useState<ReviewRequest[]>([]);
  const [clientApprovedRequests, setClientApprovedRequests] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<{ [key: string]: string }>({});
  const [clientApprovalNotes, setClientApprovalNotes] = useState<{ [key: string]: string }>({});
  const [clientApprovalMethod, setClientApprovalMethod] = useState<{ [key: string]: string }>({});
  const [clientNames, setClientNames] = useState<{ [key: string]: string }>({});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const { user } = useAppContext();

  console.log('🎯 CSPReviewWorkflow component mounted/rendered');
  console.log('👤 Current user:', user);

  useEffect(() => {
    console.log('⚡ CSPReviewWorkflow useEffect triggered - STARTING DATA FETCH');
    console.log('⚡ User at useEffect:', user);
    fetchTeamMembers();
    fetchReviewRequests();
    
    // Auto-refresh every 30 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      fetchReviewRequests();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const res = await apiService.get('/api/team-member-meta');
      console.log('Team Members API Response:', res);
      const resData = res.data as TeamMember[] | { data: TeamMember[] };
      const teamMembersData = Array.isArray(resData) ? resData : (resData?.data || []);
      console.log('Team Members Data:', teamMembersData);
      setTeamMembers(teamMembersData);
    } catch (err) {
      console.error('Failed to fetch team members:', err);
      setTeamMembers([]);
    }
  };

  const fetchReviewRequests = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      console.log('🔄 Fetching leave requests...');
      console.log('🔑 User info:', { email: user?.email, name: user?.name, role: user?.role });
      const res = await apiService.get('/api/leave-requests?page=1&limit=100');
      console.log('📦 Full API Response:', res);
      console.log('📦 res.data (backend response):', res.data);
      console.log('📦 Is res.data an array?', Array.isArray(res.data));
      console.log('📦 Is res.data.data an array?', res.data && Array.isArray((res.data as { data?: unknown }).data));
      
      const responseData = res.data as ReviewRequest[] | { data: ReviewRequest[] };
      // Handle different response structures
      let allRequests = [];
      if (Array.isArray(responseData)) {
        allRequests = responseData;
        console.log('✅ Using res.data directly (array)');
      } else if (responseData && Array.isArray(responseData.data)) {
        allRequests = responseData.data;
        console.log('✅ Using res.data.data (nested array)');
      } else {
        allRequests = [];
        console.log('❌ Could not find array in response!');
      }
      
      console.log('📋 Total Leave Requests:', allRequests.length);
      console.log('📋 First 3 requests:', allRequests.slice(0, 3));
      
      // Log status distribution
      const statusCounts = allRequests.reduce((acc: Record<string, number>, r: ReviewRequest) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('📊 Status Distribution:', statusCounts);
      
      // Filter for requests in CSP review status
      const reviewRequests = allRequests.filter((r: ReviewRequest) => r.status === 'csp-review');
      console.log('✅ CSP Review Requests:', reviewRequests.length, reviewRequests);
      setRequests(reviewRequests);
      
      // Filter for requests pending client approval (awaiting offline approval)
      const pendingClientApproval = allRequests.filter((r: ReviewRequest) => r.status === 'pending-client-approval');
      console.log('⏳ Pending Client Approval Requests:', pendingClientApproval.length, pendingClientApproval);
      setPendingClientApprovalRequests(pendingClientApproval);
      
      // Filter for client-approved requests (ready for payroll)
      const clientApproved = allRequests.filter((r: ReviewRequest) => r.status === 'client-approved');
      console.log('💰 Client Approved Requests:', clientApproved.length, clientApproved);
      setClientApprovedRequests(clientApproved);
    } catch (err) {
      console.error('❌ Failed to fetch review requests:', err);
      setRequests([]);
      setPendingClientApprovalRequests([]);
      setClientApprovedRequests([]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  // Filter requests assigned to current CSP
  const getMyAssignedRequests = () => {
    if (!user?.email && !user?.name) {
      console.log('CSP Review: No user info found');
      return requests;
    }
    
    console.log('CSP Review - User Email:', user.email);
    console.log('CSP Review - User Name:', user.name);
    console.log('CSP Review - All Requests:', requests);
    
    // Filter requests assigned to this CSP by email or name
    const filtered = requests.filter(req => {
      // Get username part of email (before @)
      const userEmailPrefix = user.email ? user.email.split('@')[0].toLowerCase() : '';
      const reqEmailPrefix = req.assignedToEmail ? req.assignedToEmail.split('@')[0].toLowerCase() : '';
      
      // Check multiple conditions for matching
      // Match by email prefix (ignoring domain differences like @zimworx.org vs @zimworx.com)
      const matchByEmail = req.assignedToEmail && user.email && 
                          (req.assignedToEmail.toLowerCase() === user.email.toLowerCase() ||
                           userEmailPrefix === reqEmailPrefix);
      
      const matchByName = req.assignedTo && user.name && 
                         (req.assignedTo.toLowerCase() === user.name.toLowerCase() ||
                          user.name.toLowerCase().includes(req.assignedTo.toLowerCase()) ||
                          req.assignedTo.toLowerCase().includes(user.name.toLowerCase()));
      
      // Fallback: check team member assignment (also handle email domain differences)
      const matchByTeamMember = teamMembers.some(tm => {
        const tmCspPrefix = tm.csp ? tm.csp.split('@')[0].toLowerCase() : '';
        return (tm.employeeId === req.teamMember || tm.teamMemberName === req.teamMember) && 
               (tm.csp === user.email || tm.csp === user.name || tmCspPrefix === userEmailPrefix);
      });
      
      return matchByEmail || matchByName || matchByTeamMember;
    });
    
    console.log('CSP Review - My Assigned Requests:', filtered);
    
    return filtered;
  };

  const handleApprove = async (id: string) => {
    const notes = reviewNotes[id] || '';
    try {
      await apiService.post(`/api/leave-requests/${id}/csp-review`, {
        approved: true,
        notes,
        cspName: user?.name || 'CSP User'
      });
      alert('✅ Request approved and forwarded to client for approval');
      fetchReviewRequests();
    } catch (err) {
      alert('Failed to approve request');
    }
  };

  const handleReject = async (id: string) => {
    console.log('🔴 Reject button clicked for request:', id);
    console.log('🔴 Current review notes:', reviewNotes);
    const notes = reviewNotes[id] || '';
    console.log('🔴 Notes for this request:', notes);
    
    if (!notes) {
      console.log('🔴 No notes provided, showing alert');
      alert('Please provide a reason for rejection');
      return;
    }
    
    try {
      console.log('🔴 Sending rejection for request:', id, 'with notes:', notes);
      console.log('🔴 User info:', user);
      const response = await apiService.post(`/api/leave-requests/${id}/csp-review`, {
        approved: false,
        notes,
        cspName: user?.name || 'CSP User'
      });
      console.log('🔴 Rejection response:', response);
      alert('❌ Request rejected');
      fetchReviewRequests();
    } catch (err) {
      console.error('🔴 Rejection error:', err);
      alert(`Failed to reject request: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleMarkClientApproved = async (id: string) => {
    const approvalMethod = clientApprovalMethod[id] || 'offline';
    const notes = clientApprovalNotes[id] || '';
    const clientName = clientNames[id] || 'Client';
    
    if (!notes) {
      alert('Please provide details about the client approval (e.g., "Approved via email on 12/5" or "Approved during weekly check-in")');
      return;
    }
    
    try {
      await apiService.post(`/api/leave-requests/${id}/mark-client-approved`, {
        approvalMethod,
        notes,
        clientName,
        cspName: user?.name || 'CSP User'
      });
      alert('✅ Client approval recorded. Request ready for payroll.');
      fetchReviewRequests();
    } catch (err) {
      alert('Failed to mark client approval');
    }
  };

  const handleMarkClientRejected = async (id: string) => {
    const approvalMethod = clientApprovalMethod[id] || 'offline';
    const notes = clientApprovalNotes[id] || '';
    const clientName = clientNames[id] || 'Client';
    
    if (!notes) {
      alert('Please provide details about the client rejection (e.g., "Rejected via email on 12/5" or "Client denied during meeting")');
      return;
    }
    
    try {
      await apiService.post(`/api/leave-requests/${id}/mark-client-rejected`, {
        approvalMethod,
        notes,
        clientName,
        cspName: user?.name || 'CSP User'
      });
      alert('❌ Client rejection recorded. Team member will be notified.');
      fetchReviewRequests();
    } catch (err) {
      alert('Failed to mark client rejection');
    }
  };

  const handleSendToPayroll = async (id: string) => {
    try {
      await apiService.post(`/api/leave-requests/${id}/send-to-payroll`, {
        cspName: user?.name || 'CSP User',
        notes: 'Sent to payroll for processing'
      });
      alert('📤 Request sent to payroll');
      fetchReviewRequests();
    } catch (err) {
      alert('Failed to send to payroll');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Loading requests...</p>
      </div>
    );
  }

  const myAssignedRequests = getMyAssignedRequests();
  
  // Filter client-approved requests assigned to me
  const myClientApprovedRequests = clientApprovedRequests.filter(req => {
    // Get username part of email (before @) for domain-agnostic matching
    const userEmailPrefix = user?.email ? user.email.split('@')[0].toLowerCase() : '';
    const reqEmailPrefix = req.assignedToEmail ? req.assignedToEmail.split('@')[0].toLowerCase() : '';
    
    const matchByEmail = req.assignedToEmail && user?.email && 
                        (req.assignedToEmail.toLowerCase() === user.email.toLowerCase() ||
                         userEmailPrefix === reqEmailPrefix);
    
    const matchByName = req.assignedTo === user?.name;
    
    const matchByTeamMember = teamMembers.some(tm => {
      const tmCspPrefix = tm.csp ? tm.csp.split('@')[0].toLowerCase() : '';
      return (tm.employeeId === req.teamMember || tm.teamMemberName === req.teamMember) && 
             (tm.csp === user?.email || tmCspPrefix === userEmailPrefix);
    });
    
    return matchByEmail || matchByName || matchByTeamMember;
  });

  return (
    <div className="space-y-8">
      {/* Pending CSP Review Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Review Queue</h3>
            <p className="text-sm text-gray-500 mt-1">Review → Client Approval → Payroll</p>
          </div>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
            {myAssignedRequests.length} pending
          </span>
        </div>

        <div className="flex items-center justify-between mb-6" style={{display: 'none'}}>
          <h4 className="text-xl font-semibold text-gray-800">Pending My Review</h4>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
            {myAssignedRequests.length} pending
          </span>
        </div>

      {myAssignedRequests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No pending requests assigned to you</p>
          <p className="text-gray-500 text-sm mt-1">Leave requests from your team members will appear here automatically</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myAssignedRequests.map((request) => (
            <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h5 className="font-semibold text-lg text-gray-900">{request.teamMember}</h5>
                    {request.assignedTo && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Assigned to you</span>
                    )}
                    {request.submissionMethod === 'email' && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">via Email</span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-600">Type:</span>{' '}
                      <span className="font-medium text-gray-900 capitalize">{request.leaveType}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Days:</span>{' '}
                      <span className="font-medium text-gray-900">{request.days}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Dates:</span>{' '}
                      <span className="font-medium text-gray-900">{request.startDate} → {request.endDate}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Submitted by:</span>{' '}
                      <span className="font-medium text-gray-900">{request.submittedBy}</span>
                    </div>
                  </div>

                  {request.reason && (
                    <div className="mb-3 text-sm">
                      <span className="text-gray-600">Reason:</span>{' '}
                      <span className="text-gray-800">{request.reason}</span>
                    </div>
                  )}

                  {/* Sick Note Upload */}
                  {request.leaveType === 'sick' && request.sickNoteUrl && (
                    <div className="mb-3 bg-blue-50 border border-blue-200 rounded p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-blue-900 font-semibold">📄 Sick Note:</span>
                        <a 
                          href={`http://localhost:4000${request.sickNoteUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                  )}
                  {request.leaveType === 'sick' && !request.sickNoteUrl && (
                    <div className="mb-3 bg-red-50 border border-red-200 rounded p-3">
                      <div className="flex items-center gap-2 text-sm text-red-700">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-semibold">⚠️ Missing sick note - Required for sick leave</span>
                      </div>
                    </div>
                  )}

                  {/* PTO Balance */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                    <p className="text-sm font-semibold text-blue-900 mb-1">PTO Balance Check:</p>
                    <div className="flex gap-4 text-sm text-blue-800">
                      <span>Annual: <strong>{request.ptoBalance?.annualPTO || 'N/A'}</strong></span>
                      <span>Used: <strong>{request.ptoBalance?.usedPTO || 0}</strong></span>
                      <span>
                        Remaining: <strong className={request.ptoBalance?.remainingPTO < request.days ? 'text-red-600' : 'text-green-700'}>
                          {request.ptoBalance?.remainingPTO || 'N/A'}
                        </strong>
                      </span>
                    </div>
                    {request.ptoBalance?.remainingPTO < request.days && (
                      <div className="flex items-center gap-1 mt-2 text-red-700 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>⚠️ Insufficient balance for this request</span>
                      </div>
                    )}
                  </div>

                  {/* Validation Status */}
                  {request.validationPassed ? (
                    <div className="flex items-center gap-1 text-green-700 text-sm mb-3">
                      <CheckCircle className="w-4 h-4" />
                      <span>All validations passed (max days, notice period, dates)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-700 text-sm mb-3">
                      <XCircle className="w-4 h-4" />
                      <span>Validation issues detected</span>
                    </div>
                  )}

                  {/* CSP Notes */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Review Notes (required for rejection):
                    </label>
                    <textarea
                      value={reviewNotes[request.id] || ''}
                      onChange={(e) => setReviewNotes({ ...reviewNotes, [request.id]: e.target.value })}
                      placeholder="Add notes about verification, policy compliance, etc."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleApprove(request.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Verify & Forward to Client
                </button>
                <button
                  onClick={() => handleReject(request.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Client Approved - Ready for Payroll Section */}
      <div className="mt-8 pt-8 border-t-4 border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-xl font-semibold text-gray-800">Client Approved - Ready for Payroll</h4>
              <p className="text-gray-600 text-sm mt-1">Client has approved these requests. Click "Send to Payroll" to finalize and notify payroll team.</p>
            </div>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
              {myClientApprovedRequests.length} approved
            </span>
          </div>

          <div className="space-y-4">
            {myClientApprovedRequests.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <CheckSquare className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No client-approved requests ready for payroll</p>
              </div>
            ) : (
              myClientApprovedRequests.map((request) => (
              <div key={request.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h5 className="font-semibold text-lg text-gray-900">{request.teamMember}</h5>
                      <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Client Approved</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <span className="text-gray-600">Type:</span>{' '}
                        <span className="font-medium text-gray-900 capitalize">{request.leaveType}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Days:</span>{' '}
                        <span className="font-medium text-gray-900">{request.days}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Dates:</span>{' '}
                        <span className="font-medium text-gray-900">{request.startDate} → {request.endDate}</span>
                      </div>
                    </div>

                    {request.reason && (
                      <div className="mb-3 text-sm">
                        <span className="text-gray-600">Reason:</span>{' '}
                        <span className="text-gray-800">{request.reason}</span>
                      </div>
                    )}

                    {/* Sick Note */}
                    {request.leaveType === 'sick' && request.sickNoteUrl && (
                      <div className="mb-3 bg-blue-50 border border-blue-200 rounded p-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-blue-900 font-semibold">📄 Sick Note:</span>
                          <a 
                            href={`http://localhost:4000${request.sickNoteUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            View Document
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Send to Payroll Action */}
                <div className="mt-4 pt-4 border-t border-green-200">
                  <button
                    onClick={() => handleSendToPayroll(request.id)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Send to Payroll
                  </button>
                </div>
              </div>
            ))
            )}
          </div>
        </div>

      {/* Pending Client Approval Section - for marking offline approvals */}
      <div className="mt-8 pt-8 border-t-4 border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-xl font-semibold text-gray-800">Awaiting Client Approval</h4>
            <p className="text-gray-600 text-sm mt-1">Forwarded to client. If client approves via email/call/meeting (not in system), mark as approved here to continue to payroll.</p>
          </div>
          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
            {pendingClientApprovalRequests.filter(req => {
              const userEmailPrefix = user?.email ? user.email.split('@')[0].toLowerCase() : '';
              const reqEmailPrefix = req.assignedToEmail ? req.assignedToEmail.split('@')[0].toLowerCase() : '';
              return req.assignedToEmail && user?.email && (req.assignedToEmail.toLowerCase() === user.email.toLowerCase() || userEmailPrefix === reqEmailPrefix) ||
                req.assignedTo === user?.name ||
                teamMembers.some(tm => {
                  const tmCspPrefix = tm.csp ? tm.csp.split('@')[0].toLowerCase() : '';
                  return (tm.employeeId === req.teamMember || tm.teamMemberName === req.teamMember) && (tm.csp === user?.email || tmCspPrefix === userEmailPrefix);
                });
            }).length} awaiting
          </span>
        </div>

        <div className="space-y-4">
          {pendingClientApprovalRequests.filter(req => {
            const userEmailPrefix = user?.email ? user.email.split('@')[0].toLowerCase() : '';
            const reqEmailPrefix = req.assignedToEmail ? req.assignedToEmail.split('@')[0].toLowerCase() : '';
            return req.assignedToEmail && user?.email && (req.assignedToEmail.toLowerCase() === user.email.toLowerCase() || userEmailPrefix === reqEmailPrefix) ||
              req.assignedTo === user?.name ||
              teamMembers.some(tm => {
                const tmCspPrefix = tm.csp ? tm.csp.split('@')[0].toLowerCase() : '';
                return (tm.employeeId === req.teamMember || tm.teamMemberName === req.teamMember) && (tm.csp === user?.email || tmCspPrefix === userEmailPrefix);
              });
          }).length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <CheckSquare className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No requests awaiting client approval</p>
            </div>
          ) : (
            pendingClientApprovalRequests.filter(req => {
              const userEmailPrefix = user?.email ? user.email.split('@')[0].toLowerCase() : '';
              const reqEmailPrefix = req.assignedToEmail ? req.assignedToEmail.split('@')[0].toLowerCase() : '';
              return req.assignedToEmail && user?.email && (req.assignedToEmail.toLowerCase() === user.email.toLowerCase() || userEmailPrefix === reqEmailPrefix) ||
                req.assignedTo === user?.name ||
                teamMembers.some(tm => {
                  const tmCspPrefix = tm.csp ? tm.csp.split('@')[0].toLowerCase() : '';
                  return (tm.employeeId === req.teamMember || tm.teamMemberName === req.teamMember) && (tm.csp === user?.email || tmCspPrefix === userEmailPrefix);
                });
            }).map((request) => (
              <div key={request.id} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h5 className="font-semibold text-lg text-gray-900 mb-2">{request.teamMember}</h5>
                    <div className="text-sm text-gray-700">
                      <span className="capitalize">{request.leaveType}</span> • {request.days} days • {request.startDate} → {request.endDate}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name:
                    </label>
                    <input
                      type="text"
                      value={clientNames[request.id] || ''}
                      onChange={(e) => setClientNames({ ...clientNames, [request.id]: e.target.value })}
                      placeholder="Enter client name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Approval Method:
                    </label>
                    <select
                      value={clientApprovalMethod[request.id] || 'email'}
                      onChange={(e) => setClientApprovalMethod({ ...clientApprovalMethod, [request.id]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                      Client Response Notes <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={clientApprovalNotes[request.id] || ''}
                      onChange={(e) => setClientApprovalNotes({ ...clientApprovalNotes, [request.id]: e.target.value })}
                      placeholder='For approval: "Approved via email on 12/5/2025" | For rejection: "Client declined - budget constraints" or "Staffing concerns"'
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div className="border-t border-gray-300 pt-4 mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Mark client's response:</p>
                    <div className="flex gap-3">
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
                        Client Declined
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
