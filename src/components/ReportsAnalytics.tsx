import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Download, Calendar, FileSpreadsheet, FileText, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import BarChartWidget from './charts/BarChartWidget';
import PieChartWidget from './charts/PieChartWidget';
import LineChartWidget from './charts/LineChartWidget';

interface AnalyticsData {
  usageTrends: {
    monthly: Array<{ month: string; days: number; requests: number }>;
    quarterly: Array<{ quarter: string; days: number; requests: number }>;
  };
  leaveTypes: Array<{ type: string; count: number; days: number; percentage: number }>;
  departmentBreakdown: Array<{ department: string; days: number; members: number }>;
  peakPeriods: Array<{ date: string; count: number; members: string[] }>;
  topUsers: Array<{ name: string; days: number; requests: number }>;
  approvalMetrics: {
    approved: number;
    rejected: number;
    pending: number;
    avgApprovalTime: number; // in hours
  };
}

const ReportsAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('year');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, departmentFilter]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(
        `/api/analytics?timeRange=${timeRange}&department=${departmentFilter}`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const response = await fetch(
        `/api/analytics/export?format=excel&timeRange=${timeRange}&department=${departmentFilter}`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pto-analytics-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  const exportToPDF = async () => {
    try {
      const response = await fetch(
        `/api/analytics/export?format=pdf&timeRange=${timeRange}&department=${departmentFilter}`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pto-report-${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p className="text-lg font-medium">No analytics data available</p>
        <p className="text-sm">Submit some leave requests to see analytics</p>
      </div>
    );
  }

  const trendData = timeRange === 'month' 
    ? analytics.usageTrends.monthly 
    : analytics.usageTrends.quarterly;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground">
            PTO usage trends, leave type analysis, and team insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={exportToPDF} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value)}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Last 12 Months</SelectItem>
            <SelectItem value="quarter">Last 4 Quarters</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>

        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {analytics.departmentBreakdown.map(dept => (
              <SelectItem key={dept.department} value={dept.department}>
                {dept.department}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.approvalMetrics.approved + analytics.approvalMetrics.rejected + analytics.approvalMetrics.pending}
            </div>
            <p className="text-xs text-muted-foreground">
              {timeRange === 'year' ? 'This year' : `Last ${timeRange === 'month' ? '12 months' : '4 quarters'}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {((analytics.approvalMetrics.approved / 
                (analytics.approvalMetrics.approved + analytics.approvalMetrics.rejected)) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.approvalMetrics.approved} approved, {analytics.approvalMetrics.rejected} rejected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {analytics.approvalMetrics.pending}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Approval Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.approvalMetrics.avgApprovalTime < 24 
                ? `${analytics.approvalMetrics.avgApprovalTime.toFixed(0)}h`
                : `${(analytics.approvalMetrics.avgApprovalTime / 24).toFixed(1)}d`}
            </div>
            <p className="text-xs text-muted-foreground">Response time</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>PTO Usage Trends</CardTitle>
            <CardDescription>
              Days requested over {timeRange === 'month' ? 'months' : 'quarters'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LineChartWidget 
              data={trendData.map(d => ({
                period: d.month || d.quarter,
                days: d.days
              }))}
              xKey="period"
              yKey="days"
              title="PTO Days"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Type Distribution</CardTitle>
            <CardDescription>Breakdown by leave category</CardDescription>
          </CardHeader>
          <CardContent>
            <PieChartWidget 
              data={analytics.leaveTypes.map(lt => ({
                type: lt.type,
                count: lt.count
              }))}
              dataKey="count"
              nameKey="type"
              title="Leave Types"
            />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Department Usage</CardTitle>
            <CardDescription>Total PTO days by department</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartWidget 
              data={analytics.departmentBreakdown.map(d => ({
                department: d.department,
                days: d.days
              }))}
              xKey="department"
              yKey="days"
              title="Days per Department"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peak Leave Periods</CardTitle>
            <CardDescription>Days with most team members out</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {analytics.peakPeriods.slice(0, 10).map((period, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{new Date(period.date).toLocaleDateString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {period.members.slice(0, 3).join(', ')}
                      {period.members.length > 3 && ` +${period.members.length - 3} more`}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-red-600">{period.count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Type Details */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Type Analysis</CardTitle>
          <CardDescription>Detailed breakdown of all leave types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.leaveTypes.map((type, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {type.type}
                    </Badge>
                    <span className="text-sm font-medium">{type.count} requests</span>
                    <span className="text-sm text-muted-foreground">({type.days} days)</span>
                  </div>
                  <span className="text-sm font-semibold">{type.percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${type.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Users */}
      <Card>
        <CardHeader>
          <CardTitle>Top PTO Users</CardTitle>
          <CardDescription>Team members with most PTO days used</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topUsers.slice(0, 10).map((user, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.requests} request{user.requests !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{user.days}</div>
                  <div className="text-xs text-muted-foreground">days</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Department Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Department Comparison</CardTitle>
          <CardDescription>Average PTO usage per team member by department</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.departmentBreakdown.map((dept, index) => {
              const avgPerMember = dept.members > 0 ? (dept.days / dept.members).toFixed(1) : 0;
              return (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{dept.department}</div>
                    <div className="text-sm text-muted-foreground">
                      {dept.members} member{dept.members !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{avgPerMember} days</div>
                    <div className="text-sm text-muted-foreground">per member</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsAnalytics;
