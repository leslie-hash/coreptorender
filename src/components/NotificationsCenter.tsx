import React, { useState, useEffect } from 'react';
import { Bell, Check, Clock, AlertCircle, X, Calendar, UserCheck, UserX, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Notification {
  id: string;
  type: 'new_request' | 'approved' | 'rejected' | 'upcoming_leave' | 'reminder' | 
        'request_approved' | 'request_declined' | 'csp_review' | 'client_approved' | 'client_declined' |
        'payroll_sent' | 'document_ready' | 'balance_low' | 'balance_updated' | 
        'sync_complete' | 'sync_error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  relatedId?: string;
  priority: 'high' | 'medium' | 'low';
  recipientRole: string;
  teamMember?: string;
  leaveType?: string;
}

interface NotificationsCenterProps {
  onNavigate?: (module: string) => void;
}

const NotificationsCenter: React.FC<NotificationsCenterProps> = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const fetchNotifications = async () => {
    try {
      console.log('🔔 Fetching notifications...');
      const response = await fetch('/api/notifications', {
        credentials: 'include',
      });
      console.log('📡 Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Notifications received:', data.length);
        setNotifications(data);
      } else {
        console.error('❌ Failed to fetch notifications:', response.status, response.statusText);
        const text = await response.text();
        console.error('Response body:', text);
      }
    } catch (error) {
      console.error('🚨 Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    console.log('=== NOTIFICATION CLICKED ===');
    console.log('Notification:', notification);
    console.log('Notification type:', notification.type);
    console.log('onNavigate function available:', !!onNavigate);
    
    // Mark as read first
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (onNavigate) {
      let targetModule = 'csp-review'; // Default to Review Queue
      
      switch (notification.type) {
        case 'new_request':
        case 'request_approved':
        case 'request_declined':
        case 'csp_review':
        case 'client_approved':
        case 'client_declined':
        case 'payroll_sent':
        case 'document_ready':
          targetModule = 'csp-review';
          break;
        case 'balance_low':
        case 'balance_updated':
          targetModule = 'team';
          break;
        case 'sync_complete':
        case 'sync_error':
          targetModule = 'absenteeism';
          break;
        case 'upcoming_leave':
        case 'reminder':
          targetModule = 'my-requests';
          break;
      }
      
      console.log(`🎯 Navigating to module: '${targetModule}'`);
      
      // Navigate - this triggers the parent component state change
      onNavigate(targetModule);
      
      console.log('✅ Navigation command sent successfully');
      
      // Scroll to top after a brief delay to ensure DOM has updated
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } else {
      console.error('❌ onNavigate is not defined! Cannot navigate.');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      await Promise.all(
        unreadIds.map(id =>
          fetch(`/api/notifications/${id}/read`, {
            method: 'PATCH',
            credentials: 'include',
          })
        )
      );
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_request':
        return <Bell className="h-5 w-5 text-blue-500" />;
      case 'approved':
        return <UserCheck className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <UserX className="h-5 w-5 text-red-500" />;
      case 'upcoming_leave':
        return <Calendar className="h-5 w-5 text-purple-500" />;
      case 'reminder':
        return <Clock className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'read' && !notification.read) return false;
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    return true;
  });

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
          <h2 className="text-3xl font-bold tracking-tight">Notifications Center</h2>
          <p className="text-muted-foreground">
            Stay updated on PTO requests, approvals, and upcoming leaves
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Bell className="h-4 w-4 mr-2" />
            {unreadCount} Unread
          </Badge>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline" size="sm">
              <Check className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Unread ({notifications.filter(n => !n.read).length})
          </Button>
          <Button
            variant={filter === 'read' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('read')}
          >
            Read ({notifications.filter(n => n.read).length})
          </Button>
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="new_request">New Requests</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="upcoming_leave">Upcoming Leave</SelectItem>
            <SelectItem value="reminder">Reminders</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[600px] rounded-md border">
        <div className="space-y-4 p-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No notifications</p>
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`transition-all duration-200 hover:shadow-lg hover:scale-[1.01] cursor-pointer border-2 ${
                  !notification.read 
                    ? 'bg-blue-50 border-blue-300 hover:border-blue-400' 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className={`font-semibold ${!notification.read ? 'text-blue-900' : ''}`}>
                            {notification.title}
                          </h3>
                          {notification.teamMember && (
                            <p className="text-sm text-muted-foreground">
                              Team Member: {notification.teamMember}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700">{notification.message}</p>

                      {notification.leaveType && (
                        <Badge variant="outline" className="text-xs">
                          {notification.leaveType}
                        </Badge>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-blue-600 font-medium hover:text-blue-700">
                            Click to view →
                          </span>
                          {!notification.read && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="text-xs"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default NotificationsCenter;
