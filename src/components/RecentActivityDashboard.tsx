import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, TrendingUp, Calendar, Users, FileText, Activity, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getApiUrl } from '../utils/api';

interface LeaveRequest {
  id: string;
  teamMemberName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
  submittedDate?: string;
  cspApprovedAt?: string;
  cspRejectedAt?: string;
  clientApprovedAt?: string;
  history?: Array<{
    action: string;
    actor: string;
    timestamp: string;
    note?: string;
  }>;
}

interface ActivityItem {
  id: string;
  type: 'approved' | 'rejected' | 'pending' | 'submitted';
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  timestamp: string;
  actor?: string;
}

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return then.toLocaleDateString();
}

function getInitials(name: string): string {
  if (!name || typeof name !== 'string') return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function RecentActivityDashboard() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    thisWeek: 0
  });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [leaveTypeData, setLeaveTypeData] = useState<any[]>([]);
  const [statusBarData, setStatusBarData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication required. Please log in.');
        setLoading(false);
        return;
      }
      
      const res = await fetch(getApiUrl('/api/leave-requests?page=1&limit=1000'), {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      
      // Handle both response formats: { data: [...] } or { requests: [...] }
      const requests = (data.data || data.requests || []) as LeaveRequest[];
      
      // Calculate stats (even if empty)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const weekRequests = requests.filter(r => {
        const submittedDate = r.submittedDate ? new Date(r.submittedDate) : new Date();
        return submittedDate >= oneWeekAgo;
      });

      // Count pending statuses (various naming conventions in use)
      const pendingStatuses = ['pending-csp-review', 'pending', 'csp-review', 'pending-client-approval'];
      const approvedStatuses = ['csp-approved', 'client-approved', 'payroll-processing', 'sent-to-payroll', 'approved'];
      const rejectedStatuses = ['csp-rejected', 'client-rejected', 'rejected'];

      setStats({
        totalRequests: requests.length,
        pending: requests.filter(r => pendingStatuses.includes(r.status)).length,
        approved: requests.filter(r => approvedStatuses.includes(r.status)).length,
        rejected: requests.filter(r => rejectedStatuses.includes(r.status)).length,
        thisWeek: weekRequests.length
      });

      // Prepare Trend Data (Last 7 days)
      const last7Days: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const dayRequests = requests.filter(r => {
          const reqDate = r.submittedDate ? new Date(r.submittedDate) : new Date();
          return reqDate.toDateString() === date.toDateString();
        });

        last7Days.push({
          date: dateStr,
          requests: dayRequests.length,
          approved: dayRequests.filter(r => approvedStatuses.some(s => r.status.includes(s) || r.status === s)).length,
          pending: dayRequests.filter(r => pendingStatuses.some(s => r.status.includes(s) || r.status === s)).length,
          rejected: dayRequests.filter(r => rejectedStatuses.some(s => r.status.includes(s) || r.status === s)).length
        });
      }
      setTrendData(last7Days);

      // Prepare Leave Type Distribution (Pie Chart)
      const leaveTypeCounts: Record<string, number> = {};
      requests.forEach(r => {
        const type = r.leaveType || 'Unknown';
        leaveTypeCounts[type] = (leaveTypeCounts[type] || 0) + 1;
      });
      const pieData = Object.entries(leaveTypeCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6); // Top 6 leave types
      setLeaveTypeData(pieData);

      // Prepare Status Bar Chart
      const statusCounts = [
        { status: 'Pending', count: requests.filter(r => pendingStatuses.some(s => r.status.includes(s) || r.status === s)).length },
        { status: 'Approved', count: requests.filter(r => approvedStatuses.some(s => r.status.includes(s) || r.status === s)).length },
        { status: 'Rejected', count: requests.filter(r => rejectedStatuses.some(s => r.status.includes(s) || r.status === s)).length },
        { status: 'Processing', count: requests.filter(r => r.status === 'payroll-processing' || r.status === 'sent-to-payroll').length }
      ];
      setStatusBarData(statusCounts);

      // Build activity list from recent requests
      const activityItems: ActivityItem[] = [];
      
      // Take all requests and sort by most recent activity
      const recentRequests = [...requests].reverse();
      
      for (const req of recentRequests) {
        let type: 'approved' | 'rejected' | 'pending' | 'submitted' = 'submitted';
        let timestamp = req.submittedDate || new Date().toISOString();
        let actor = req.teamMemberName;

        if (req.cspApprovedAt) {
          type = 'approved';
          timestamp = req.cspApprovedAt;
          actor = 'CSP';
        } else if (req.cspRejectedAt) {
          type = 'rejected';
          timestamp = req.cspRejectedAt;
          actor = 'CSP';
        } else if (req.clientApprovedAt) {
          type = 'approved';
          timestamp = req.clientApprovedAt;
          actor = 'Client';
        } else if (req.status.includes('pending')) {
          type = 'pending';
        }

        activityItems.push({
          id: req.id,
          type,
          employeeName: req.teamMemberName,
          leaveType: req.leaveType,
          startDate: req.startDate,
          endDate: req.endDate,
          timestamp,
          actor
        });
      }

      setActivities(activityItems);
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
      setError('Failed to load activity feed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color, bgColor }: any) => (
    <div className={`${bgColor} rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
          <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
        </div>
        <div className={`${color} bg-opacity-10 p-3 rounded-full`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'approved': return CheckCircle;
      case 'rejected': return XCircle;
      case 'pending': return Clock;
      default: return FileText;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'approved': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'rejected': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'pending': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getStatusBadge = (type: string) => {
    switch (type) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-500 text-lg">{error}</div>
        <button
          onClick={fetchRecentActivity}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Activity className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Overview of recent leave activity</p>
        </div>
        <Activity className="w-8 h-8 text-blue-600" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={FileText}
          label="Total Requests"
          value={stats.totalRequests}
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-white dark:bg-gray-800"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.pending}
          color="text-yellow-600 dark:text-yellow-400"
          bgColor="bg-white dark:bg-gray-800"
        />
        <StatCard
          icon={CheckCircle}
          label="Approved"
          value={stats.approved}
          color="text-green-600 dark:text-green-400"
          bgColor="bg-white dark:bg-gray-800"
        />
        <StatCard
          icon={XCircle}
          label="Rejected"
          value={stats.rejected}
          color="text-red-600 dark:text-red-400"
          bgColor="bg-white dark:bg-gray-800"
        />
        <StatCard
          icon={TrendingUp}
          label="This Week"
          value={stats.thisWeek}
          color="text-purple-600 dark:text-purple-400"
          bgColor="bg-white dark:bg-gray-800"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Graph - Line Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <LineChartIcon className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">7-Day Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                stroke="#9ca3af"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="requests" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Total Requests"
                dot={{ fill: '#3b82f6', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="approved" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Approved"
                dot={{ fill: '#10b981', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="pending" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Pending"
                dot={{ fill: '#f59e0b', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Leave Type Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Leave Types</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={leaveTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {leaveTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - Status Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Status Overview</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="status" 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                stroke="#9ca3af"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                {statusBarData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={
                      entry.status === 'Approved' ? '#10b981' :
                      entry.status === 'Rejected' ? '#ef4444' :
                      entry.status === 'Pending' ? '#f59e0b' :
                      '#3b82f6'
                    } 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
            <button
              onClick={fetchRecentActivity}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
            >
              <Activity className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
          {activities.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              No recent activity to display
            </div>
          ) : (
            activities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div
                  key={activity.id}
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                            {getInitials(activity.employeeName)}
                          </div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {activity.employeeName}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(activity.type)}`}>
                          {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{activity.leaveType}</span>
                        {' • '}
                        {activity.startDate} → {activity.endDate}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getRelativeTime(activity.timestamp)}
                        </span>
                        {activity.actor && activity.type !== 'submitted' && (
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            by {activity.actor}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
