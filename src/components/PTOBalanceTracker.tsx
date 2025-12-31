import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar, Users, Download, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';

interface TeamMemberBalance {
  id: string;
  name: string;
  email: string;
  department: string;
  ptoBalance: {
    accrued: number;
    used: number;
    remaining: number;
    scheduled: number; // Approved future leaves
    projected: number; // Remaining after scheduled leaves
  };
  yearToDate: {
    totalDays: number;
    vacationDays: number;
    sickDays: number;
    personalDays: number;
  };
  trends: {
    lastQuarter: number;
    comparedToTeam: 'above' | 'average' | 'below';
  };
}

const PTOBalanceTracker: React.FC = () => {
  const [balances, setBalances] = useState<TeamMemberBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'remaining' | 'used'>('name');

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      const [teamResponse, leaveResponse] = await Promise.all([
        fetch('/api/team-members', { credentials: 'include' }),
        fetch('/api/leave-requests?limit=1000', { credentials: 'include' })
      ]);

      if (teamResponse.ok && leaveResponse.ok) {
        const teamMembers = await teamResponse.json();
        const leaveData = await leaveResponse.json();
        const leaveRequests = leaveData.requests || [];

        const today = new Date();
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);

        interface Member { name: string; id: string; [key: string]: unknown }
        interface LeaveRequest { teamMember: string; status: string; endDate: string; startDate: string; days: number; leaveType: string }
        const calculatedBalances: TeamMemberBalance[] = teamMembers.map((member: Member) => {
          const memberLeaves = leaveRequests.filter((req: LeaveRequest) => req.teamMember === member.name);
          
          // Calculate used days (approved leaves that have already occurred)
          const usedDays = memberLeaves
            .filter((req) => req.status === 'approved' && new Date(req.endDate) <= today)
            .reduce((sum: number, req) => sum + (req.days || 0), 0);

          // Calculate scheduled days (approved future leaves)
          const scheduledDays = memberLeaves
            .filter((req) => req.status === 'approved' && new Date(req.startDate) > today)
            .reduce((sum: number, req) => sum + (req.days || 0), 0);

          // Year to date breakdown
          const ytdLeaves = memberLeaves.filter(
            (req) => req.status === 'approved' && new Date(req.startDate) >= yearStart
          );
          
          const vacationDays = ytdLeaves
            .filter((req) => req.leaveType === 'vacation')
            .reduce((sum: number, req) => sum + (req.days || 0), 0);
          
          const sickDays = ytdLeaves
            .filter((req) => req.leaveType === 'sick')
            .reduce((sum: number, req) => sum + (req.days || 0), 0);
          
          const personalDays = ytdLeaves
            .filter((req) => req.leaveType === 'personal')
            .reduce((sum: number, req) => sum + (req.days || 0), 0);

          // Last quarter usage
          const lastQuarterDays = memberLeaves
            .filter((req) => 
              req.status === 'approved' && 
              new Date(req.startDate) >= quarterStart
            )
            .reduce((sum: number, req) => sum + (req.days || 0), 0);

          const accruedDays = 20; // Standard annual PTO
          const remainingDays = accruedDays - usedDays;
          const projectedDays = remainingDays - scheduledDays;

          return {
            id: member.id,
            name: member.name,
            email: member.email,
            department: member.department || 'N/A',
            ptoBalance: {
              accrued: accruedDays,
              used: usedDays,
              remaining: remainingDays,
              scheduled: scheduledDays,
              projected: Math.max(0, projectedDays)
            },
            yearToDate: {
              totalDays: usedDays,
              vacationDays,
              sickDays,
              personalDays
            },
            trends: {
              lastQuarter: lastQuarterDays,
              comparedToTeam: usedDays < 5 ? 'below' : usedDays > 12 ? 'above' : 'average'
            }
          };
        });

        setBalances(calculatedBalances);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Department', 'Accrued', 'Used', 'Remaining', 'Scheduled', 'Projected'];
    const rows = filteredBalances.map(b => [
      b.name,
      b.email,
      b.department,
      b.ptoBalance.accrued,
      b.ptoBalance.used,
      b.ptoBalance.remaining,
      b.ptoBalance.scheduled,
      b.ptoBalance.projected
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pto-balances-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const departments = Array.from(new Set(balances.map(b => b.department)));

  const filteredBalances = balances
    .filter(balance => {
      const matchesSearch = 
        balance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        balance.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = departmentFilter === 'all' || balance.department === departmentFilter;
      return matchesSearch && matchesDepartment;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'remaining') return b.ptoBalance.remaining - a.ptoBalance.remaining;
      if (sortBy === 'used') return b.ptoBalance.used - a.ptoBalance.used;
      return 0;
    });

  const teamStats = {
    totalMembers: balances.length,
    avgUsed: balances.length > 0 
      ? (balances.reduce((sum, b) => sum + b.ptoBalance.used, 0) / balances.length).toFixed(1)
      : 0,
    avgRemaining: balances.length > 0
      ? (balances.reduce((sum, b) => sum + b.ptoBalance.remaining, 0) / balances.length).toFixed(1)
      : 0,
    totalScheduled: balances.reduce((sum, b) => sum + b.ptoBalance.scheduled, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">PTO Balance Tracker</h2>
          <p className="text-muted-foreground">
            Track accrued, used, and remaining PTO for all team members
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Team Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Days Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.avgUsed}</div>
            <p className="text-xs text-muted-foreground">Per team member</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Remaining</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.avgRemaining}</div>
            <p className="text-xs text-muted-foreground">Days available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Leave</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.totalScheduled}</div>
            <p className="text-xs text-muted-foreground">Future approved days</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="remaining">Remaining Days</SelectItem>
            <SelectItem value="used">Used Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Balance Cards */}
      <ScrollArea className="h-[600px]">
        <div className="grid gap-4 md:grid-cols-2">
          {filteredBalances.map((balance) => (
            <Card key={balance.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{balance.name}</CardTitle>
                    <CardDescription>{balance.email}</CardDescription>
                  </div>
                  <Badge variant="outline">{balance.department}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Main Balance */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">PTO Balance</span>
                    <span className="text-muted-foreground">
                      {balance.ptoBalance.remaining} / {balance.ptoBalance.accrued} days
                    </span>
                  </div>
                  <Progress 
                    value={(balance.ptoBalance.remaining / balance.ptoBalance.accrued) * 100} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Used: {balance.ptoBalance.used} days</span>
                    <span>{((balance.ptoBalance.remaining / balance.ptoBalance.accrued) * 100).toFixed(0)}% remaining</span>
                  </div>
                </div>

                {/* Scheduled & Projected */}
                {balance.ptoBalance.scheduled > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-blue-900">Scheduled Leave</span>
                      <span className="text-blue-700">{balance.ptoBalance.scheduled} days</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-800">Projected Balance</span>
                      <span className="font-semibold text-blue-900">{balance.ptoBalance.projected} days</span>
                    </div>
                  </div>
                )}

                {/* Year to Date Breakdown */}
                <div className="space-y-2 pt-2 border-t">
                  <h4 className="text-sm font-medium">Year to Date Usage</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-green-50 p-2 rounded">
                      <div className="text-xs text-green-600">Vacation</div>
                      <div className="text-lg font-bold text-green-900">{balance.yearToDate.vacationDays}</div>
                    </div>
                    <div className="bg-orange-50 p-2 rounded">
                      <div className="text-xs text-orange-600">Sick</div>
                      <div className="text-lg font-bold text-orange-900">{balance.yearToDate.sickDays}</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded">
                      <div className="text-xs text-purple-600">Personal</div>
                      <div className="text-lg font-bold text-purple-900">{balance.yearToDate.personalDays}</div>
                    </div>
                  </div>
                </div>

                {/* Trends */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Last Quarter: {balance.trends.lastQuarter} days
                  </span>
                  <Badge 
                    variant={balance.trends.comparedToTeam === 'above' ? 'default' : 
                            balance.trends.comparedToTeam === 'below' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {balance.trends.comparedToTeam === 'above' && <TrendingUp className="h-3 w-3 mr-1" />}
                    {balance.trends.comparedToTeam === 'below' && <TrendingDown className="h-3 w-3 mr-1" />}
                    {balance.trends.comparedToTeam.charAt(0).toUpperCase() + balance.trends.comparedToTeam.slice(1)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PTOBalanceTracker;
