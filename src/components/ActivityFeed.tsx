
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
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header with Actions */}
      <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Recent Activity
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className="p-2 hover:bg-white rounded-lg transition-colors"
              title="Toggle statistics"
            >
              <Filter className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={fetchActivities}
              disabled={loading}
              className="p-2 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Statistics Bar */}
        {showStats && activities.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-lg px-3 py-2 text-center">
              <div className="text-lg font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
              <div className="text-lg font-bold text-green-700">{stats.approved}</div>
              <div className="text-xs text-green-600">Approved</div>
            </div>
            <div className="bg-red-50 rounded-lg px-3 py-2 text-center">
              <div className="text-lg font-bold text-red-700">{stats.rejected}</div>
              <div className="text-xs text-red-600">Rejected</div>
            </div>
            <div className="bg-yellow-50 rounded-lg px-3 py-2 text-center">
              <div className="text-lg font-bold text-yellow-700">{stats.pending}</div>
              <div className="text-xs text-yellow-600">Pending</div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 font-medium">Filter:</span>
          <div className="flex gap-1">
            {['all', 'approved', 'rejected', 'pending'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <div className="text-red-500 font-semibold">{error}</div>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <div className="text-gray-500">
              {filterStatus === 'all' ? 'No recent activity.' : `No ${filterStatus} activities.`}
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {filteredActivities.map((activity) => {
              const Icon = iconMap[activity.status];
              return (
                <div 
                  key={activity.id} 
                  className="group flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white hover:bg-blue-50/30"
                >
                  {/* Avatar with Initials */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {getInitials(activity.employeeName)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 truncate" title={activity.employeeName}>
                          {activity.employeeName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColorMap[activity.status]}`}>
                            {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                          </span>
                          <span className="text-xs text-gray-600">
                            {activity.leaveType}
                          </span>
                        </div>
                      </div>
                      <div className={`flex-shrink-0 p-2 rounded-full ${colorMap[activity.status]}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Leave Details */}
                    <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{activity.startDate} - {activity.endDate}</span>
                      </div>
                      <span className="font-semibold text-gray-700">
                        {activity.days} day{activity.days !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Comment */}
                    {activity.comment && (
                      <div className="text-xs text-gray-600 italic bg-gray-50 rounded px-2 py-1 mb-2">
                        "{activity.comment}"
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{getRelativeTime(activity.timestamp)}</span>
                      <span className="text-gray-400">•</span>
                      <span>{new Date(activity.timestamp).toLocaleString()}</span>
                    </div>
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
