import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { getApiUrl } from '@/utils/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Calendar, Upload, Download, Plus, Trash2, Edit2, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

interface SickLeaveRequest {
  id: string;
  teamMember: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  leaveType: string;
  sickNoteUrl?: string;
  submittedAt: string;
  client?: string;
}

export default function CSPAbsenteeismReport() {
  const { user } = useAppContext();
  const [entries, setEntries] = useState<AbsenteeismEntry[]>([]);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [missingSickNotes, setMissingSickNotes] = useState<SickLeaveRequest[]>([]);
  const [noFormRequests, setNoFormRequests] = useState<SickLeaveRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'authorised'>('all');
  const [selectedEntry, setSelectedEntry] = useState<AbsenteeismEntry | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;

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
        const response = await fetch(getApiUrl('/api/team-member-meta'), {
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
      fetchMissingSickNotes();
    }
  }, [user?.name]);

  // Fetch sick leave requests missing doctor's notes
  const fetchMissingSickNotes = async () => {
    try {
      const response = await fetch(getApiUrl('/api/leave-requests?page=1&limit=100'), {
        credentials: 'include'
      });
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        // Filter for sick leave requests without sick notes
        const sickWithoutNotes = Array.isArray(data) ? data.filter((r: SickLeaveRequest) => 
          (r.leaveType?.toLowerCase() === 'sick' || r.leaveType?.toLowerCase() === 'sick leave') &&
          !r.sickNoteUrl &&
          r.status !== 'rejected' &&
          r.status !== 'csp-rejected'
        ) : [];
        setMissingSickNotes(sickWithoutNotes);
      }
    } catch (error) {
      console.error('Error fetching sick leave requests:', error);
    }
  };

  // Fetch requests with no supporting documentation
  const fetchNoFormRequests = async () => {
    try {
      const response = await fetch(getApiUrl('/api/leave-requests?page=1&limit=1000'), {
        credentials: 'include'
      });
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        // Filter for requests without any form documentation
        // This includes requests that don't have official forms, no sick notes, or any supporting docs
        const noForm = Array.isArray(data) ? data.filter((r: SickLeaveRequest) => 
          !r.sickNoteUrl &&
          r.status !== 'rejected' &&
          r.status !== 'csp-rejected' &&
          (r.leaveType?.toLowerCase() === 'sick' || 
           r.leaveType?.toLowerCase() === 'sick leave' ||
           r.leaveType?.toLowerCase() === 'emergency' ||
           r.leaveType?.toLowerCase() === 'unpaid')
        ) : [];
        setNoFormRequests(noForm);
      }
    } catch (error) {
      console.error('Error fetching no form requests:', error);
    }
  };

  // Fetch absenteeism entries
  useEffect(() => {
    const fetchAbsenteeismData = async () => {
      try {
        setLoading(true);
        const response = await fetch(getApiUrl('/api/absenteeism-reports'), {
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
      fetchMissingSickNotes();
      fetchNoFormRequests();
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

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Absenteeism Report', 14, 20);
    
    // Add metadata
    doc.setFontSize(10);
    doc.text(`CSP: ${user?.name || 'N/A'}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, 33);
    doc.text(`Total Entries: ${filteredEntries.length}`, 14, 38);
    
    // Prepare table data
    const tableData = filteredEntries.map(entry => [
      entry.nameOfAbsentee,
      `${new Date(entry.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${new Date(entry.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`,
      entry.noOfDaysNoWknd.toString(),
      entry.reasonForAbsence,
      entry.client || 'TBD',
      entry.absenteeismAuthorised === 'Yes' ? 'Authorised' : 'Pending',
      entry.leaveFormSent === 'Yes' ? 'Sent' : 'Not Sent'
    ]);
    
    // Add table
    autoTable(doc, {
      head: [['Team Member', 'Period', 'Days', 'Reason', 'Client', 'Status', 'Form']],
      body: tableData,
      startY: 45,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 249, 255] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 40 },
        2: { cellWidth: 15 },
        3: { cellWidth: 40 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 }
      }
    });
    
    // Save the PDF
    const fileName = `Absenteeism_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    toast.success('PDF report generated successfully');
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedEntries = filteredEntries.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-500 dark:text-gray-400">Loading absenteeism data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
            <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Absenteeism Report
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">CSP: {user?.name}</p>
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
          <Button onClick={exportToPDF} variant="outline" className="gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-800/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700">
            <FileText className="w-4 h-4" />
            Export PDF
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Auto-Generation Info Alert */}
      <Alert className="border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-200 ml-2">
          <strong>Automated Reporting:</strong> The report is automatically generated every time a leave is approved, and CSPs can query anytime to get their absenteeism data without manual input!
        </AlertDescription>
      </Alert>

      {/* Missing Doctor's Notes Section */}
      {missingSickNotes.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2 text-lg">
              <AlertCircle className="w-5 h-5" />
              Missing Doctor's Notes ({missingSickNotes.length})
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-300">
              Sick leave requests requiring medical documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {missingSickNotes.map((request) => (
                <div 
                  key={request.id} 
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-700"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900 dark:text-white">{request.teamMember}</span>
                      <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-300">
                        {request.status?.replace(/-/g, ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span>{request.startDate} → {request.endDate}</span>
                      <span>•</span>
                      <span>{request.days || 1} day{(request.days || 1) > 1 ? 's' : ''}</span>
                      {request.client && (
                        <>
                          <span>•</span>
                          <span>{request.client}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium px-2 py-1 bg-amber-100 dark:bg-amber-900/50 rounded">
                      ⚠️ No Doctor's Note
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Form (No Supporting Documentation) Section */}
      {noFormRequests.length > 0 && (
        <Card className="border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2 text-lg">
              ❌ No Form ({noFormRequests.length})
            </CardTitle>
            <CardDescription className="text-red-700 dark:text-red-300">
              Leave requests with no supporting documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {noFormRequests.map((request) => (
                <div 
                  key={request.id} 
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900 dark:text-white">{request.teamMember}</span>
                      <Badge variant="outline" className="text-xs bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-red-300">
                        {request.leaveType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span>{request.startDate} → {request.endDate}</span>
                      <span>•</span>
                      <span>{request.days || 1} day{(request.days || 1) > 1 ? 's' : ''}</span>
                      {request.client && (
                        <>
                          <span>•</span>
                          <span>{request.client}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium px-2 py-1 bg-red-100 dark:bg-red-900/50 rounded">
                      ❌ No Documentation
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Form */}
      {showForm && (
        <Card className="border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">
              {editingId ? 'Edit Absenteeism Entry' : 'New Absenteeism Entry'}
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              Enter absenteeism details for your team members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Team Member */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
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
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
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
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
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
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
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
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Days
                  </label>
                  <Input
                    type="number"
                    value={formData.noOfDays}
                    disabled
                    className="bg-gray-100 dark:bg-gray-700 dark:text-gray-300"
                  />
                </div>
              </div>

              {/* Authorised */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
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
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
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
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
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
              <table className="w-full table-fixed text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700">
                  <tr className="text-left">
                    <th className="py-2 px-1.5 font-semibold text-gray-700 dark:text-gray-300 w-[140px]">Member</th>
                    <th className="py-2 px-1.5 font-semibold text-gray-700 dark:text-gray-300 w-[70px]">Dates</th>
                    <th className="py-2 px-1.5 font-semibold text-gray-700 dark:text-gray-300 text-center w-[50px]">Days</th>
                    <th className="py-2 px-1.5 font-semibold text-gray-700 dark:text-gray-300 w-[120px]">Reason</th>
                    <th className="py-2 px-1.5 font-semibold text-gray-700 dark:text-gray-300 text-center w-[80px]">Period</th>
                    <th className="py-2 px-1.5 font-semibold text-gray-700 dark:text-gray-300 text-center w-[50px]">Auth</th>
                    <th className="py-2 px-1.5 font-semibold text-gray-700 dark:text-gray-300 text-center w-[45px]">Act</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {paginatedEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="py-1.5 px-1.5">
                        <button 
                          className="text-left w-full group"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <div className="font-medium text-blue-600 dark:text-blue-400 group-hover:underline truncate" title={entry.nameOfAbsentee}>{entry.nameOfAbsentee}</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{entry.client || 'TBD'} • {entry.country || 'ZW'}</div>
                        </button>
                      </td>
                      <td className="py-1.5 px-1.5 text-gray-900 dark:text-gray-200">
                        <div className="text-[10px]">
                          {new Date(entry.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">
                          → {new Date(entry.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </div>
                      </td>
                      <td className="py-1.5 px-1.5 text-center">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-bold">
                          {entry.noOfDaysNoWknd} {entry.noOfDaysNoWknd === 1 ? 'day' : 'days'}
                        </span>
                      </td>
                      <td className="py-1.5 px-1.5">
                        <div className="text-[11px] text-gray-900 dark:text-gray-200 truncate" title={entry.reasonForAbsence}>{entry.reasonForAbsence}</div>
                        {entry.comment && (
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 italic truncate" title={entry.comment}>{entry.comment}</div>
                        )}
                      </td>
                      <td className="py-1.5 px-1.5 text-center">
                        <div className="text-[10px] text-gray-900 dark:text-gray-200">Wk {entry.weekNo || '-'}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">{entry.month || '-'} {entry.year ? String(entry.year).slice(-2) : '-'}</div>
                      </td>
                      <td className="py-1.5 px-1.5 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <Badge
                            variant="outline"
                            className={
                              entry.absenteeismAuthorised === 'Yes'
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-[10px] px-1 py-0'
                                : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-[10px] px-1 py-0'
                            }
                          >
                            {entry.absenteeismAuthorised === 'Yes' ? '✓Auth' : '⏱Pend'}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              entry.leaveFormSent === 'Yes'
                                ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-[10px] px-1 py-0'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] px-1 py-0'
                            }
                          >
                            {entry.leaveFormSent === 'Yes' ? '📄Sent' : '✗Form'}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-1.5 px-1">
                        <div className="flex flex-col gap-0.5 items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/50"
                            onClick={() => handleEdit(entry)}
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/50"
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

          {/* Pagination Controls */}
          {filteredEntries.length > 0 && (
            <div className="mt-6 flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing <span className="font-semibold text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {Math.min(endIndex, filteredEntries.length)}
                </span>{' '}
                of <span className="font-semibold text-gray-900 dark:text-white">{filteredEntries.length}</span> entries
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="h-8 px-3"
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          className={`h-8 w-8 p-0 ${
                            currentPage === page
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : ''
                          }`}
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="text-gray-400 px-1">...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="h-8 px-3"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedEntry && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Close modal if clicking the backdrop
            if (e.target === e.currentTarget) {
              setSelectedEntry(null);
            }
          }}
        >
          <Card className="w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="border-b dark:border-gray-700 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl text-gray-900 dark:text-white">{selectedEntry.nameOfAbsentee}</CardTitle>
                  <CardDescription className="text-sm dark:text-gray-400">{selectedEntry.client || 'TBD'} • {selectedEntry.country || 'ZW'}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={() => setSelectedEntry(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Absence Period */}
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Absence Period
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Start Date</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedEntry.startDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">End Date</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedEntry.endDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Week Starting</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedEntry.weekStart ? new Date(selectedEntry.weekStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Period</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      Wk {selectedEntry.weekNo || '-'} • {selectedEntry.month || '-'} {selectedEntry.year || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Days */}
              <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">{selectedEntry.noOfDays} <span className="text-lg font-normal text-purple-500">days</span></div>
              </div>

              {/* Reason */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Reason for Absence</h4>
                <p className="text-gray-900 dark:text-white">{selectedEntry.reasonForAbsence}</p>
                {selectedEntry.comment && (
                  <div className="mt-2 pt-2 border-t dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Comment:</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">{selectedEntry.comment}</p>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-lg p-3 text-center ${
                  selectedEntry.absenteeismAuthorised === 'Yes' 
                    ? 'bg-green-100 dark:bg-green-900/50' 
                    : 'bg-yellow-100 dark:bg-yellow-900/50'
                }`}>
                  <div className="text-lg">{selectedEntry.absenteeismAuthorised === 'Yes' ? '✅' : '⏱️'}</div>
                  <div className={`text-sm font-medium ${
                    selectedEntry.absenteeismAuthorised === 'Yes' 
                      ? 'text-green-800 dark:text-green-300' 
                      : 'text-yellow-800 dark:text-yellow-300'
                  }`}>
                    {selectedEntry.absenteeismAuthorised === 'Yes' ? 'Authorised' : 'Pending'}
                  </div>
                </div>
                <div className={`rounded-lg p-3 text-center ${
                  selectedEntry.leaveFormSent === 'Yes' 
                    ? 'bg-blue-100 dark:bg-blue-900/50' 
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <div className="text-lg">{selectedEntry.leaveFormSent === 'Yes' ? '📄' : '❌'}</div>
                  <div className={`text-sm font-medium ${
                    selectedEntry.leaveFormSent === 'Yes' 
                      ? 'text-blue-800 dark:text-blue-300' 
                      : 'text-gray-600 dark:text-gray-300'
                  }`}>
                    {selectedEntry.leaveFormSent === 'Yes' ? 'Form Sent' : 'No Form'}
                  </div>
                </div>
              </div>

              {/* Timestamp & CSP */}
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t dark:border-gray-700 flex justify-between">
                <span>CSP: {selectedEntry.csp || 'N/A'}</span>
                <span>
                  {selectedEntry.timeStamp 
                    ? `Recorded: ${new Date(selectedEntry.timeStamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : 'No timestamp'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    handleEdit(selectedEntry);
                    setSelectedEntry(null);
                  }}
                >
                  <Edit2 className="w-4 h-4 mr-2" /> Edit Entry
                </Button>
                <Button
                  variant="outline"
                  className="text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                  onClick={() => setSelectedEntry(null)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
