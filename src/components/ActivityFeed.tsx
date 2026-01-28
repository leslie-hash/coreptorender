
import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, AlertCircle, XCircle, Calendar, RefreshCw, Filter, TrendingUp, User } from 'lucide-react';

interface Activity {
  id?: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'approved' | 'rejected' | 'pending';
  approvalDate?: string;
  comment?: string;
  timestamp: string;
}

const iconMap = {
  approved: CheckCircle,
  rejected: XCircle,
  pending: Clock,
  info: AlertCircle
};

const colorMap = {
  approved: 'text-green-600 bg-green-50',
  rejected: 'text-red-600 bg-red-50',
  pending: 'text-yellow-600 bg-yellow-50',
  info: 'text-blue-600 bg-blue-50'
};

const badgeColorMap = {
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800'
};

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
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showStats, setShowStats] = useState(true);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/approval-history');
      const data = await res.json();
      if (data.history && Array.isArray(data.history)) {
        // Take last 20 activities and reverse for newest first
        const mapped = data.history.slice(-20).reverse() as Activity[];
        setActivities(mapped);
      } else {
        setActivities([]);
      }
    } catch (err) {
      setError('Failed to load activity feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const filteredActivities = filterStatus === 'all' 
    ? activities 
    : activities.filter(a => a.status === filterStatus);

  const stats = {
    total: activities.length,
    approved: activities.filter(a => a.status === 'approved').length,
    rejected: activities.filter(a => a.status === 'rejected').length,
    pending: activities.filter(a => a.status === 'pending').length,
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header with Actions */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Recent Activity
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowStats(!showStats)}
              className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors"
              title="Toggle statistics"
            >
              <Filter className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={fetchActivities}
              disabled={loading}
              className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Statistics Bar - 2x2 grid for sidebar */}
        {showStats && activities.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white dark:bg-gray-600 rounded-lg px-2 py-1.5 text-center">
              <div className="text-sm font-bold text-gray-900 dark:text-white">{stats.total}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Total</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg px-2 py-1.5 text-center">
              <div className="text-sm font-bold text-green-700 dark:text-green-400">{stats.approved}</div>
              <div className="text-xs text-green-600 dark:text-green-400">Approved</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/30 rounded-lg px-2 py-1.5 text-center">
              <div className="text-sm font-bold text-red-700 dark:text-red-400">{stats.rejected}</div>
              <div className="text-xs text-red-600 dark:text-red-400">Rejected</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg px-2 py-1.5 text-center">
              <div className="text-sm font-bold text-yellow-700 dark:text-yellow-400">{stats.pending}</div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400">Pending</div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-gray-600 dark:text-gray-300 font-medium mr-1">Filter:</span>
          <div className="flex flex-wrap gap-1">
            {['all', 'approved', 'rejected', 'pending'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-2 py-0.5 text-xs font-semibold rounded-full transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500 border border-gray-300 dark:border-gray-500'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="p-3 dark:bg-gray-800">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <XCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <div className="text-red-500 text-sm font-semibold">{error}</div>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-6">
            <Clock className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <div className="text-gray-500 dark:text-gray-400 text-sm">
              {filterStatus === 'all' ? 'No recent activity.' : `No ${filterStatus} activities.`}
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredActivities.map((activity) => {
              const Icon = iconMap[activity.status];
              return (
                <div 
                  key={activity.id} 
                  className="group p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer bg-white dark:bg-gray-700 hover:bg-blue-50/30 dark:hover:bg-gray-600"
                >
                  {/* Top row: Avatar, Name, Status Icon */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                        {getInitials(activity.employeeName)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate" title={activity.employeeName}>
                        {activity.employeeName}
                      </h4>
                    </div>
                    <div className={`flex-shrink-0 p-1.5 rounded-full ${colorMap[activity.status]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Status and Leave Type */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColorMap[activity.status]}`}>
                      {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                      {activity.leaveType}
                    </span>
                  </div>

                  {/* Leave Details */}
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 mb-1">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{activity.startDate} - {activity.endDate}</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-200 flex-shrink-0">
                      ({activity.days}d)
                    </span>
                  </div>

                  {/* Comment */}
                  {activity.comment && (
                    <div className="text-xs text-gray-600 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-600 rounded px-2 py-1 mb-1 truncate" title={activity.comment}>
                      "{activity.comment}"
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span>{getRelativeTime(activity.timestamp)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
