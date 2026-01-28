import React, { useEffect, useState } from 'react';
import { Users, Mail, Calendar, CheckCircle, Clock, XCircle, Building2, TrendingUp, AlertTriangle } from 'lucide-react';
import PTOHistoryChart from './PTOHistoryChart';
import { useAppContext } from '../contexts/AppContext';
import { getApiUrl } from '../utils/api';

interface MonthlyPTOData {
  year: number;
  month: number;
  monthName: string;
  daysAccrued: number;
  currentPTO: number;
  totalTaken: number;
  leaveBalance: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  department: string;
  client: string;
  anydesk?: string;
  workStation?: string;
  floor?: string;
  workStartTime?: string;
  timeZone?: string;
  ptoBalance: {
    accrued: number;
    used: number;
    remaining: number;
    clientPTO?: number;      // Client-specific PTO balance
    zimworxPTO?: number;     // Company PTO balance
    specialLeave: number;    // Fixed 12 days special leave
  };
  ptoMonthlyHistory?: MonthlyPTOData[];
  currentStatus: 'available' | 'on-leave' | 'pending';
  currentLeave?: {
    type: string;
    startDate: string;
    endDate: string;
    days: number;
  };
}

interface ClientGroup {
  clientName: string;
  members: TeamMember[];
  availableCount: number;
  onLeaveCount: number;
  pendingCount: number;
}

