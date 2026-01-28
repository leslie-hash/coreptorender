import { useState, useEffect } from 'react';
import { FileDown, Filter, Calendar, User, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { getApiUrl } from '@/utils/api';
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

// Helper to get team member name (handle legacy data)
function getTeamMemberName(request: LeaveRequest): string {
  const isLegacyData = request.id && !request.id.startsWith('LR') && !request.id.includes('-');
  if (isLegacyData && request.teamMemberName) {
    return `${request.id} ${request.teamMemberName}`;
  }
  return request.teamMember || request.teamMemberName || 'Unknown';
}

// Helper to get actual days
function getDays(request: LeaveRequest): number {
  if (request.days && typeof request.days === 'number') {
    return request.days;
  }
  if (request.startDate && request.endDate) {
    return calculateDays(request.startDate, request.endDate);
  }
  return 1;
}

interface LeaveRequest {
  id: string;
  teamMember: string;
  teamMemberName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  submittedDate: string;
  submittedBy: string;
  assignedTo?: string;
  cspApprovedBy?: string;
  cspApprovedAt?: string;
  clientApprovedBy?: string;
  clientApprovedAt?: string;
  sentToPayrollAt?: string;
  ptoBalance?: {
    annualPTO: number;
    usedPTO: number;
    remainingPTO: number;
  };
}

export default function AllRequestsView() {
  const { user } = useAppContext();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    teamMember: '',
    leaveType: 'all'
  });

  useEffect(() => {
    fetchAllRequests();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [requests, filters]);

  const fetchAllRequests = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(getApiUrl(`/api/leave-requests?page=1&limit=1000&_t=${Date.now()}`), {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch requests');
      
      const data = await response.json();
      const allRequests = Array.isArray(data) ? data : (data.data || []);
      
      // Sort by submission date (oldest first)
      allRequests.sort((a: LeaveRequest, b: LeaveRequest) => 
        new Date(a.submittedDate).getTime() - new Date(b.submittedDate).getTime()
      );
      
      setRequests(allRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...requests];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(req => req.status === filters.status);
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(req => new Date(req.startDate) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      filtered = filtered.filter(req => new Date(req.endDate) <= new Date(filters.dateTo));
    }

    // Team member filter
    if (filters.teamMember) {
      const searchTerm = filters.teamMember.toLowerCase();
      filtered = filtered.filter(req => 
        req.teamMember?.toLowerCase().includes(searchTerm) ||
        req.teamMemberName?.toLowerCase().includes(searchTerm)
      );
    }

    // Leave type filter
    if (filters.leaveType !== 'all') {
      filtered = filtered.filter(req => req.leaveType === filters.leaveType);
    }

    setFilteredRequests(filtered);
  };

  const exportToExcel = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch('/api/leave-requests/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests: filteredRequests })
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leave-requests-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
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
      default:
        return <Clock className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'csp-review': return 'bg-blue-100 text-blue-800';
      case 'pending-client-approval': return 'bg-yellow-100 text-yellow-800';
      case 'client-approved': return 'bg-purple-100 text-purple-800';
      case 'payroll-processing':
      case 'sent-to-payroll': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Request History</h1>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-6 py-3 bg-[#0050AA] text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            <FileDown className="w-5 h-5" />
            Export to Excel
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="font-semibold text-gray-700 dark:text-gray-200 text-lg">Filters</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0050AA] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="csp-review">CSP Review</option>
                <option value="pending-client-approval">Pending Client</option>
                <option value="client-approved">Client Approved</option>
                <option value="sent-to-payroll">Sent to Payroll</option>
                <option value="payroll-processing">Payroll Processing</option>
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
              <select
                value={filters.leaveType}
                onChange={(e) => setFilters({ ...filters, leaveType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0050AA] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="Annual Leave">Annual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Maternity Leave">Maternity Leave</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0050AA] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0050AA] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team Member</label>
              <input
                type="text"
                placeholder="Search name..."
                value={filters.teamMember}
                onChange={(e) => setFilters({ ...filters, teamMember: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0050AA] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          <div className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-md">
            Showing <span className="text-[#0050AA] font-bold">{filteredRequests.length}</span> of <span className="font-bold">{requests.length}</span> requests
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Team Member</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Leave Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Days</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No requests found matching your filters</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try adjusting your filter criteria</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-gray-400" />
                          <span className="font-semibold text-gray-900 dark:text-white">{getTeamMemberName(request)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{request.leaveType}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span className="whitespace-nowrap">{formatDate(request.startDate)} - {formatDate(request.endDate)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {getDays(request)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(request.status)}
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(request.status)}`}>
                            {request.status === 'payroll-processing' ? 'SENT TO PAYROLL' : request.status.replace(/-/g, ' ').toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(request.submittedAt)}</span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {(request.cspApprovedBy || request.clientApprovedBy) ? (
                          <div className="flex items-center gap-3 flex-wrap">
                            {request.cspApprovedBy && (
                              <span className="inline-flex items-center gap-1">
                                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">CSP</span>
                                <span className="text-gray-700 dark:text-gray-300">{request.cspApprovedBy}</span>
                              </span>
                            )}
                            {request.cspApprovedBy && request.clientApprovedBy && (
                              <span className="text-gray-400">|</span>
                            )}
                            {request.clientApprovedBy && (
                              <span className="inline-flex items-center gap-1">
                                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">Client</span>
                                <span className="text-gray-700 dark:text-gray-300">{request.clientApprovedBy}</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 italic">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
