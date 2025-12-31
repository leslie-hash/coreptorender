import React, { useState } from 'react';
import { Bell, AlertTriangle, CheckCircle } from 'lucide-react';

interface Reminder {
  id: string;
  type: 'warning' | 'overdue' | 'completed';
  message: string;
  assignee: string;
  dueDate: string;
}

export default function RemindersDashboard() {
  const [reminders, setReminders] = useState<Reminder[]>([
    { id: '1', type: 'overdue', message: 'Client Success Plan verification missing', assignee: 'Sarah Johnson', dueDate: '2 days overdue' },
    { id: '2', type: 'warning', message: 'Quarterly review notes incomplete', assignee: 'Mike Chen', dueDate: 'Due today' },
    { id: '3', type: 'warning', message: 'Attendance sheet needs approval', assignee: 'Emma Davis', dueDate: 'Due tomorrow' },
    { id: '4', type: 'completed', message: 'Monthly report submitted', assignee: 'John Smith', dueDate: 'Completed' }
  ]);

  const handleDismiss = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const overdueCount = reminders.filter(r => r.type === 'overdue').length;
  const warningCount = reminders.filter(r => r.type === 'warning').length;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Smart Reminders</h3>
        <div className="flex gap-2">
          {overdueCount > 0 && (
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
              {overdueCount} overdue
            </span>
          )}
          {warningCount > 0 && (
            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-semibold">
              {warningCount} pending
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className={`p-4 rounded-lg border-l-4 ${
              reminder.type === 'overdue' ? 'bg-red-50 border-red-500' :
              reminder.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
              'bg-green-50 border-green-500'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {reminder.type === 'overdue' && <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />}
                {reminder.type === 'warning' && <Bell className="w-5 h-5 text-yellow-600 mt-0.5" />}
                {reminder.type === 'completed' && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{reminder.message}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <span>{reminder.assignee}</span>
                    <span>•</span>
                    <span>{reminder.dueDate}</span>
                  </div>
                </div>
              </div>
              {reminder.type !== 'completed' && (
                <button
                  onClick={() => handleDismiss(reminder.id)}
                  className="text-gray-400 hover:text-gray-600 text-sm ml-2"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