export default function TeamMembersList() {
  const { user } = useAppContext();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(50); // Show 50 initially, load more on demand
  const [awolModal, setAwolModal] = useState<{ open: boolean; member: TeamMember | null }>({ open: false, member: null });
  const [awolDate, setAwolDate] = useState('');
  const [awolReason, setAwolReason] = useState('');
  const [submittingAwol, setSubmittingAwol] = useState(false);

  const isCSP = user?.role === 'csp' || user?.role === 'admin';

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl(`/api/team-members-details?_t=${Date.now()}`), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();
      setTeamMembers(data.teamMembers || []);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      setTeamMembers([]);
    }
    setLoading(false);
  };

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || member.currentStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Group members by client
  const clientGroups: ClientGroup[] = React.useMemo(() => {
    const groupMap = new Map<string, TeamMember[]>();
    
    filteredMembers.forEach(member => {
      const client = member.client || 'Unassigned';
      if (!groupMap.has(client)) {
        groupMap.set(client, []);
      }
      groupMap.get(client)!.push(member);
    });

    const groups: ClientGroup[] = Array.from(groupMap.entries()).map(([clientName, members]) => {
      return {
        clientName,
        members: members.sort((a, b) => a.name.localeCompare(b.name)),
        availableCount: members.filter(m => m.currentStatus === 'available').length,
        onLeaveCount: members.filter(m => m.currentStatus === 'on-leave').length,
        pendingCount: members.filter(m => m.currentStatus === 'pending').length,
      };
    });

    // Sort groups by client name
    return groups.sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [filteredMembers]);



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'on-leave':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      available: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      'on-leave': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
      pending: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status as keyof typeof styles]}`}>
        {status.replace('-', ' ').toUpperCase()}
      </span>
    );
  };

  const handleMarkAwol = async () => {
    if (!awolModal.member || !awolDate) return;
    
    setSubmittingAwol(true);
    try {
      const response = await fetch(getApiUrl('/api/leave-requests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamMember: awolModal.member.name,
          teamMemberEmail: awolModal.member.email,
          client: awolModal.member.client,
          leaveType: 'AWOL',
          startDate: awolDate,
          endDate: awolDate,
          totalDays: 1,
          reason: awolReason || 'Failed to show up for work without prior notice',
          status: 'csp-approved', // AWOL is auto-approved by CSP
          submittedBy: user?.email || 'CSP',
          submittedDate: new Date().toISOString(),
          isAwol: true,
          markedAwolBy: user?.name || user?.email || 'CSP'
        })
      });

      if (response.ok) {
        alert(`${awolModal.member.name} has been marked as AWOL for ${awolDate}`);
        setAwolModal({ open: false, member: null });
        setAwolDate('');
        setAwolReason('');
        fetchTeamMembers(); // Refresh the list
      } else {
        const error = await response.json();
        alert('Failed to mark as AWOL: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to mark as AWOL:', error);
      alert('Failed to mark as AWOL. Please try again.');
    }
    setSubmittingAwol(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-h-[calc(100vh-200px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-[#14B8A6]" />
            Team Members
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and view team member PTO status</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {filteredMembers.length} of {teamMembers.length} members
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or client..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[250px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="on-leave">On Leave</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14B8A6]"></div>
        </div>
      )}

      {/* Team Members Grouped by Client - Scrollable */}
      {!loading && clientGroups.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No team members found</p>
        </div>
      )}

      {!loading && clientGroups.length > 0 && (
        <div className="overflow-y-auto flex-1 pr-2 space-y-4">
          {clientGroups.map((group) => (
            <div key={group.clientName} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
              {/* Client Header - List Style */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 px-6 py-3 border-b border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{group.clientName}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{group.members.length} team members</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs font-semibold">
                      {group.availableCount} Available
                    </span>
                    {group.onLeaveCount > 0 && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs font-semibold">
                        {group.onLeaveCount} On Leave
                      </span>
                    )}
                    {group.pendingCount > 0 && (
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-xs font-semibold">
                        {group.pendingCount} Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Client Members List - Always Visible */}
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {group.members.map((member) => (
                  <div
                    key={member.id}
                    className="px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-nowrap">
                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {getStatusIcon(member.currentStatus)}
                      </div>
                      
                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate" title={member.name}>
                            {member.name}
                          </h4>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500 truncate">{member.email}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{member.department}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {getStatusBadge(member.currentStatus)}
                      
                      {/* Leave Info (if applicable) */}
                      {(member.currentStatus === 'on-leave' || member.currentStatus === 'pending') && member.currentLeave && (
                        <span className={`text-xs whitespace-nowrap ${member.currentStatus === 'on-leave' ? 'text-red-700' : 'text-yellow-700'}`}>
                          {member.currentLeave.type} | {member.currentLeave.startDate} - {member.currentLeave.endDate} ({member.currentLeave.days}d)
                        </span>
                      )}

                      {/* PTO Balance - Inline */}
                      <div className="flex items-center gap-2 text-xs whitespace-nowrap border-l pl-4 ml-2">
                        <span className="text-gray-500">Used: <span className="font-bold text-orange-600">{member.ptoBalance.used || 0}</span></span>
                        {(member.ptoBalance.pending || 0) > 0 && (
                          <span className="text-gray-500">Pending: <span className="font-bold text-yellow-600">{member.ptoBalance.pending}</span></span>
                        )}
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded font-medium text-green-700 dark:text-green-400">
                          {member.ptoBalance.remaining || 0} days left
                        </span>
                      </div>

                      {/* Mark as AWOL Button - CSP Only */}
                      {isCSP && member.currentStatus === 'available' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAwolModal({ open: true, member });
                            setAwolDate(new Date().toISOString().split('T')[0]);
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded font-medium transition-colors"
                          title="Mark as AWOL"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          AWOL
                        </button>
                      )}
                    </div>
                    
                    {/* PTO History Chart - Expandable */}
                    {expandedMemberId === member.id && member.ptoMonthlyHistory && (
                      <div className="mt-4 border-t pt-4">
                        <PTOHistoryChart 
                          monthlyHistory={member.ptoMonthlyHistory}
                          memberName={member.name}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* AWOL Modal */}
      {awolModal.open && awolModal.member && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Mark as AWOL</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Absent Without Leave</p>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Warning:</strong> This will record {awolModal.member.name} as absent without leave. AWOL days are unpaid.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team Member</label>
                <input
                  type="text"
                  value={awolModal.member.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  value={awolDate}
                  onChange={(e) => setAwolDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (optional)</label>
                <textarea
                  value={awolReason}
                  onChange={(e) => setAwolReason(e.target.value)}
                  placeholder="Failed to show up for scheduled shift..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setAwolModal({ open: false, member: null });
                  setAwolDate('');
                  setAwolReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAwol}
                disabled={!awolDate || submittingAwol}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                {submittingAwol ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    Mark as AWOL
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}