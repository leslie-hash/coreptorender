import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, User, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface LeaveEvent {
  id: string;
  teamMember: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: 'csp-review' | 'pending' | 'approved' | 'rejected';
  reason?: string;
  days?: number;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: LeaveEvent[];
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaveEvents, setLeaveEvents] = useState<LeaveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);

  useEffect(() => {
    fetchLeaveEvents();
  }, [currentDate]); // Refetch when month changes

  const fetchLeaveEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/leave-requests?page=1&limit=100');
      
      if (!response.ok) {
        throw new Error('Failed to fetch leave requests');
      }
      
      const result = await response.json();
      
      // Handle both array response and object with data property
      const requests = Array.isArray(result) ? result : (result.data || []);
      
      // Map the data to match our interface and include all statuses
      const mappedRequests: LeaveEvent[] = requests.map((req: LeaveEvent) => ({
        id: req.id,
        teamMember: req.teamMember,
        leaveType: req.leaveType,
        startDate: req.startDate,
        endDate: req.endDate,
        status: req.status,
        reason: req.reason,
        days: req.days
      }));
      
      setLeaveEvents(mappedRequests);
    } catch (error) {
      console.error('Failed to fetch leave events:', error);
      setLeaveEvents([]);
    }
    setLoading(false);
  };

  const getDaysInMonth = (date: Date): CalendarDay[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: CalendarDay[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: getEventsForDate(date)
      });
    }

    // Current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        events: getEventsForDate(date)
      });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: getEventsForDate(date)
      });
    }

    return days;
  };

  const getEventsForDate = (date: Date): LeaveEvent[] => {
    return leaveEvents.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      const checkDate = new Date(date);
      
      // Reset time parts for accurate comparison
      eventStart.setHours(0, 0, 0, 0);
      eventEnd.setHours(23, 59, 59, 999);
      checkDate.setHours(0, 0, 0, 0);
      
      return checkDate >= eventStart && checkDate <= eventEnd;
    }).sort((a, b) => {
      // Sort by status priority: approved first, then pending
      if (a.status === 'approved' && b.status !== 'approved') return -1;
      if (a.status !== 'approved' && b.status === 'approved') return 1;
      return a.teamMember.localeCompare(b.teamMember);
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getEventColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-[#22C55E] hover:bg-[#16A34A]';
      case 'pending':
        return 'bg-[#FACC15] hover:bg-[#EAB308]';
      case 'csp-review':
        return 'bg-[#3B82F6] hover:bg-[#2563EB]';
      case 'rejected':
        return 'bg-[#EF4444] hover:bg-[#DC2626]';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-[#22C55E]" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-[#FACC15]" />;
      case 'csp-review':
        return <Clock className="w-4 h-4 text-[#3B82F6]" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-[#EF4444]" />;
      default:
        return null;
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${days} days)`;
  };

  const handleDayClick = (day: CalendarDay) => {
    if (day.events.length > 0) {
      setSelectedDay(day);
      setShowDayModal(true);
    }
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-[#E0F2FE] rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="w-7 h-7 text-[#14B8A6]" />
              Team Leave Calendar
            </h2>
            <p className="text-gray-600 mt-1">View team availability and leave schedules</p>
          </div>
        </div>

        {/* Calendar Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-gray-900 min-w-[200px] text-center">
              {formatMonthYear(currentDate)}
            </h3>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-[#0050AA] text-white rounded-lg hover:bg-[#003d85] transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mb-4 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#22C55E]"></div>
          <span className="text-gray-700">Approved</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FACC15]"></div>
          <span className="text-gray-700">Pending Client Approval</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div>
          <span className="text-gray-700">CSP Review</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
          <span className="text-gray-700">Rejected</span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      )}

      {/* Calendar Grid */}
      {!loading && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Week Days Header */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center py-3 text-sm font-semibold text-gray-700"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {days.map((day, index) => (
              <div
                key={index}
                onClick={() => handleDayClick(day)}
                className={`min-h-[100px] border-b border-r border-gray-200 p-2 transition-colors ${
                  !day.isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                } ${day.isToday ? 'bg-purple-50' : ''} ${
                  day.events.length > 0 ? 'cursor-pointer hover:bg-gray-100' : ''
                }`}
              >
                <div
                  className={`text-sm font-semibold mb-2 ${
                    !day.isCurrentMonth
                      ? 'text-gray-400'
                      : day.isToday
                      ? 'text-purple-600'
                      : 'text-gray-700'
                  }`}
                >
                  {day.date.getDate()}
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {day.events.slice(0, 3).map((event, eventIndex) => (
                    <div
                      key={eventIndex}
                      className={`text-xs px-2 py-1 rounded text-white truncate transition-colors ${getEventColor(
                        event.status
                      )}`}
                      title={`${event.teamMember} - ${event.leaveType} (${event.status})`}
                    >
                      {event.teamMember}
                    </div>
                  ))}
                  {day.events.length > 3 && (
                    <div className="text-xs text-[#14B8A6] font-semibold px-2 cursor-pointer hover:underline">
                      +{day.events.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day Details Modal */}
      {showDayModal && selectedDay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedDay.date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedDay.events.length} {selectedDay.events.length === 1 ? 'person' : 'people'} on leave
                </p>
              </div>
              <button
                onClick={() => setShowDayModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-3">
              {selectedDay.events.map((event, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-gray-600" />
                      <h4 className="font-semibold text-gray-900">{event.teamMember}</h4>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(event.status)}
                      <span className={`text-xs font-medium px-2 py-1 rounded capitalize ${
                        event.status === 'approved' ? 'bg-green-100 text-green-800' :
                        event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        event.status === 'csp-review' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {event.status === 'csp-review' ? 'CSP Review' : event.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span className="font-medium">Leave Type:</span>
                      <span>{event.leaveType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">Duration:</span>
                      <span>{formatDateRange(event.startDate, event.endDate)}</span>
                    </div>
                    {event.reason && (
                      <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-1">Reason:</p>
                        <p className="text-sm text-gray-600">{event.reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-800 text-sm font-semibold mb-1">Approved Leaves</div>
          <div className="text-2xl font-bold text-green-900">
            {leaveEvents.filter(e => e.status === 'approved').length}
          </div>
          <p className="text-xs text-green-600 mt-1">Currently approved</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-yellow-800 text-sm font-semibold mb-1">Pending Client</div>
          <div className="text-2xl font-bold text-yellow-900">
            {leaveEvents.filter(e => e.status === 'pending').length}
          </div>
          <p className="text-xs text-yellow-600 mt-1">Awaiting client approval</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-800 text-sm font-semibold mb-1">CSP Review</div>
          <div className="text-2xl font-bold text-blue-900">
            {leaveEvents.filter(e => e.status === 'csp-review').length}
          </div>
          <p className="text-xs text-blue-600 mt-1">Under CSP review</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-orange-800 text-sm font-semibold mb-1">Total Days</div>
          <div className="text-2xl font-bold text-orange-900">
            {leaveEvents.reduce((sum, e) => {
              return sum + (e.days || 0);
            }, 0)}
          </div>
          <p className="text-xs text-orange-600 mt-1">All leave days</p>
        </div>
      </div>
    </div>
  );
}
