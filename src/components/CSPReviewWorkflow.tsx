import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Send, CheckSquare, ChevronRight, ChevronLeft, UserCheck, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api.service';
import { useAppContext } from '@/contexts/AppContext';

// Helper function to calculate days between two dates
function calculateDays(startDate: string, endDate: string): number {
  try {
    // Parse various date formats
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
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
      return diffDays;
    }
    return 1; // Default to 1 day if parsing fails
  } catch {
    return 1;
  }
}

// Helper function to get full name from legacy data
function getFullName(request: ReviewRequest): string {
  // For legacy data where id is first name and teamMemberName is last name
  const isLegacyData = request.id && !request.id.startsWith('LR') && !request.id.includes('-');
  
  if (isLegacyData && request.teamMemberName) {
    return `${request.id} ${request.teamMemberName}`;
  }
  
  return request.teamMember || request.teamMemberName || 'Unknown';
}

// Helper function to get days from request
function getDays(request: ReviewRequest): number | string {
  if (request.days && typeof request.days === 'number') {
    return request.days;
  }
  
  // Calculate from dates
  if (request.startDate && request.endDate) {
    return calculateDays(request.startDate, request.endDate);
  }
  
  return 'N/A';
}

interface ReviewRequest {
  id: string;
  teamMember?: string;
  teamMemberName?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days?: number;
  reason?: string;
  status: string;
  submittedBy?: string;
  submittedAt?: string;
  assignedTo?: string;
  assignedToEmail?: string;
  ptoBalance?: {
    annualPTO: number;
    usedPTO: number;
    remainingPTO: number;
  };
  validationPassed?: boolean;
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
  const [activeTab, setActiveTab] = useState<'pending-review' | 'awaiting-client' | 'ready-payroll'>('pending-review');
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [currentAwaitingIndex, setCurrentAwaitingIndex] = useState(0);
  const [currentPayrollIndex, setCurrentPayrollIndex] = useState(0);
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
    
    // Listen for custom refresh events (e.g., from notification clicks)
    const handleRefreshEvent = () => {
      console.log('🔄 Manual refresh triggered');
      fetchReviewRequests();
    };
    
