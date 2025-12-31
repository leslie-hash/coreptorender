import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Calendar, Upload, Download, Plus, Trash2, Edit2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AbsenteeismEntry {
  id?: string;
  weekStart: string;
  startDate: string;
  endDate: string;
  noOfDays: number;
  noOfDaysNoWknd: number;
  nameOfAbsentee: string;
  reasonForAbsence: string;
  absenteeismAuthorised: 'Yes' | 'No';
  leaveFormSent: 'Yes' | 'No';
  comment: string;
  client: string;
  csp: string;
  country: string;
  weekNo: number;
  month: string;
  year: number;
  timeStamp: string;
}

interface TeamMemberMeta {
  teamMemberName: string;
  csp: string;
  client?: string;
  email?: string;
  [key: string]: string | number | boolean | undefined;
}

export default function CSPAbsenteeismReport() {
  const { user } = useAppContext();
  const [entries, setEntries] = useState<AbsenteeismEntry[]>([]);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'authorised'>('all');

  const [formData, setFormData] = useState<AbsenteeismEntry>({
    weekStart: '',
    startDate: '',
    endDate: '',
    noOfDays: 0,
    noOfDaysNoWknd: 0,
    nameOfAbsentee: '',
    reasonForAbsence: '',
    absenteeismAuthorised: 'Yes',
    leaveFormSent: 'Yes',
    comment: '',
    client: 'Zimworx',
    csp: user?.name || '',
    country: 'Zimbabwe',
    weekNo: 0,
    month: '',
    year: new Date().getFullYear(),
    timeStamp: new Date().toISOString()
  });

  // Fetch team members for CSP
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const response = await fetch('/api/team-member-meta', {
          credentials: 'include'
        });
        if (response.ok) {
          const data: TeamMemberMeta[] = await response.json();
          // Filter team members for this CSP
          const cspMembers = data
            .filter((m) => m.csp === user?.name)
            .map((m) => m.teamMemberName);
          setTeamMembers(cspMembers);
        }
      } catch (error) {
        console.error('Error fetching team members:', error);
      }
    };

    if (user?.name) {
      fetchTeamMembers();
    }
  }, [user?.name]);

  // Fetch absenteeism entries
  useEffect(() => {
    const fetchAbsenteeismData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/absenteeism-reports', {
          credentials: 'include'
        });
        if (response.ok) {
          const result = await response.json();
          // API returns { success: true, data: [...] }
          const data = result.data || result;
          // Filter for this CSP's team only
          const cspData = Array.isArray(data) ? data.filter((entry: AbsenteeismEntry) => entry.csp === user?.name) : [];
          setEntries(cspData);
        }
      } catch (error) {
        console.error('Error fetching absenteeism data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.name) {
      fetchAbsenteeismData();
    }
  }, [user?.name]);

  // Calculate week start date
  const calculateWeekStart = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDay();
    const diff = date.getDate() - day; // adjust when day is Sunday
    return new Date(date.setDate(diff)).toISOString().split('T')[0];
  };

  // Calculate business days (excluding weekends)
  const calculateBusinessDays = (startStr: string, endStr: string) => {
    let count = 0;
    const current = new Date(startStr);
    const end = new Date(endStr);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  // Calculate week number
  const calculateWeekNumber = (dateString: string) => {
    const date = new Date(dateString);
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const updated = { ...formData, [field]: value };

    if (updated.startDate && updated.endDate) {
      // Calculate derived fields
      const start = new Date(updated.startDate);
      const end = new Date(updated.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const businessDays = calculateBusinessDays(updated.startDate, updated.endDate);
      const weekStart = calculateWeekStart(updated.startDate);
      const weekNo = calculateWeekNumber(updated.startDate);
      const month = start.toLocaleDateString('en-US', { month: 'long' });

      updated.noOfDays = days;
      updated.noOfDaysNoWknd = businessDays;
      updated.weekStart = weekStart;
      updated.weekNo = weekNo;
      updated.month = month;
    }

    setFormData(updated);
  };

  const handleSubmit = async () => {
    if (!formData.nameOfAbsentee || !formData.startDate || !formData.endDate || !formData.reasonForAbsence) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const endpoint = editingId ? `/api/absenteeism-reports/${editingId}` : '/api/absenteeism-reports';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          csp: user?.name
        })
      });

      if (response.ok) {
        toast.success(editingId ? 'Entry updated successfully' : 'Entry added successfully');
        setShowForm(false);
        setEditingId(null);
        setFormData({
          weekStart: '',
          startDate: '',
          endDate: '',
          noOfDays: 0,
          noOfDaysNoWknd: 0,
          nameOfAbsentee: '',
          reasonForAbsence: '',
          absenteeismAuthorised: 'Yes',
          leaveFormSent: 'Yes',
          comment: '',
          client: 'Zimworx',
          csp: user?.name || '',
          country: 'Zimbabwe',
          weekNo: 0,
          month: '',
          year: new Date().getFullYear(),
          timeStamp: new Date().toISOString()
        });
        // Refetch data
        const fetchResponse = await fetch('/api/absenteeism-reports', {
          credentials: 'include'
        });
        if (fetchResponse.ok) {
          const data: AbsenteeismEntry[] = await fetchResponse.json();
          const cspData = data.filter((entry) => entry.csp === user?.name);
          setEntries(cspData);
        }
      } else {
        toast.error('Failed to save entry');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Error saving entry');
    }
  };

  const handleEdit = (entry: AbsenteeismEntry) => {
    setFormData(entry);
    setEditingId(entry.id || '');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const response = await fetch(`/api/absenteeism-reports/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('Entry deleted successfully');
        setEntries(entries.filter(e => e.id !== id));
      } else {
        toast.error('Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Error deleting entry');
    }
  };

  const handleImportFromSheets = async () => {
    if (!confirm('This will import historical absenteeism data from Google Sheets. Continue?')) return;
    
    try {
      toast.info('Importing data from Google Sheets...');
      const token = localStorage.getItem('token');
      const response = await fetch('/api/absenteeism/import-from-sheets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        toast.error('Server returned an invalid response. Please check the console.');
        return;
      }

      const data = await response.json();
      
      if (response.ok) {
        toast.success(`Successfully imported ${data.imported} records from Google Sheets!`);
        // Refetch data to show imported records
        const fetchResponse = await fetch('/api/absenteeism-reports', {
          credentials: 'include'
        });
        if (fetchResponse.ok) {
          const result = await fetchResponse.json();
          const fetchData = result.data || result;
          const cspData = Array.isArray(fetchData) ? fetchData.filter((entry: AbsenteeismEntry) => entry.csp === user?.name) : [];
          setEntries(cspData);
        }
      } else {
        console.error('Import error response:', data);
        const errorMsg = data.details || data.error || 'Failed to import from Google Sheets';
        const hint = data.hint ? `\n\n${data.hint}` : '';
        toast.error(errorMsg + hint, { duration: 10000 });
      }
    } catch (error) {
      console.error('Error importing:', error);
      toast.error(`Error importing data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportToSheets = async () => {
    try {
      const response = await fetch('/api/absenteeism-reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entries: entries.filter(e => e.csp === user?.name),
          csp: user?.name
        })
      });

      if (response.ok) {
        toast.success('Exported to Google Sheets successfully');
      } else {
        toast.error('Failed to export to Google Sheets');
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error exporting data');
    }
  };

  const filteredEntries = entries.filter(entry => {
    if (filter === 'pending') return entry.absenteeismAuthorised === 'No';
    if (filter === 'authorised') return entry.absenteeismAuthorised === 'Yes';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-500">Loading absenteeism data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="w-8 h-8 text-blue-600" />
            Absenteeism Report
          </h1>
          <p className="text-gray-600 mt-1">CSP: {user?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleImportFromSheets} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Import from Sheets
          </Button>
          <Button onClick={handleExportToSheets} variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Export to Sheets
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Auto-Generation Info Alert */}
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <AlertDescription className="text-green-800 ml-2">
          <strong>Automated Reporting:</strong> The report is automatically generated every time a leave is approved, and CSPs can query anytime to get their absenteeism data without manual input!
        </AlertDescription>
      </Alert>

      {/* Input Form */}
      {showForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>
              {editingId ? 'Edit Absenteeism Entry' : 'New Absenteeism Entry'}
            </CardTitle>
            <CardDescription>
              Enter absenteeism details for your team members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Team Member */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Name of Absentee *
                </label>
                <Select
                  value={formData.nameOfAbsentee}
                  onValueChange={(value) =>
                    setFormData({ ...formData, nameOfAbsentee: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member} value={member}>
                        {member}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Date *
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  End Date *
                </label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                />
              </div>

              {/* Reason for Absence */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Reason for Absence *
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Annual Leave, Sick Leave, etc."
                  value={formData.reasonForAbsence}
                  onChange={(e) =>
                    setFormData({ ...formData, reasonForAbsence: e.target.value })
                  }
                />
              </div>

              {/* Days Summary */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Calendar Days
                  </label>
                  <Input
                    type="number"
                    value={formData.noOfDays}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Business Days
                  </label>
                  <Input
                    type="number"
                    value={formData.noOfDaysNoWknd}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
              </div>

              {/* Authorised */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Absenteeism Authorised?
                </label>
                <Select
                  value={formData.absenteeismAuthorised}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      absenteeismAuthorised: value as 'Yes' | 'No'
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Leave Form Sent */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Leave Form/Sick Note Sent?
                </label>
                <Select
                  value={formData.leaveFormSent}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      leaveFormSent: value as 'Yes' | 'No'
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Comment */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Comment
                </label>
                <Input
                  type="text"
                  placeholder="Additional notes or comments"
                  value={formData.comment}
                  onChange={(e) =>
                    setFormData({ ...formData, comment: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                {editingId ? 'Update Entry' : 'Add Entry'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All ({entries.length})
        </Button>
        <Button
          variant={filter === 'authorised' ? 'default' : 'outline'}
          onClick={() => setFilter('authorised')}
        >
          Authorised ({entries.filter(e => e.absenteeismAuthorised === 'Yes').length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          Pending ({entries.filter(e => e.absenteeismAuthorised === 'No').length})
        </Button>
      </div>

      {/* Entries Table */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Absenteeism Entries</CardTitle>
          <CardDescription className="text-sm">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredEntries.length === 0 ? (
            <div className="p-6">
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  No absenteeism entries found. Create one to get started.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full table-auto text-sm">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr className="text-left">
                    <th className="py-2 px-2 font-semibold text-gray-700">Member</th>
                    <th className="py-2 px-2 font-semibold text-gray-700">Country</th>
                    <th className="py-2 px-2 font-semibold text-gray-700">Week Start</th>
                    <th className="py-2 px-2 font-semibold text-gray-700">Start Date</th>
                    <th className="py-2 px-2 font-semibold text-gray-700">End Date</th>
                    <th className="py-2 px-2 font-semibold text-gray-700 text-center">Days</th>
                    <th className="py-2 px-2 font-semibold text-gray-700 text-center">Bus. Days</th>
                    <th className="py-2 px-2 font-semibold text-gray-700">Reason</th>
                    <th className="py-2 px-2 font-semibold text-gray-700 text-center">Wk</th>
                    <th className="py-2 px-2 font-semibold text-gray-700 text-center">Mo</th>
                    <th className="py-2 px-2 font-semibold text-gray-700 text-center">Yr</th>
                    <th className="py-2 px-2 font-semibold text-gray-700 text-center">Status</th>
                    <th className="py-2 px-2 font-semibold text-gray-700 text-center">Form</th>
                    <th className="py-2 px-2 font-semibold text-gray-700 text-center">Timestamp</th>
                    <th className="py-2 px-2 font-semibold text-gray-700 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-blue-50 transition-colors">
                      <td className="py-2 px-2">
                        <div className="font-medium text-gray-900 whitespace-nowrap">{entry.nameOfAbsentee}</div>
                        <div className="text-xs text-gray-500">{entry.client || 'TBD'}</div>
                      </td>
                      <td className="py-2 px-2 text-gray-900">{entry.country || 'N/A'}</td>
                      <td className="py-2 px-2 whitespace-nowrap text-gray-900">
                        {entry.weekStart ? new Date(entry.weekStart).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: '2-digit' 
                        }) : 'N/A'}
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap text-gray-900">
                        {new Date(entry.startDate).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: '2-digit' 
                        })}
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap text-gray-900">
                        {new Date(entry.endDate).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: '2-digit' 
                        })}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                          {entry.noOfDays}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm font-medium">
                          {entry.noOfDaysNoWknd}
                        </span>
                      </td>
                      <td className="py-2 px-2 max-w-[150px]">
                        <div className="text-sm text-gray-900 truncate" title={entry.reasonForAbsence}>{entry.reasonForAbsence}</div>
                        {entry.comment && (
                          <div className="text-xs text-gray-500 italic truncate" title={entry.comment}>{entry.comment}</div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center text-gray-900 w-12">{entry.weekNo || '-'}</td>
                      <td className="py-2 px-2 text-center text-gray-900">{entry.month || '-'}</td>
                      <td className="py-2 px-2 text-center text-gray-900">{entry.year || '-'}</td>
                      <td className="py-2 px-2 text-center">
                        <Badge
                          variant="outline"
                          className={
                            entry.absenteeismAuthorised === 'Yes'
                              ? 'bg-green-100 text-green-800 text-sm px-2 py-1'
                              : 'bg-yellow-100 text-yellow-800 text-sm px-2 py-1'
                          }
                        >
                          {entry.absenteeismAuthorised === 'Yes' ? '✓' : '⏱'}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Badge
                          variant="outline"
                          className={
                            entry.leaveFormSent === 'Yes'
                              ? 'bg-blue-50 text-blue-700 text-sm px-2 py-1'
                              : 'bg-gray-100 text-gray-600 text-sm px-2 py-1'
                          }
                        >
                          {entry.leaveFormSent === 'Yes' ? '📄' : '✗'}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap text-sm text-gray-600">
                        {entry.timeStamp ? new Date(entry.timeStamp).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-'}
                      </td>
                      <td className="py-1 px-1">
                        <div className="flex gap-1 justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          onClick={() => handleEdit(entry)}
                          title="Edit"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                          onClick={() => handleDelete(entry.id || '')}
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
