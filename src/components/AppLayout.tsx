import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { getApiUrl } from '@/utils/api';
import { Calendar, Users, Database, FileText, BarChart3, Bell, Plus, UsersRound, CalendarDays, TrendingUp, Mail, Search, Zap, ChevronDown, ChevronRight, Home, User, LogOut, Menu, X, ClipboardCheck, FileDown, RefreshCw, HelpCircle, Link2, Settings, CheckSquare, Send, ClipboardList } from 'lucide-react';
import StatusCard from './StatusCard';
import ApprovalHistory from './ApprovalHistory';
import ActivityFeed from './ActivityFeed';
import LeaveRequestForm from './LeaveRequestForm';
import ApprovalWorkflow from './ApprovalWorkflow';
import CSPReviewWorkflow from './CSPReviewWorkflow';
import OfficialLeaveForm from './OfficialLeaveForm';
import MyLeaveRequests from './MyLeaveRequests';
import AttendanceTracker from './AttendanceTracker';
import SyncMonitor from './SyncMonitor';
import MeetingNotes from './MeetingNotes';
import ReportGenerator from './ReportGenerator';
import RemindersDashboard from './RemindersDashboard';
import TeamMembersList from './TeamMembersList';
import CalendarView from './CalendarView';
import NotificationsCenter from './NotificationsCenter';
import PTOBalanceTracker from './PTOBalanceTracker';
import ReportsAnalytics from './ReportsAnalytics';
import EmailSettings from './EmailSettings';
import GlobalSearch from './GlobalSearch';
import IntegrationsHub from './IntegrationsHub';
import GoogleSheetsSyncManager from './GoogleSheetsSyncManager';
import CSPAbsenteeismReport from './CSPAbsenteeismReport';
import GoogleSheetsAbsenteeismSync from './GoogleSheetsAbsenteeismSync';
import SystemSettings from './SystemSettings';
import ClientApprovalDashboard from './ClientApprovalDashboard';
import AdminPanel from './AdminPanel';
import AllRequestsView from './AllRequestsView';
import ClientApprovalMarking from './ClientApprovalMarking';
import SendToPayrollView from './SendToPayrollView';
import HelpDocumentation from './HelpDocumentation';
import { Badge } from './ui/badge';

interface Notification {
  id: string;
  read: boolean;
  message: string;
  timestamp: string;
}

interface LeaveRequestData {
  teamMemberName: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
  [key: string]: string | number | boolean | undefined;
}