    window.addEventListener('refreshLeaveRequests', handleRefreshEvent);
    
    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('refreshLeaveRequests', handleRefreshEvent);
    };
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
      // Add cache-busting timestamp to force fresh data
      const timestamp = new Date().getTime();
      const res = await apiService.get(`/api/leave-requests?page=1&limit=100&_t=${timestamp}`);
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
      
      // Filter for requests in CSP review status (includes pending-csp-review which are unassigned requests)
      const reviewRequests = allRequests.filter((r: ReviewRequest) => r.status === 'csp-review' || r.status === 'pending-csp-review');
      console.log('✅ CSP Review Requests:', reviewRequests.length, reviewRequests);
      console.log('📋 CSP Review Request IDs:', reviewRequests.map(r => ({ id: r.id, teamMember: r.teamMember, assignedTo: r.assignedTo, status: r.status })));
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
    console.log('🔍 getMyAssignedRequests called');
    console.log('🔍 Total requests in state:', requests.length);
    console.log('🔍 User context:', { email: user?.email, name: user?.name, role: user?.role });
    
    // If no requests at all, return empty
    if (requests.length === 0) {
      console.log('❌ No requests in state at all');
      return [];
    }
    
    // If no user context, show ALL pending csp-review requests to be safe
    if (!user?.email && !user?.name) {
      console.log('⚠️ No user context - showing ALL csp-review requests');
      return requests;
    }
    
    console.log('📋 Filtering requests for user...');
    
    // Filter requests assigned to this CSP by email or name
    const filtered = requests.filter(req => {
      console.log(`  Checking request ${req.id} - ${req.teamMember}:`, {
        assignedTo: req.assignedTo,
        assignedToEmail: req.assignedToEmail
      });
      
      // Get username part of email (before @)
      const userEmailPrefix = user.email ? user.email.split('@')[0].toLowerCase() : '';
      const reqEmailPrefix = req.assignedToEmail ? req.assignedToEmail.split('@')[0].toLowerCase() : '';
      
      // PRIORITY 1: UNASSIGNED REQUESTS - Show to ALL CSPs
      // Check for null, undefined, empty string, or "null" string
      const isUnassigned = (!req.assignedTo || req.assignedTo === '' || req.assignedTo === 'null') && 
                          (!req.assignedToEmail || req.assignedToEmail === '' || req.assignedToEmail === 'null');
      if (isUnassigned) {
        console.log(`    ✅ UNASSIGNED - visible to all CSPs`);
        return true;
      }
      
      // PRIORITY 2: Email match (exact or prefix)
      const matchByEmail = req.assignedToEmail && user.email && 
                          (req.assignedToEmail.toLowerCase() === user.email.toLowerCase() ||
                           userEmailPrefix === reqEmailPrefix);
      if (matchByEmail) {
        console.log(`    ✅ MATCHED by email`);
        return true;
      }
      
      // PRIORITY 3: Name match (exact or partial)
      const matchByName = req.assignedTo && user.name && 
                         (req.assignedTo.toLowerCase() === user.name.toLowerCase() ||
                          user.name.toLowerCase().includes(req.assignedTo.toLowerCase()) ||
                          req.assignedTo.toLowerCase().includes(user.name.toLowerCase()));
      if (matchByName) {
        console.log(`    ✅ MATCHED by name`);
        return true;
      }
      
      // PRIORITY 4: Team member CSP assignment
      const matchByTeamMember = teamMembers.some(tm => {
        const tmCspPrefix = tm.csp ? tm.csp.split('@')[0].toLowerCase() : '';
        return (tm.employeeId === req.teamMember || tm.teamMemberName === req.teamMember) && 
               (tm.csp === user.email || tm.csp === user.name || tmCspPrefix === userEmailPrefix);
      });
      if (matchByTeamMember) {
        console.log(`    ✅ MATCHED by team member CSP`);
        return true;
      }
      
      console.log(`    ❌ No match`);
      return false;
    });
    
    console.log('✅ Filter complete:', {
      totalRequests: requests.length,
      filteredCount: filtered.length,
      unassignedCount: requests.filter(r => 
        (!r.assignedTo || r.assignedTo === '' || r.assignedTo === 'null') && 
        (!r.assignedToEmail || r.assignedToEmail === '' || r.assignedToEmail === 'null')
      ).length
    });
    
    // FALLBACK: If filtering returned nothing but there are unassigned requests, show them
    if (filtered.length === 0 && requests.length > 0) {
      const unassigned = requests.filter(r => 
        (!r.assignedTo || r.assignedTo === '' || r.assignedTo === 'null') && 
        (!r.assignedToEmail || r.assignedToEmail === '' || r.assignedToEmail === 'null')
      );
      if (unassigned.length > 0) {
        console.log('🔄 FALLBACK: Showing unassigned requests:', unassigned.length);
        return unassigned;
      }
    }
    
    return filtered;
  };

  const handleApprove = async (id: string) => {
    const notes = reviewNotes[id] || '';
    try {
      await apiService.post(`/api/leave-requests/${id}/csp-review`, {
        approved: true,
        notes,
        cspName: user?.name || 'CSP User',
        // CSP Signature information
        cspSignature: {
          signed: true,
          name: user?.name || 'CSP User',
          date: new Date().toISOString(),
          approved: true
        }
      });
      alert('✅ Request approved and signed. Forwarded to client for approval.');
      // Reset to first item if current was the last
      if (currentReviewIndex >= requests.length - 1) {
        setCurrentReviewIndex(Math.max(0, currentReviewIndex - 1));
      }
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
        cspName: user?.name || 'CSP User',
        // CSP Signature for rejection
        cspSignature: {
          signed: true,
          name: user?.name || 'CSP User',
          date: new Date().toISOString(),
          approved: false
        }
      });
      console.log('🔴 Rejection response:', response);
      alert('❌ Request rejected and signed');
      // Reset to first item if current was the last
      if (currentReviewIndex >= requests.length - 1) {
        setCurrentReviewIndex(Math.max(0, currentReviewIndex - 1));
      }
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
        cspName: user?.name || 'CSP User',
        // Client Signature information
        clientSignature: {
          signed: true,
          name: clientName,
          date: new Date().toISOString(),
          approved: true
        }
      });
      alert('✅ Client approval recorded and signed. Request ready for payroll.');
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
        cspName: user?.name || 'CSP User',
        // Client Signature for rejection
        clientSignature: {
          signed: true,
          name: clientName,
          date: new Date().toISOString(),
          approved: false
        }
      });
      alert('❌ Client rejection recorded and signed. Team member will be notified.');
      fetchReviewRequests();
    } catch (err) {
      alert('Failed to mark client rejection');
    }
  };

  const handleSendToPayroll = async (id: string) => {
    try {
      const response = await apiService.post(`/api/leave-requests/${id}/send-to-payroll`, {
        cspName: user?.name || 'CSP User',
        notes: 'Sent to payroll for processing'
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
      fetchReviewRequests();
    } catch (err) {
      alert('Failed to send to payroll');
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <p className="text-gray-600 dark:text-gray-300">Loading requests...</p>
      </div>
    );
  }

  const myAssignedRequests = getMyAssignedRequests();
  
  // Filter client-approved requests assigned to me
  const myClientApprovedRequests = clientApprovedRequests.filter(req => {
    // Show unassigned requests to all CSPs
    if (!req.assignedToEmail && !req.assignedTo) {
      return true;
    }
    
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

  // Filter pending client approval requests assigned to me
  const myPendingClientApprovalRequests = pendingClientApprovalRequests.filter(req => {
    // Show unassigned requests to all CSPs
    if (!req.assignedToEmail && !req.assignedTo) {
      return true;
    }
    
    const userEmailPrefix = user?.email ? user.email.split('@')[0].toLowerCase() : '';
    const reqEmailPrefix = req.assignedToEmail ? req.assignedToEmail.split('@')[0].toLowerCase() : '';
    return req.assignedToEmail && user?.email && (req.assignedToEmail.toLowerCase() === user.email.toLowerCase() || userEmailPrefix === reqEmailPrefix) ||
      req.assignedTo === user?.name ||
      teamMembers.some(tm => {
        const tmCspPrefix = tm.csp ? tm.csp.split('@')[0].toLowerCase() : '';
        return (tm.employeeId === req.teamMember || tm.teamMemberName === req.teamMember) && (tm.csp === user?.email || tmCspPrefix === userEmailPrefix);
      });
  });

  return (
    <div className="space-y-6">
      {/* Header with Workflow Progress */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-3xl font-bold">Leave Request Workflow</h2>
          <button
            onClick={() => fetchReviewRequests()}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh requests"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-semibold">Refresh</span>
          </button>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="font-semibold">Step 1: CSP Review</span>
          </div>
          <ChevronRight className="w-4 h-4" />
          <div className="flex items-center gap-2 px-3 py-1.5">
            <span>Step 2: Client Approval</span>
          </div>
          <ChevronRight className="w-4 h-4" />
          <div className="flex items-center gap-2 px-3 py-1.5">
            <span>Step 3: Payroll Processing</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('pending-review')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors relative ${
              activeTab === 'pending-review'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-5 h-5" />
              <span>Pending Review</span>
              {myAssignedRequests.length > 0 && (
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                  {myAssignedRequests.length}
                </span>
              )}
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('awaiting-client')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors relative ${
              activeTab === 'awaiting-client'
                ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-b-2 border-yellow-600'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <UserCheck className="w-5 h-5" />
              <span>Approval Status</span>
              {myPendingClientApprovalRequests.length > 0 && (
                <span className="bg-yellow-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                  {myPendingClientApprovalRequests.length}
                </span>
              )}
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('ready-payroll')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors relative ${
              activeTab === 'ready-payroll'
                ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-b-2 border-green-600'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Send className="w-5 h-5" />
              <span>Ready for Payroll</span>
              {myClientApprovedRequests.length > 0 && (
                <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                  {myClientApprovedRequests.length}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Pending CSP Review Tab */}
          {activeTab === 'pending-review' && (
            <div>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Requests Pending Your Review</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Review balance, validate dates, and forward to client for approval</p>
              </div>

              {myAssignedRequests.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <Clock className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-900 dark:text-white font-semibold text-lg mb-2">
                    {refreshing ? 'Checking for new requests...' : 'All Clear!'}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    {refreshing ? 'Loading...' : 'No pending requests assigned to you'}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    {refreshing ? '' : 'New leave requests will appear here automatically'}
                  </p>
                  {!refreshing && (
                    <div className="mt-4">
                      <button
                        onClick={() => fetchReviewRequests()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Check Again
                      </button>
                    </div>
                  )}
                </div>
              ) : (
        <div className="relative">
          {/* Slide Counter */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Request {Math.min(currentReviewIndex + 1, myAssignedRequests.length)} of {myAssignedRequests.length}
            </span>
            <div className="flex gap-2">
              {myAssignedRequests.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentReviewIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentReviewIndex ? 'bg-teal-600 w-6' : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'}`}
                />
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentReviewIndex(Math.max(0, currentReviewIndex - 1))}
              disabled={currentReviewIndex === 0}
              className="flex-shrink-0 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>

            {/* Current Request Card */}
            {myAssignedRequests[currentReviewIndex] && (() => {
              const request = myAssignedRequests[currentReviewIndex];
              return (
                <div className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg p-5 bg-white dark:bg-gray-700 shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h5 className="font-semibold text-lg text-gray-900 dark:text-white">{getFullName(request)}</h5>
                    {request.assignedTo && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">Assigned to you</span>
                    )}
                    {request.submissionMethod === 'email' && (
                      <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">via Email</span>
                    )}
                    {request.leaveType?.toLowerCase() === 'awol' && (
                      <span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded font-bold">🚨 AWOL</span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Type:</span>{' '}
                      <span className={`font-medium capitalize ${request.leaveType?.toLowerCase() === 'awol' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-900 dark:text-white'}`}>{request.leaveType}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Days:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">{getDays(request)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Dates:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">{request.startDate} → {request.endDate}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Submitted by:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">{request.submittedBy || getFullName(request)}</span>
                    </div>
                  </div>

                  {request.reason && (
                    <div className="mb-3 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Reason:</span>{' '}
                      <span className="text-gray-800 dark:text-gray-200">{request.reason}</span>
                    </div>
                  )}

                  {/* Sick Note Upload */}
                  {request.leaveType === 'sick' && request.sickNoteUrl && (
                    <div className="mb-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-blue-900 dark:text-blue-200 font-semibold">📄 Sick Note:</span>
                        <a 
                          href={`http://localhost:4000${request.sickNoteUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-medium"
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                  )}
                  {request.leaveType === 'sick' && !request.sickNoteUrl && (
                    <div className="mb-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded p-3">
                      <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-semibold">⚠️ Missing sick note - Required for sick leave</span>
                      </div>
                    </div>
                  )}

                  {/* PTO Balance */}
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded p-3 mb-3">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">PTO Balance Check:</p>
                    {request.ptoBalance ? (
                      <>
                        <div className="flex gap-4 text-sm text-blue-800 dark:text-blue-300">
                          <span>Used: <strong>{request.ptoBalance.usedPTO ?? 0}</strong></span>
                          <span>
                            Remaining: <strong className={(request.ptoBalance.remainingPTO ?? 0) < (typeof getDays(request) === 'number' ? getDays(request) as number : 0) ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'}>
                              {request.ptoBalance.remainingPTO ?? 'N/A'}
                            </strong>
                          </span>
                        </div>
                        {request.ptoBalance.remainingPTO !== undefined && typeof getDays(request) === 'number' && request.ptoBalance.remainingPTO < (getDays(request) as number) && (
                          <div className="flex items-center gap-1 mt-2 text-red-700 dark:text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>⚠️ Insufficient balance for this request</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        <span className="italic">PTO balance not available for legacy request</span>
                      </div>
                    )}
                  </div>

                  {/* Validation Status */}
                  {request.validationPassed === true ? (
                    <div className="flex items-center gap-1 text-green-700 dark:text-green-400 text-sm mb-3">
                      <CheckCircle className="w-4 h-4" />
                      <span>All validations passed (max days, notice period, dates)</span>
                    </div>
                  ) : request.validationPassed === false ? (
                    <div className="flex items-center gap-1 text-red-700 dark:text-red-400 text-sm mb-3">
                      <XCircle className="w-4 h-4" />
                      <span>Validation issues detected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-sm mb-3">
                      <AlertCircle className="w-4 h-4" />
                      <span>Legacy request - manual validation required</span>
                    </div>
                  )}

                  {/* CSP Notes */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Review Notes (required for rejection):
                    </label>
                    <textarea
                      value={reviewNotes[request.id] || ''}
                      onChange={(e) => setReviewNotes({ ...reviewNotes, [request.id]: e.target.value })}
                      placeholder="Add notes about verification, policy compliance, etc."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleApprove(request.id);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Ready to Submit
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleReject(request.id);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
              );
            })()}

            <button
              onClick={() => setCurrentReviewIndex(Math.min(myAssignedRequests.length - 1, currentReviewIndex + 1))}
              disabled={currentReviewIndex >= myAssignedRequests.length - 1}
              className="flex-shrink-0 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>
      )}
            </div>
          )}

          {/* Approval Status Tab */}
          {activeTab === 'awaiting-client' && (
            <div>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Approval Status</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Track requests sent for approval. Mark as approved when confirmed via email, call, or meeting.</p>
              </div>

              {pendingClientApprovalRequests.filter(req => {
                // Show unassigned requests to all CSPs
                if (!req.assignedToEmail && !req.assignedTo) {
                  return true;
                }
                
                const userEmailPrefix = user?.email ? user.email.split('@')[0].toLowerCase() : '';
                const reqEmailPrefix = req.assignedToEmail ? req.assignedToEmail.split('@')[0].toLowerCase() : '';
                return req.assignedToEmail && user?.email && (req.assignedToEmail.toLowerCase() === user.email.toLowerCase() || userEmailPrefix === reqEmailPrefix) ||
                  req.assignedTo === user?.name ||
                  teamMembers.some(tm => {
                    const tmCspPrefix = tm.csp ? tm.csp.split('@')[0].toLowerCase() : '';
                    return (tm.employeeId === req.teamMember || tm.teamMemberName === req.teamMember) && (tm.csp === user?.email || tmCspPrefix === userEmailPrefix);
                  });
              }).length === 0 ? (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <UserCheck className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-900 dark:text-white font-semibold text-lg mb-2">No Pending Approvals</p>
                  <p className="text-gray-600 dark:text-gray-300">All requests have been processed by clients</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingClientApprovalRequests.filter(req => {
                    // Show unassigned requests to all CSPs
                    if (!req.assignedToEmail && !req.assignedTo) {
                      return true;
                    }
                    
                    const userEmailPrefix = user?.email ? user.email.split('@')[0].toLowerCase() : '';
                    const reqEmailPrefix = req.assignedToEmail ? req.assignedToEmail.split('@')[0].toLowerCase() : '';
                    return req.assignedToEmail && user?.email && (req.assignedToEmail.toLowerCase() === user.email.toLowerCase() || userEmailPrefix === reqEmailPrefix) ||
                      req.assignedTo === user?.name ||
                      teamMembers.some(tm => {
                        const tmCspPrefix = tm.csp ? tm.csp.split('@')[0].toLowerCase() : '';
                        return (tm.employeeId === req.teamMember || tm.teamMemberName === req.teamMember) && (tm.csp === user?.email || tmCspPrefix === userEmailPrefix);
                      });
                  }).map((request) => (
                    <div key={request.id} className="border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-semibold text-xl text-gray-900 dark:text-white">{request.teamMember}</h5>
                            <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded font-medium">Pending Client</span>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                            <span className="capitalize font-medium">{request.leaveType}</span> • {request.days} days • {request.startDate} → {request.endDate}
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-800 rounded-md p-4 space-y-3 mb-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                            Client Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={clientNames[request.id] || ''}
                            onChange={(e) => setClientNames({ ...clientNames, [request.id]: e.target.value })}
                            placeholder="Enter client name who approved"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                            How did client approve?
                          </label>
                          <select
                            value={clientApprovalMethod[request.id] || 'email'}
                            onChange={(e) => setClientApprovalMethod({ ...clientApprovalMethod, [request.id]: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="email">📧 Email</option>
                            <option value="call">📞 Phone Call</option>
                            <option value="meeting">🤝 Meeting / Check-in</option>
                            <option value="system">💻 System (Direct Approval)</option>
                            <option value="other">📝 Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                            Approval Notes <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={clientApprovalNotes[request.id] || ''}
                            onChange={(e) => setClientApprovalNotes({ ...clientApprovalNotes, [request.id]: e.target.value })}
                            placeholder='Example: "Client John Smith approved via email on Jan 5, 2026" or "Discussed in weekly meeting - approved verbally"'
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <button
                          onClick={() => handleMarkClientApproved(request.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors font-semibold shadow-md"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Confirm Client Approved
                        </button>
                        <button
                          onClick={() => handleMarkClientRejected(request.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition-colors font-semibold shadow-md"
                        >
                          <XCircle className="w-5 h-5" />
                          Client Declined
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ready for Payroll Tab */}
          {activeTab === 'ready-payroll' && (
            <div>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Ready for Payroll</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Client-approved requests ready to send to payroll department for final processing.</p>
              </div>

              {myClientApprovedRequests.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <Send className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-900 dark:text-white font-semibold text-lg mb-2">Nothing Ready Yet</p>
                  <p className="text-gray-600 dark:text-gray-300">Client-approved requests will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myClientApprovedRequests.map((request) => (
                    <div key={request.id} className="border-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 rounded-lg p-5 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-semibold text-xl text-gray-900 dark:text-white">{request.teamMember}</h5>
                            <span className="text-xs bg-green-700 text-white px-3 py-1 rounded-full font-bold">✓ APPROVED</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm bg-white dark:bg-gray-800 rounded-md p-3 mb-3">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Leave Type:</span>{' '}
                              <span className="font-semibold text-gray-900 dark:text-white capitalize">{request.leaveType}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Duration:</span>{' '}
                              <span className="font-semibold text-gray-900 dark:text-white">{request.days} days</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-600 dark:text-gray-400">Dates:</span>{' '}
                              <span className="font-semibold text-gray-900 dark:text-white">{request.startDate} → {request.endDate}</span>
                            </div>
                          </div>

                          {request.reason && (
                            <div className="text-sm bg-white dark:bg-gray-800 rounded-md p-3 mb-3">
                              <span className="text-gray-600 dark:text-gray-400 font-medium">Reason:</span>{' '}
                              <span className="text-gray-800 dark:text-gray-200">{request.reason}</span>
                            </div>
                          )}

                          {request.leaveType === 'sick' && request.sickNoteUrl && (
                            <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-md p-3 flex items-center gap-2">
                              <span className="text-blue-900 dark:text-blue-200 font-semibold">📄 Sick Note Attached</span>
                              <a 
                                href={`http://localhost:4000${request.sickNoteUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 underline font-medium"
                              >
                                View Document
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t-2 border-green-200 dark:border-green-700">
                        <button
                          onClick={() => handleSendToPayroll(request.id)}
                          className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-4 px-6 rounded-md hover:bg-blue-700 transition-colors font-bold text-lg shadow-lg hover:shadow-xl"
                        >
                          <Send className="w-6 h-6" />
                          Send to Payroll Team
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
