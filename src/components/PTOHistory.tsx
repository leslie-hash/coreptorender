import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { getApiUrl } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, Calendar, Clock, FileText, AlertCircle, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface LeaveRequest {
  id: string;
  requestId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  leaveType: string;
  reason: string;
  status: string;
  submittedDate: string;
  clientApprovalDate?: string;
  sentToPayrollDate?: string;
}

export default function PTOHistory() {
  const { user } = useAppContext();
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [ptoBalance, setPtoBalance] = useState<any>(null);

  useEffect(() => {
    fetchLeaveHistory();
    fetchPTOBalance();
  }, [user]);

  const fetchLeaveHistory = async () => {
    if (!user) return;
    
    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(getApiUrl(`/api/leave-requests?email=${user.email}&limit=100`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });
      
      if (response.ok) {
        const result = await response.json();
        // API returns paginated data with 'data' property
        const rawData = result.data || result || [];
        
        // Map to expected format
        const mapped = rawData.map((r: any) => ({
          id: r.id,
          requestId: r.id?.toString() || r.requestId || '',
          startDate: r.startDate,
          endDate: r.endDate,
          totalDays: r.days || r.totalDays || 0,
          leaveType: r.leaveType || 'Annual',
          reason: r.reason || '',
          status: r.status || 'pending',
          submittedDate: r.submittedAt || r.submittedDate || r.createdAt || new Date().toISOString(),
          clientApprovalDate: r.clientApprovalDate,
          sentToPayrollDate: r.sentToPayrollDate
        }));
        
        // Sort by submitted date, oldest first
        const sorted = mapped.sort((a: LeaveRequest, b: LeaveRequest) => 
          new Date(a.submittedDate).getTime() - new Date(b.submittedDate).getTime()
        );
        setLeaveHistory(sorted);
      }
    } catch (error) {
      console.error('Error fetching leave history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPTOBalance = async () => {
    if (!user) return;
    
    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(getApiUrl(`/api/pto-balance?email=${user.email}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPtoBalance(data);
      }
    } catch (error) {
      console.error('Error fetching PTO balance:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'client-approved':
      case 'sent-to-payroll':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
      case 'csp-review':
      case 'csp-approved':
      case 'pending-client-approval':
      case 'awaiting-client':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'rejected':
      case 'client-rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'client-approved':
        return 'Client Approved';
      case 'sent-to-payroll':
        return 'Sent to Payroll';
      case 'csp-review':
        return 'Under Review';
      case 'csp-approved':
        return 'CSP Approved';
      case 'pending-client-approval':
      case 'awaiting-client':
        return 'Awaiting Client';
      case 'client-rejected':
        return 'Client Rejected';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, ' ');
    }
  };

  const filteredHistory = leaveHistory.filter(request => {
    const matchesSearch = 
      request.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.leaveType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.reason.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || request.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-blue-900 dark:text-blue-100">PTO History</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            View your complete leave request history and PTO balance
          </p>
        </div>
      </div>

      {/* PTO Balance Summary Card */}
      {ptoBalance && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Current PTO Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Days Used</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {ptoBalance.used || 0}
                </p>
              </div>
              <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg p-4 border border-green-100 dark:border-green-900">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Days Remaining</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {ptoBalance.remaining || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by request ID, leave type, or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="client-approved">Client Approved</option>
                <option value="sent-to-payroll">Sent to Payroll</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave History List */}
      {filteredHistory.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-center">
              {searchTerm || filterStatus !== 'all' 
                ? 'No leave requests match your search criteria'
                : 'No leave requests found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Left Section */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs">
                        {request.requestId}
                      </Badge>
                      <Badge className={getStatusColor(request.status)}>
                        {getStatusLabel(request.status)}
                      </Badge>
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {request.leaveType}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {format(new Date(request.startDate), 'MMM dd, yyyy')} - {format(new Date(request.endDate), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Submitted: {format(new Date(request.submittedDate), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        {request.reason}
                      </p>
                    </div>
                  </div>

                  {/* Right Section - Days */}
                  <div className="flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 min-w-[100px]">
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {request.totalDays}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">
                      {request.totalDays === 1 ? 'Day' : 'Days'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Footer */}
      <Card className="bg-gray-50 dark:bg-gray-900/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Showing {filteredHistory.length} of {leaveHistory.length} total requests
            </span>
            {filteredHistory.length > 0 && (
              <span className="text-gray-600 dark:text-gray-400">
                Total days taken: {filteredHistory.reduce((sum, req) => sum + req.totalDays, 0)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