export default function AppLayout() {
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [totalLeaveRequests, setTotalLeaveRequests] = useState(0);
  const [reviewQueueKey, setReviewQueueKey] = useState(0);

  // Debug logging for activeModule changes
  useEffect(() => {
    console.log('AppLayout - activeModule changed to:', activeModule);
    // Force refresh Review Queue when navigating to it
    if (activeModule === 'csp-review' || activeModule === null) {
      console.log('Forcing Review Queue refresh...');
      setReviewQueueKey(prev => prev + 1);
    }
  }, [activeModule]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    main: true,
    leaveManagement: true,
    toolsInsights: true,
    administration: true
  });
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const { userRole, setUserRole, user, setUser, setToken } = useAppContext();

  // Check if user is a team member (non-CSP)
  const isTeamMember = userRole === 'team-member' || (!userRole && user && !user.role);
  
  // Check if user is admin, director, or CSP (CSPs need admin access for Google Sheets sync)
  const isAdmin = userRole === 'admin' || userRole === 'director' || userRole === 'csp' || user?.role === 'admin' || user?.role === 'director' || user?.role === 'csp';

  // Update refresh time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefreshTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Format last refresh time with US timezone
  const formatRefreshTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications', {
          credentials: 'include',
        });
        if (response.ok) {
          const data: Notification[] = await response.json();
          const unread = data.filter((n) => !n.read).length;
          setUnreadNotifications(unread);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchUnreadCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refresh notification count when notifications module is closed
  useEffect(() => {
    if (activeModule !== 'notifications') {
      const fetchUnreadCount = async () => {
        try {
          const response = await fetch(getApiUrl('/api/notifications'), {
            credentials: 'include',
          });
          if (response.ok) {
            const data: Notification[] = await response.json();
            const unread = data.filter((n) => !n.read).length;
            setUnreadNotifications(unread);
          }
        } catch (error) {
          console.error('Error fetching notifications:', error);
        }
      };
      fetchUnreadCount();
    }
  }, [activeModule]);

  // Fetch total leave requests count
  useEffect(() => {
    const fetchLeaveRequestsCount = async () => {
      try {
        const response = await fetch(getApiUrl('/api/leave-requests'), {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setTotalLeaveRequests(data.length);
        }
      } catch (error) {
        console.error('Error fetching leave requests:', error);
      }
    };

    fetchLeaveRequestsCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchLeaveRequestsCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setUserRole('');
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setActiveModule('search');
    }
  };

  const handleSearchClick = () => {
    if (searchQuery.trim()) {
      setActiveModule('search');
    }
  };

  const openHelpDocs = () => {
    setActiveModule('help');
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleLeaveSubmit = (data: LeaveRequestData) => {
    return fetch('/api/submit-leave-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          alert(`Leave request submitted successfully!\n\nRequest ID: ${result.requestId}\nStatus: Ready for CSP Review\n\nValidation:\n- Days: ${result.validation?.days}\n- Remaining PTO: ${result.validation?.balance?.remainingPTO}/${result.validation?.balance?.annualPTO}`);
        } else if (result.validationErrors) {
          throw { validationErrors: result.validationErrors };
        } else {
          alert('Failed to submit leave request.');
        }
      })
      .catch((error) => {
        if (error.validationErrors) {
          throw error;
        }
        alert('Error submitting leave request.');
        throw error;
      });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
      
      {/* Sidebar - Persistent on desktop, overlay on mobile */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-blue-50 via-sky-50 to-blue-50 shadow-xl md:shadow-lg flex flex-col py-6 px-4 overflow-y-auto border-r border-blue-200 transform md:transform-none transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Mobile Close Button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <X className="w-5 h-5 text-blue-700" />
        </button>
        
        {/* Sidebar Header */}
        <div className="mb-7 pb-6 border-b border-blue-200">
          <div className="flex flex-col items-center justify-center">
            {/* CorePTO Logo - Bee Themed */}
            <div className="flex items-center justify-center gap-1.5 mb-3">
              <span className="text-3xl font-extrabold bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 bg-clip-text text-transparent tracking-tight leading-none">Core</span>
              <div className="relative flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5"/>
                  <circle cx="12" cy="12" r="3.5" fill="currentColor"/>
                </svg>
                <div className="absolute inset-0 w-5 h-5 bg-blue-500 rounded-full opacity-25 blur-md animate-pulse"></div>
              </div>
              <span className="text-3xl font-extrabold bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent tracking-tight leading-none">PTO</span>
            </div>
            
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent mb-2.5"></div>
            <p className="text-[10px] text-blue-700 font-semibold tracking-[0.2em] uppercase">Leave Management</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {/* Team Member View - Submit & Track Requests */}
          {isTeamMember ? (
            <>
              <button
                className={`relative flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-200 group overflow-hidden ${!activeModule || activeModule === 'official-form' ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-600 text-white shadow-3d-active transform-3d-active' : 'text-blue-900 hover:bg-gradient-to-br hover:from-blue-100 hover:to-blue-100 hover:shadow-3d-hover hover:transform-3d-hover'}`}
                onClick={() => setActiveModule('official-form')}
              >
                {(!activeModule || activeModule === 'official-form') && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                )}
                <FileDown className={`w-5 h-5 transition-all duration-300 group-hover:scale-110 relative z-10 ${!activeModule || activeModule === 'official-form' ? 'animate-bounce-subtle drop-shadow-glow-white' : ''}`} />
                <span className="font-medium text-sm relative z-10">Submit Leave Request</span>
              </button>
              <button
                className={`relative flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-200 group overflow-hidden ${activeModule === 'my-requests' ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-600 text-white shadow-3d-active transform-3d-active' : 'text-blue-900 hover:bg-gradient-to-br hover:from-blue-100 hover:to-blue-100 hover:shadow-3d-hover hover:transform-3d-hover'}`}
                onClick={() => setActiveModule('my-requests')}
              >
                {activeModule === 'my-requests' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                )}
                <ClipboardCheck className={`w-5 h-5 transition-all duration-300 group-hover:scale-110 relative z-10 ${activeModule === 'my-requests' ? 'animate-bounce-subtle drop-shadow-glow-white' : ''}`} />
                <span className="font-medium text-sm relative z-10">My Leave Requests</span>
              </button>
              <button
                className={`relative flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-200 group overflow-hidden ${activeModule === 'notifications' ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-600 text-white shadow-3d-active transform-3d-active' : 'text-blue-900 hover:bg-gradient-to-br hover:from-blue-100 hover:to-blue-100 hover:shadow-3d-hover hover:transform-3d-hover'}`}
                onClick={() => setActiveModule('notifications')}
              >
                {activeModule === 'notifications' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                )}
                <Bell className={`w-5 h-5 transition-all duration-300 group-hover:scale-110 relative z-10 ${activeModule === 'notifications' ? 'animate-bounce-subtle drop-shadow-glow-white' : ''} ${unreadNotifications > 0 ? 'animate-wiggle' : ''}`} />
                <span className="font-medium text-sm relative z-10">Notifications</span>
                {unreadNotifications > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse relative z-10">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
              {/* CSP/Admin View - Simplified PTO Workflow */}
              
              {/* Step 1 & 2: Receive & Review Requests */}
              <button
                className={`relative flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-200 group overflow-hidden ${activeModule === 'csp-review' ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-600 text-white shadow-3d-active transform-3d-active' : 'text-blue-900 hover:bg-gradient-to-br hover:from-blue-100 hover:to-blue-100 hover:shadow-3d-hover hover:transform-3d-hover'}`}
                onClick={() => setActiveModule('csp-review')}
              >
                {activeModule === 'csp-review' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                )}
                <ClipboardCheck className={`w-5 h-5 transition-all duration-300 group-hover:scale-110 relative z-10 ${activeModule === 'csp-review' ? 'animate-bounce-subtle drop-shadow-glow-white' : ''}`} />
                <div className="flex-1 relative z-10">
                  <div className="font-medium text-sm">Review Queue</div>
                  <div className="text-xs opacity-75">Pending approvals</div>
                </div>
              </button>

              <button
                className={`relative flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-200 group overflow-hidden ${activeModule === 'all-requests' ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-600 text-white shadow-3d-active transform-3d-active' : 'text-blue-900 hover:bg-gradient-to-br hover:from-blue-100 hover:to-blue-100 hover:shadow-3d-hover hover:transform-3d-hover'}`}
                onClick={() => setActiveModule('all-requests')}
              >
                {activeModule === 'all-requests' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                )}
                <FileText className={`w-5 h-5 transition-all duration-300 group-hover:scale-110 relative z-10 ${activeModule === 'all-requests' ? 'animate-bounce-subtle drop-shadow-glow-white' : ''}`} />
                <span className="font-medium text-sm relative z-10">Request History</span>
              </button>

              {/* Team Members & PTO Balances (Combined) */}
              <button
                className={`relative flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-200 group overflow-hidden ${activeModule === 'team' ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-600 text-white shadow-3d-active transform-3d-active' : 'text-blue-900 hover:bg-gradient-to-br hover:from-blue-100 hover:to-blue-100 hover:shadow-3d-hover hover:transform-3d-hover'}`}
                onClick={() => setActiveModule('team')}
              >
                {activeModule === 'team' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                )}
                <UsersRound className={`w-5 h-5 transition-all duration-300 group-hover:scale-110 relative z-10 ${activeModule === 'team' ? 'animate-bounce-subtle drop-shadow-glow-white' : ''}`} />
                <div className="flex-1 relative z-10">
                  <div className="font-medium text-sm">Team & PTO</div>
                  <div className="text-xs opacity-75">Member balances</div>
                </div>
              </button>

              {/* Absenteeism Report */}
              <button
                className={`relative flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-200 group overflow-hidden ${activeModule === 'absenteeism' ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-600 text-white shadow-3d-active transform-3d-active' : 'text-blue-900 hover:bg-gradient-to-br hover:from-blue-100 hover:to-blue-100 hover:shadow-3d-hover hover:transform-3d-hover'}`}
                onClick={() => setActiveModule('absenteeism')}
              >
                {activeModule === 'absenteeism' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                )}
                <ClipboardList className={`w-5 h-5 transition-all duration-300 group-hover:scale-110 relative z-10 ${activeModule === 'absenteeism' ? 'animate-bounce-subtle drop-shadow-glow-white' : ''}`} />
                <div className="flex-1 relative z-10">
                  <div className="font-medium text-sm">Absenteeism Report</div>
                  <div className="text-xs opacity-75">Track absences</div>
                </div>
              </button>

              {/* Notifications */}
              <button
                className={`relative flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-200 group overflow-hidden ${activeModule === 'notifications' ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-600 text-white shadow-3d-active transform-3d-active' : 'text-blue-900 hover:bg-gradient-to-br hover:from-blue-100 hover:to-blue-100 hover:shadow-3d-hover hover:transform-3d-hover'}`}
                onClick={() => setActiveModule('notifications')}
              >
                {activeModule === 'notifications' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                )}
                <div className="relative z-10">
                  <Bell className={`w-5 h-5 transition-all duration-300 group-hover:scale-110 ${activeModule === 'notifications' ? 'animate-bounce-subtle drop-shadow-glow-white' : ''} ${unreadNotifications > 0 ? 'animate-wiggle' : ''}`} />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold animate-pulse shadow-3d">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </div>
                <span className="font-medium text-sm relative z-10">Notifications</span>
                {unreadNotifications > 0 && (
                  <Badge className="ml-auto bg-red-500 text-white animate-pulse relative z-10 shadow-3d">{unreadNotifications}</Badge>
                )}
              </button>

              {/* Admin Panel (Admin/Director only) */}
              {isAdmin && (
                <>
                  <div className="my-3 border-t border-gray-200"></div>
                  <button
                    className={`relative flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-200 group overflow-hidden ${activeModule === 'admin' ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-600 text-white shadow-3d-active transform-3d-active' : 'text-blue-900 hover:bg-gradient-to-br hover:from-blue-100 hover:to-blue-100 hover:shadow-3d-hover hover:transform-3d-hover'}`}
                    onClick={() => setActiveModule('admin')}
                  >
                    {activeModule === 'admin' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                    )}
                    <Settings className={`w-5 h-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-90 relative z-10 ${activeModule === 'admin' ? 'animate-spin-slow drop-shadow-glow-white' : ''}`} />
                    <div className="flex-1 relative z-10">
                      <div className="font-medium text-sm">Admin Panel</div>
                      <div className="text-xs opacity-75">Settings & sync</div>
                    </div>
                  </button>
                </>
              )}
            </>
          )}
        </nav>

        {/* User Info Section - Moved to Bottom */}
        <div className="mt-auto pt-4 border-t border-blue-200">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-900 truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-blue-700 truncate">{user?.email || ''}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs px-2.5 py-1 bg-blue-200 text-blue-900 rounded-md font-medium">
                {user?.role === 'director' ? 'Director' : user?.role === 'csp' ? 'CSP' : user?.role === 'admin' ? 'Admin' : user?.role === 'finance' ? 'Finance' : user?.role === 'payroll' ? 'Payroll' : user?.role === 'manager' ? 'Manager' : 'User'}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-blue-800 hover:text-blue-900 flex items-center gap-1 hover:bg-blue-200 px-2.5 py-1 rounded-md transition-colors"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
            <div className="flex items-center justify-center pt-2 border-t border-blue-200">
              <img 
                src="/go-beyond.jpg" 
                alt="Go Beyond" 
                className="h-12 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Hamburger for Mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>

            {/* Search and Actions */}
            <div className="flex items-center gap-3 flex-1">
              <div className="hidden sm:flex items-center bg-gray-50 rounded-lg px-4 py-2 border border-gray-200 focus-within:border-blue-500 focus-within:bg-white transition-all max-w-md">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search requests, members..."
                  className="ml-3 bg-transparent outline-none text-sm flex-1 placeholder-gray-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  onFocus={() => activeModule !== 'search' && setActiveModule('search')}
                />
              </div>
              <div className="flex-1"></div>
              <button
                onClick={openHelpDocs}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                title="Help & Documentation"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveModule('notifications')}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8 fade-in">
            {/* Team Member View - Submit & Track Requests */}
            {isTeamMember ? (
              <div className="space-y-6">
                {activeModule === 'notifications' ? (
                  <NotificationsCenter onNavigate={setActiveModule} />
                ) : activeModule === 'my-requests' ? (
                  <MyLeaveRequests />
                ) : (
                  <OfficialLeaveForm />
                )}
              </div>
            ) : (
              <>
                {/* CSP/Admin View - Simplified */}
                
                {/* Admin Panel - Full Width */}
                {activeModule === 'admin' ? (
                  <div className="mb-8">
                    <AdminPanel />
                  </div>
                ) : (!activeModule || activeModule === 'csp-review') ? (
                  /* Review Queue - Full Width */
                  <div key="csp-review-section" className="mb-8">
                    <CSPReviewWorkflow key={`csp-review-${reviewQueueKey}`} />
                  </div>
                ) : (
                  /* Other Module Views */
                  <div className={activeModule === 'all-requests' || activeModule === 'absenteeism' || activeModule === 'help' ? 'w-full' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}>
                    <div className={activeModule === 'all-requests' || activeModule === 'absenteeism' || activeModule === 'help' ? 'w-full' : 'lg:col-span-2 space-y-6'}>
                      {activeModule === 'all-requests' && <AllRequestsView />}
                      {activeModule === 'calendar' && <CalendarView />}
                      {activeModule === 'team' && <TeamMembersList />}
                      {activeModule === 'notifications' && <NotificationsCenter onNavigate={setActiveModule} />}
                      {activeModule === 'balances' && <PTOBalanceTracker />}
                      {activeModule === 'analytics' && <ReportsAnalytics />}
                      {activeModule === 'absenteeism' && <CSPAbsenteeismReport />}
                      {activeModule === 'official-form' && <OfficialLeaveForm />}
                      {activeModule === 'sheets-sync' && <GoogleSheetsAbsenteeismSync />}
                      {activeModule === 'help' && <HelpDocumentation />}
                      {/* Backward compatibility */}
                      {activeModule === 'sheetsSync' && <GoogleSheetsSyncManager />}
                      {activeModule === 'settings' && <SystemSettings />}
                      {activeModule === 'search' && <GlobalSearch initialQuery={searchQuery} />}
                      {activeModule === 'integrations' && <IntegrationsHub />}
                      {activeModule === 'email' && <EmailSettings />}
                      {activeModule === 'attendance' && <AttendanceTracker />}
                      {activeModule === 'sync' && <SyncMonitor />}
                      {activeModule === 'meetings' && <MeetingNotes />}
                      {activeModule === 'reports' && <ReportGenerator />}
                      {activeModule === 'reminders' && <RemindersDashboard />}
                    </div>
                    {activeModule !== 'all-requests' && activeModule !== 'absenteeism' && activeModule !== 'help' && (
                      <div className="hidden lg:block">
                        <ActivityFeed />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Leave Request Modal */}
        {showLeaveForm && userRole === 'csp' && (
          <LeaveRequestForm
            onClose={() => setShowLeaveForm(false)}
            onSubmit={handleLeaveSubmit}
          />
        )}

        {/* Footer */}
        <footer className="bg-gradient-to-r from-blue-50 via-sky-50 to-blue-50 border-t border-blue-200 py-3 px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <img 
                src="/zimworx-logo.jpg" 
                alt="ZimWorx" 
                className="h-7 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <img 
                src="/global-recognition.jpg" 
                alt="Global Recognition" 
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="text-xs text-blue-800">© 2025 ZimWorx. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Last synced: {formatRefreshTime(lastRefreshTime)}</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

