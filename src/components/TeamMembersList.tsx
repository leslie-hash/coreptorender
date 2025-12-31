import React, { useEffect, useState } from 'react';
import { Users, Mail, Calendar, CheckCircle, Clock, XCircle, Building2 } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  department: string;
  client: string;
  ptoBalance: {
    accrued: number;
    used: number;
    remaining: number;
  };
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
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/team-members-details');
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
      available: 'bg-green-100 text-green-800',
      'on-leave': 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status as keyof typeof styles]}`}>
        {status.replace('-', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-h-[calc(100vh-200px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-[#14B8A6]" />
            Team Members
          </h2>
          <p className="text-gray-600 mt-1">Manage and view team member PTO status</p>
        </div>
        <div className="text-sm text-gray-500">
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
          className="flex-1 min-w-[250px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
        <div className="text-center py-12 text-gray-500">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No team members found</p>
        </div>
      )}

      {!loading && clientGroups.length > 0 && (
        <div className="overflow-y-auto flex-1 pr-2 space-y-4">
          {clientGroups.map((group) => (
            <div key={group.clientName} className="bg-white border border-gray-200 rounded-lg shadow-sm">
              {/* Client Header - List Style */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-3 border-b border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{group.clientName}</h3>
                      <p className="text-xs text-gray-600">{group.members.length} team members</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                      {group.availableCount} Available
                    </span>
                    {group.onLeaveCount > 0 && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                        {group.onLeaveCount} On Leave
                      </span>
                    )}
                    {group.pendingCount > 0 && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                        {group.pendingCount} Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Client Members List - Always Visible */}
              <div className="divide-y divide-gray-100">
                {group.members.map((member) => (
                  <div
                    key={member.id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Member Info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {getStatusIcon(member.currentStatus)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-bold text-gray-900 truncate" title={member.name}>
                            {member.name}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-0.5">
                            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate" title={member.email}>{member.email}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{member.department}</div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex-shrink-0">
                        {getStatusBadge(member.currentStatus)}
                      </div>

                      {/* Leave Info (if applicable) */}
                      {member.currentStatus === 'on-leave' && member.currentLeave && (
                        <div className="flex-shrink-0 text-right">
                          <div className="text-xs font-semibold text-red-800">
                            {member.currentLeave.type}
                          </div>
                          <div className="text-xs text-red-700 mt-0.5">
                            {member.currentLeave.startDate} - {member.currentLeave.endDate}
                          </div>
                          <div className="text-xs text-red-600 mt-0.5">
                            {member.currentLeave.days} days
                          </div>
                        </div>
                      )}

                      {member.currentStatus === 'pending' && member.currentLeave && (
                        <div className="flex-shrink-0 text-right">
                          <div className="text-xs font-semibold text-yellow-800">
                            {member.currentLeave.type}
                          </div>
                          <div className="text-xs text-yellow-700 mt-0.5">
                            {member.currentLeave.startDate} - {member.currentLeave.endDate}
                          </div>
                          <div className="text-xs text-yellow-600 mt-0.5">
                            {member.currentLeave.days} days
                          </div>
                        </div>
                      )}

                      {/* PTO Balance */}
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xs text-gray-600">PTO Balance</div>
                        <div className="text-sm font-bold text-green-600 mt-0.5">
                          {member.ptoBalance.remaining} / {member.ptoBalance.accrued} days
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {member.ptoBalance.used} used
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}