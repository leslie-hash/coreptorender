import React, { useState, useEffect, useRef } from 'react';
import { Download, FileText, CheckCircle, AlertCircle, Info, FileDown, Mail, Upload, X, Copy, Check, History, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { useAppContext } from '@/contexts/AppContext';
import { getApiUrl } from '@/utils/api';

interface FormMetadata {
  available: boolean;
  fileName?: string;
  sizeKB?: number;
  lastModified?: string;
  publicUrl?: string;
  message?: string;
}

export default function OfficialLeaveForm() {
  const [formMetadata, setFormMetadata] = useState<FormMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message?: string; requestId?: string; error?: string; validation?: any; validationErrors?: any[] } | null>(null);
  const [ptoBalance, setPtoBalance] = useState<{ annualPTO?: number; usedPTO?: number; remainingPTO?: number; remaining?: number; used?: number; clientName?: string } | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [copiedRequestId, setCopiedRequestId] = useState(false);
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [holidays, setHolidays] = useState<{ date: string; name: string; region: string }[]>([]);
  const { user, userRole } = useAppContext();
  
  // Check if user is a team member
  const isTeamMember = userRole === 'team-member' || (!userRole && user && !user.role);
  
  // Form data for generating pre-filled form - matching official LABOR_OUTSOURCING_LEAVE_APPLICATION_FORM
  const [formData, setFormData] = useState({
    // Team Member Information
    teamMemberName: '',
    department: 'GTS',
    
    // Leave Details
    leaveType: 'Annual',
    startDate: '',
    endDate: '',
    attachDoctorsNote: false,
    maternityEligibilityConfirmed: false,
    
    // Contactable Options
    address: '',
    phoneNumber: '',
    
    // Coverage Information
    coverageName: '',
    coveragePosition: '',
    coverageAware: 'Yes',
    
    // Signature
    signatureAcknowledge: false,
    
    // Legacy field
    reason: ''
  });

  // State for EDD document attachment (maternity leave)
  const [eddDocument, setEddDocument] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for Doctor's note attachment (sick leave)
  const [doctorsNoteDocument, setDoctorsNoteDocument] = useState<File | null>(null);
  const doctorsNoteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFormMetadata();
    fetchHolidays();
    // Auto-populate team member name if user is a team member
    if (isTeamMember && user?.name) {
      setFormData(prev => ({
        ...prev,
        teamMemberName: user.name
      }));
      // Fetch PTO balance for the user
      fetchPTOBalance(user.name);
    }
  }, [isTeamMember, user]);

  const fetchHolidays = async () => {
    try {
      const year = new Date().getFullYear();
      const response = await fetch(getApiUrl(`/api/holidays/${year}`), {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        setHolidays(data.holidays || []);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  // Fetch PTO balance when team member name changes
  useEffect(() => {
    if (formData.teamMemberName) {
      fetchPTOBalance(formData.teamMemberName);
      fetchLeaveHistory(formData.teamMemberName);
    }
  }, [formData.teamMemberName]);

  const fetchFormMetadata = async () => {
    try {
      const response = await fetch(getApiUrl('/api/leave-form/metadata'), {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });
      const data = await response.json();
      setFormMetadata(data);
    } catch (error) {
      console.error('Error fetching form metadata:', error);
      setFormMetadata({ available: false, message: 'Failed to check form availability' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPTOBalance = async (teamMemberName: string) => {
    if (!teamMemberName) return;
    
    setLoadingBalance(true);
    try {
      console.log('Fetching PTO balance for:', teamMemberName);
      const response = await fetch(getApiUrl(`/api/pto-balance/${encodeURIComponent(teamMemberName)}`), {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('PTO balance data:', data);
        setPtoBalance(data);
      } else {
        console.error('Failed to fetch PTO balance, status:', response.status);
        setPtoBalance(null);
      }
    } catch (error) {
      console.error('Error fetching PTO balance:', error);
      setPtoBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  };

  const copyRequestId = (requestId: string) => {
    navigator.clipboard.writeText(requestId).then(() => {
      setCopiedRequestId(true);
      setTimeout(() => setCopiedRequestId(false), 2000);
    });
  };

  const fetchLeaveHistory = async (teamMemberName: string) => {
    if (!teamMemberName) return;
    
    setLoadingHistory(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(getApiUrl('/api/leave-requests'), {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        const requests = data.data || data.requests || data;
        
        // Filter to only approved/completed requests for this team member
        const memberHistory = requests.filter((req: any) => 
          (req.teamMember === teamMemberName || req.teamMemberName === teamMemberName) &&
          (req.status === 'approved' || req.status === 'client-approved' || req.status === 'sent-to-payroll')
        );
        
        // Sort by date, most recent first
        memberHistory.sort((a: any, b: any) => 
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
        
        setLeaveHistory(memberHistory);
      }
    } catch (error) {
      console.error('Error fetching leave history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDownload = async () => {
    try {
      // Open download in new window
      window.open('http://localhost:4000/api/leave-form/download', '_blank');
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download form. Please try again.');
    }
  };



  const handleGenerateForm = async () => {
    // Validate required fields
    if (!formData.teamMemberName || !formData.startDate || !formData.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    setGenerating(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/api/leave-form/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          teamMember: formData.teamMemberName,
          leaveType: formData.leaveType,
          startDate: formData.startDate,
          endDate: formData.endDate,
          reason: formData.reason,
        }),
      });

      if (response.ok) {
        // Download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Leave_Form_${formData.teamMemberName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        alert('Pre-filled form generated and downloaded successfully!');
        
        // Reset form
        setFormData({
          teamMemberName: isTeamMember && user?.name ? user.name : '',
          department: 'GTS',
          leaveType: 'Annual',
          startDate: '',
          endDate: '',
          attachDoctorsNote: false,
          maternityEligibilityConfirmed: false,
          address: '',
          phoneNumber: '',
          coverageName: '',
          coveragePosition: '',
          coverageAware: 'Yes',
          signatureAcknowledge: false,
          reason: ''
        });
      } else {
        const error = await response.json();
        alert(`Failed to generate form: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Form generation error:', error);
      alert('Failed to generate form. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitLeaveRequest = async () => {
    // Validate required fields
    if (!formData.teamMemberName || !formData.startDate || !formData.endDate) {
      alert('Please fill in all required fields (Name, Start Date, End Date)');
      return;
    }

    // Validate 2-week advance notice
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(formData.startDate);
    startDate.setHours(0, 0, 0, 0);
    const daysInAdvance = Math.floor((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysInAdvance < 14) {
      alert('Leave requests must be submitted at least 2 weeks (14 days) in advance of your start date.\n\nThis allows sufficient time for approval processing. Please select a start date that is at least 2 weeks from today.');
      return;
    }

    // Validate maternity leave eligibility confirmation
    if (formData.leaveType === 'Maternity' && !formData.maternityEligibilityConfirmed) {
      alert('For maternity leave, you must first notify your CSP and receive eligibility confirmation before submitting this form.\n\nPlease check the confirmation box once you have received approval from your CSP.');
      return;
    }

    // Validate maternity leave requires EDD document
    if (formData.leaveType === 'Maternity' && !eddDocument) {
      alert('For maternity leave, you must upload your doctor\'s letter confirming your Expected Date of Delivery (EDD).');
      return;
    }

    // Validate sick leave requires medical certificate (always required)
    if (formData.leaveType === 'Sick Leave' && !doctorsNoteDocument) {
      alert('A medical certificate is required for all sick leave requests.\n\nPlease upload your medical certificate from your healthcare provider.');
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);
    setCopiedRequestId(false); // Reset copy state

    try {
      // Calculate days
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      let days = 0;
      const current = new Date(start);
      
      while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
          days++;
        }
        current.setDate(current.getDate() + 1);
      }

      // Submit leave request through the official PTO workflow
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/api/submit-leave-request'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          teamMember: formData.teamMemberName,
          department: formData.department,
          leaveType: formData.leaveType,
          startDate: formData.startDate,
          endDate: formData.endDate,
          days: days,
          attachDoctorsNote: formData.attachDoctorsNote,
          address: formData.address,
          phoneNumber: formData.phoneNumber,
          coverageName: formData.coverageName,
          coveragePosition: formData.coveragePosition,
          coverageAware: formData.coverageAware,
          reason: formData.reason,
          submittedBy: user?.name || formData.teamMemberName,
          submissionMethod: 'official-form',
          // Signature information
          applicantSignature: {
            signed: true,
            name: formData.teamMemberName,
            date: new Date().toISOString(),
          }
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitResult({
          success: true,
          ...result
        });

        // Reset form on success
        setFormData({
          teamMemberName: isTeamMember && user?.name ? user.name : '',
          department: 'GTS',
          leaveType: 'Annual',
          startDate: '',
          endDate: '',
          attachDoctorsNote: false,
          maternityEligibilityConfirmed: false,
          address: '',
          phoneNumber: '',
          coverageName: '',
          coveragePosition: '',
          coverageAware: 'Yes',
          signatureAcknowledge: false,
          reason: ''
        });
      } else {
        setSubmitResult({
          success: false,
          error: result.error || 'Submission failed',
          validationErrors: result.validationErrors || []
        });
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitResult({
        success: false,
        error: 'Failed to submit leave request. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <FileText className="w-5 h-5" />
            Official Leave Application Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground dark:text-gray-400">Loading form information...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* PTO Balance Card */}
      <Card className="w-full border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-blue-900 dark:text-blue-300">Your PTO Balance</CardTitle>
          <CardDescription className="text-xs text-blue-700 dark:text-blue-400 mt-1">
            Based on Client PTO allocation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingBalance ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">Loading PTO balance...</p>
          ) : ptoBalance ? (
            ptoBalance.annualPTO !== undefined ? (
              // Show only Used and Remaining for all users
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700">
                  <p className="text-sm text-orange-600 dark:text-orange-400 mb-2 font-semibold">Used</p>
                  <p className="text-4xl font-bold text-orange-700 dark:text-orange-300">{ptoBalance.usedPTO}</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">days</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                  <p className="text-sm text-green-600 dark:text-green-400 mb-2 font-semibold">Remaining</p>
                  <p className="text-4xl font-bold text-green-700 dark:text-green-300">{ptoBalance.remainingPTO}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">days</p>
                </div>
              </div>
            ) : (
              // Simplified view for team members - only used and remaining
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700">
                  <p className="text-sm text-orange-600 dark:text-orange-400 mb-2 font-semibold">Used</p>
                  <p className="text-4xl font-bold text-orange-700 dark:text-orange-300">{ptoBalance.used || 0}</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">days</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                  <p className="text-sm text-green-600 dark:text-green-400 mb-2 font-semibold">Remaining</p>
                  <p className="text-4xl font-bold text-green-700 dark:text-green-300">{ptoBalance.remainingPTO || ptoBalance.remaining || 0}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">days</p>
                </div>
              </div>
            )
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">PTO balance not available</p>
          )}
        </CardContent>
      </Card>

      {/* PTO History Section */}
      {isTeamMember && leaveHistory.length > 0 && (
        <Card className="w-full border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30">
          <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
            <CardTitle className="text-base text-purple-900 dark:text-purple-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5" />
                PTO History
              </div>
              <Badge variant="secondary" className="bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100">
                {leaveHistory.length} {leaveHistory.length === 1 ? 'record' : 'records'}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-purple-700 dark:text-purple-400 mt-1">
              {showHistory ? 'Click to hide' : 'Click to view'} your approved leave history
            </CardDescription>
          </CardHeader>
          
          {showHistory && (
            <CardContent className="space-y-3">
              {leaveHistory.slice(0, 5).map((request, index) => (
                <div key={request.id || index} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-purple-200 dark:border-purple-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="font-semibold text-sm text-gray-900 dark:text-white">
                          {new Date(request.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {request.endDate && request.startDate !== request.endDate && (
                            <> - {new Date(request.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-purple-700 dark:text-purple-300">{request.leaveType || 'Leave'}</span>
                        <span>•</span>
                        <span>{request.days || 1} {request.days === 1 ? 'day' : 'days'}</span>
                        {request.reason && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px]" title={request.reason}>{request.reason}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 text-xs">
                      Approved
                    </Badge>
                  </div>
                </div>
              ))}
              
              {leaveHistory.length > 5 && (
                <p className="text-xs text-center text-purple-600 dark:text-purple-400 pt-2">
                  Showing 5 most recent records out of {leaveHistory.length} total
                </p>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Generate Pre-Filled Form Section */}
      <Card className="w-full dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-white">
            <FileDown className="w-5 h-5" />
            Leave Application Form
          </CardTitle>
          <CardDescription className="text-blue-100">
            Labor Outsourcing - Official Leave Request Form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          
          {/* Section 1: Team Member Information */}
          <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b dark:border-gray-600">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Team Member Information</h4>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teamMemberName" className="dark:text-gray-300">Name *</Label>
                <Input
                  id="teamMemberName"
                  placeholder="Enter full name"
                  value={formData.teamMemberName}
                  onChange={(e) => setFormData({ ...formData, teamMemberName: e.target.value })}
                  disabled={isTeamMember}
                  className={isTeamMember ? 'bg-gray-100 dark:bg-gray-700' : 'dark:bg-gray-700 dark:border-gray-600 dark:text-white'}
                />
                {isTeamMember && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Your name is automatically filled</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="department" className="dark:text-gray-300">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Type of Leave */}
          <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b dark:border-gray-600">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Type of Leave *</h4>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-3">
                {(isTeamMember ? ['Annual', 'Compassionate', 'Maternity', 'Sick Leave'] : ['Annual', 'Compassionate', 'Maternity', 'Sick Leave', 'AWOL']).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, leaveType: type, attachDoctorsNote: type === 'Sick Leave' ? formData.attachDoctorsNote : false })}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                      formData.leaveType === type
                        ? type === 'AWOL' 
                          ? 'border-red-600 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                          : 'border-blue-600 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              
              {/* AWOL Notice */}
              {formData.leaveType === 'AWOL' && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-2">🚨 AWOL (Absent Without Leave)</p>
                    <ul className="text-xs text-red-800 dark:text-red-300 space-y-1 list-disc list-inside">
                      <li>Use this when a team member fails to show up without notice</li>
                      <li>Team member has not responded to communication attempts</li>
                      <li>This will be flagged for HR review and disciplinary process</li>
                      <li>Days marked as AWOL are unpaid unless later justified</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {formData.leaveType === 'Sick Leave' && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">📋 Sick Leave Policy</p>
                    <ul className="text-xs text-yellow-800 dark:text-yellow-300 space-y-1 list-disc list-inside">
                      <li>Up to 90 days per year available</li>
                      <li>Can be taken separately or consecutively</li>
                      <li>Days do not carry over to the next year</li>
                      <li>Medical certificate is required for all sick leave</li>
                    </ul>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-700">
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-800/50 rounded border border-yellow-300 dark:border-yellow-700">
                      <p className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">📎 Upload Medical Certificate (Required)</p>
                      
                      <input
                        ref={doctorsNoteInputRef}
                        type="file"
                        id="doctorsNoteDocument"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setDoctorsNoteDocument(file);
                        }}
                        className="hidden"
                      />
                      
                      {!doctorsNoteDocument ? (
                        <button
                          type="button"
                          onClick={() => doctorsNoteInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Medical Certificate
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 p-2 bg-white dark:bg-gray-700 rounded border border-yellow-300 dark:border-yellow-600">
                          <FileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                            {doctorsNoteDocument.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setDoctorsNoteDocument(null);
                              if (doctorsNoteInputRef.current) {
                                doctorsNoteInputRef.current.value = '';
                              }
                            }}
                            className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                        Accepted formats: PDF, DOC, DOCX, JPG, PNG
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {formData.leaveType === 'Compassionate' && (
                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-2">💜 Compassionate Leave Policy</p>
                    <ul className="text-xs text-purple-800 dark:text-purple-300 space-y-1 list-disc list-inside">
                      <li>Up to 10 days available per year</li>
                      <li>Granted for bereavement or family emergencies</li>
                      <li>Contact your CSP for approval</li>
                    </ul>
                  </div>
                </div>
              )}
              {formData.leaveType === 'Maternity' && (
                <div className="mt-4 p-4 bg-pink-50 dark:bg-pink-900/30 rounded-lg border border-pink-200 dark:border-pink-800">
                  <h5 className="font-semibold text-pink-800 dark:text-pink-300 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Maternity Leave - Important Steps
                  </h5>
                  
                  <div className="space-y-3 text-sm text-pink-900 dark:text-pink-200">
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded border border-yellow-300 dark:border-yellow-700">
                      <p className="font-semibold text-yellow-800 dark:text-yellow-300">⚠️ Before completing this form:</p>
                      <p className="text-yellow-700 dark:text-yellow-400 mt-1">Have you notified your CSP and received eligibility confirmation?</p>
                    </div>
                    
                    <p className="font-medium">📌 Steps to follow:</p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                      <li><span className="font-semibold">First:</span> Contact your CSP to notify them of your pregnancy, due date, and preferred leave start date <span className="text-pink-600 dark:text-pink-400">(at least 4 months before your due date)</span>.</li>
                      <li><span className="font-semibold">Wait:</span> Your CSP will confirm your eligibility and entitled leave days.</li>
                      <li><span className="font-semibold">Then:</span> Once confirmed eligible, return here to complete this form.</li>
                    </ol>
                    
                    <div className="mt-4 p-3 bg-pink-100 dark:bg-pink-800/50 rounded border border-pink-300 dark:border-pink-700">
                      <p className="font-medium mb-2">📎 Required: Doctor's letter confirming your Expected Date of Delivery (EDD)</p>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="eddDocument"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setEddDocument(file);
                        }}
                        className="hidden"
                      />
                      
                      {!eddDocument ? (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          Upload EDD Document
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 p-2 bg-white dark:bg-gray-700 rounded border border-pink-300 dark:border-pink-600">
                          <FileText className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                            {eddDocument.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEddDocument(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      
                      <p className="text-xs text-pink-600 dark:text-pink-400 mt-2">
                        Accepted formats: PDF, DOC, DOCX, JPG, PNG
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4 p-2 bg-green-50 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-700">
                      <input
                        type="checkbox"
                        id="maternityEligibilityConfirmed"
                        checked={formData.maternityEligibilityConfirmed || false}
                        onChange={(e) => setFormData({ ...formData, maternityEligibilityConfirmed: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <Label htmlFor="maternityEligibilityConfirmed" className="text-green-800 dark:text-green-300 text-sm">
                        I have notified my CSP and received eligibility confirmation
                      </Label>
                    </div>
                    
                    <p className="text-xs text-pink-600 dark:text-pink-400 mt-2">
                      ℹ️ Standard maternity leave is 98 days. Your CSP will handle all client communication and coordination.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Leave Period */}
          <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b dark:border-gray-600">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Leave Period</h4>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="dark:text-gray-300">Request From *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="dark:text-gray-300">To *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-gray-300">No. of Days</Label>
                  <div className="h-10 flex items-center px-3 bg-gray-100 dark:bg-gray-700 rounded-md border dark:border-gray-600">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formData.startDate && formData.endDate ? (() => {
                        const start = new Date(formData.startDate);
                        const end = new Date(formData.endDate);
                      let days = 0;
                      const current = new Date(start);
                      while (current <= end) {
                        const dayOfWeek = current.getDay();
                        if (dayOfWeek !== 0 && dayOfWeek !== 6) days++;
                        current.setDate(current.getDate() + 1);
                      }
                      return `${days} ${days === 1 ? 'day' : 'days'}`;
                    })() : '0 days'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Holidays Warning */}
              {holidays.length > 0 && (() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const endDate = new Date(today);
                endDate.setDate(endDate.getDate() + 90); // Next 90 days
                
                const upcomingHolidays = holidays
                  .filter(h => {
                    const holidayDate = new Date(h.date);
                    return holidayDate >= today && holidayDate <= endDate;
                  })
                  .sort((a, b) => {
                    const dateA = new Date(a.date).getTime();
                    const dateB = new Date(b.date).getTime();
                    // First sort by date
                    if (dateA !== dateB) return dateA - dateB;
                    // If same date, prioritize Zimbabwe holidays
                    if (a.region === 'zimbabwe' && b.region !== 'zimbabwe') return -1;
                    if (a.region !== 'zimbabwe' && b.region === 'zimbabwe') return 1;
                    return 0;
                  })
                  .slice(0, 5);
                
                if (upcomingHolidays.length > 0) {
                  return (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h5 className="font-semibold text-blue-900 dark:text-blue-200 text-sm mb-2">
                            📅 Upcoming Holidays - Next 90 Days
                          </h5>
                          <div className="space-y-2">
                            {upcomingHolidays.map((holiday, idx) => {
                              const holidayDate = new Date(holiday.date);
                              const regionFlag = holiday.region === 'zimbabwe' ? '🇿🇼' : '🇺🇸';
                              const regionLabel = holiday.region === 'zimbabwe' ? 'ZW' : 'US';
                              return (
                                <div key={idx} className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 p-2 rounded border border-blue-200 dark:border-blue-700">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{regionFlag}</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{holiday.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600 text-xs">
                                      {regionLabel}
                                    </Badge>
                                    <span className="text-gray-600 dark:text-gray-400 text-xs">
                                      {holidayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Section 4: Contactable Options */}
          <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b dark:border-gray-600">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Contactable Options</h4>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="dark:text-gray-300">Address</Label>
                <Input
                  id="address"
                  placeholder="Enter address while on leave"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="dark:text-gray-300">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  placeholder="Enter contact number"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Coverage */}
          <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b dark:border-gray-600">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Coverage (Who will handle your responsibilities)</h4>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coverageName" className="dark:text-gray-300">Team Member Name</Label>
                <Input
                  id="coverageName"
                  placeholder="Enter coverage person's name"
                  value={formData.coverageName}
                  onChange={(e) => setFormData({ ...formData, coverageName: e.target.value })}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coveragePosition" className="dark:text-gray-300">Position</Label>
                <Input
                  id="coveragePosition"
                  placeholder="Enter position"
                  value={formData.coveragePosition}
                  onChange={(e) => setFormData({ ...formData, coveragePosition: e.target.value })}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Is the Team Member Aware?</Label>
                <div className="flex gap-4 h-10 items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="coverageAware"
                      value="Yes"
                      checked={formData.coverageAware === 'Yes'}
                      onChange={(e) => setFormData({ ...formData, coverageAware: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-900 dark:text-white">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="coverageAware"
                      value="No"
                      checked={formData.coverageAware === 'No'}
                      onChange={(e) => setFormData({ ...formData, coverageAware: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-900 dark:text-white">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: Additional Notes */}
          <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b dark:border-gray-600">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Additional Notes (Optional)</h4>
            </div>
            <div className="p-4">
              <Textarea
                id="reason"
                placeholder="Enter any additional notes or reason for leave"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
          </div>

          {/* Section 7: Applicant Signature/Acknowledgment */}
          <div className="border dark:border-gray-700 rounded-lg overflow-hidden border-blue-300 dark:border-blue-700">
            <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 border-b dark:border-blue-700">
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-sm">✍️ Applicant Signature</h4>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <input
                  type="checkbox"
                  id="signatureAcknowledge"
                  checked={formData.signatureAcknowledge || false}
                  onChange={(e) => setFormData({ ...formData, signatureAcknowledge: e.target.checked })}
                  className="w-5 h-5 mt-0.5 text-blue-600 rounded"
                />
                <label htmlFor="signatureAcknowledge" className="text-sm text-gray-700 dark:text-gray-300">
                  I, <strong className="text-gray-900 dark:text-white">{formData.teamMemberName || '[Your Name]'}</strong>, hereby confirm that the information provided in this leave application is accurate and complete. I understand that this submission serves as my electronic signature and consent for this leave request to be processed.
                </label>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Applicant Name</label>
                  <p className="font-semibold text-gray-900 dark:text-white">{formData.teamMemberName || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date of Signature</label>
                  <p className="font-semibold text-gray-900 dark:text-white">{new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              onClick={handleSubmitLeaveRequest}
              disabled={submitting || !formData.teamMemberName || !formData.startDate || !formData.endDate || !formData.signatureAcknowledge}
              className="w-full"
              size="lg"
              variant="default"
            >
              {submitting ? (
                <>Processing...</>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Leave Request
                </>
              )}
            </Button>

            <Button 
              onClick={handleGenerateForm}
              disabled={generating || !formData.teamMemberName || !formData.startDate || !formData.endDate}
              className="w-full"
              size="lg"
              variant="outline"
            >
              {generating ? (
                <>Generating...</>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  Download Pre-Filled Form
                </>
              )}
            </Button>
          </div>

          {submitResult && (
            <Alert className={submitResult.success ? 'border-green-500 bg-green-50 dark:bg-green-900/30 dark:border-green-700' : 'border-red-500 bg-red-50 dark:bg-red-900/30 dark:border-red-700'}>
              {submitResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <AlertDescription>
                {submitResult.success ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-green-800 dark:text-green-300">
                      ✅ Leave request submitted successfully!
                    </p>
                    <div className="text-sm text-green-700 dark:text-green-400 space-y-1">
                      <div className="bg-green-100 dark:bg-green-800/40 p-3 rounded-lg border border-green-300 dark:border-green-600">
                        <p className="text-xs font-semibold text-green-600 dark:text-green-300 mb-1">YOUR REQUEST ID (Auto-Generated)</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold text-green-800 dark:text-green-200 font-mono tracking-wider flex-1">{submitResult.requestId}</p>
                          <button
                            onClick={() => copyRequestId(submitResult.requestId!)}
                            className="p-2 bg-green-200 dark:bg-green-700 hover:bg-green-300 dark:hover:bg-green-600 rounded-md transition-colors"
                            title="Copy Request ID"
                          >
                            {copiedRequestId ? (
                              <Check className="w-4 h-4 text-green-800 dark:text-green-200" />
                            ) : (
                              <Copy className="w-4 h-4 text-green-800 dark:text-green-200" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          {copiedRequestId ? '✓ Copied to clipboard!' : 'Click to copy this ID to track your request'}
                        </p>
                      </div>
                      <p><strong>Status:</strong> Ready for CSP Review</p>
                      {submitResult.validation && (
                        <p className="text-xs">
                          ✓ Validated: {submitResult.validation.days} business days, 
                          {submitResult.validation.balance?.remainingPTO} days remaining
                        </p>
                      )}
                      <p className="text-xs mt-2 pt-2 border-t border-green-300 dark:border-green-700">
                        <strong>Next Steps:</strong><br />
                        1️⃣ CSP will review and validate<br />
                        2️⃣ Request forwarded to client for approval<br />
                        3️⃣ Payroll notified upon approval<br />
                        4️⃣ Records updated in Absenteeism tracker
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-semibold text-red-800 dark:text-red-300">
                      ❌ {submitResult.error}
                    </p>
                    {submitResult.validationErrors && submitResult.validationErrors.length > 0 && (
                      <ul className="text-sm text-red-700 dark:text-red-400 list-disc list-inside">
                        {submitResult.validationErrors.map((err: string, idx: number) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Workflow Status Section */}
      {submitResult?.success && (
        <Card className="w-full border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30">
          <CardHeader>
            <CardTitle className="text-base text-green-800 dark:text-green-300">5-Step PTO Workflow Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white font-bold text-sm">
                  ✓
                </div>
                <div className="flex-1">
                  <p className="font-medium text-green-800 dark:text-green-300">1. Request Received</p>
                  <p className="text-sm text-green-600 dark:text-green-400">Leave request submitted and validated</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                    <Mail className="h-3 w-3" />
                    <span>Confirmation email sent to team member</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500 text-white font-bold text-sm">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800 dark:text-gray-200">2. CSP Review (Current)</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Checking PTO balance and parameters</p>
                  <Badge className="mt-1 bg-yellow-500">In Progress</Badge>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 font-bold text-sm">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-500 dark:text-gray-400">3. Approval Status</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Pending CSP review completion</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <Mail className="h-3 w-3" />
                    <span>Email will be sent for approval</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 font-bold text-sm">
                  4
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-500 dark:text-gray-400">4. Approval Notifications</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Email notifications after client approval</p>
                  <div className="mt-1 space-y-0.5">
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      <Mail className="h-3 w-3" />
                      <span>Team member (approval confirmation)</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      <Mail className="h-3 w-3" />
                      <span>Payroll department (for processing)</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 font-bold text-sm">
                  5
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-500 dark:text-gray-400">5. Update Records</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Absenteeism tracker will be updated</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Query / Message CSP Component */}
      {isTeamMember && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Have Questions About Your Leave Request?
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              Send a quick message to your CSP about leave request queries or concerns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeaveQueryMessaging defaultRequestId={submitResult?.requestId} />
          </CardContent>
        </Card>
      )}

    </div>
  );
}

// Simple Leave Query Messaging Component
function LeaveQueryMessaging({ defaultRequestId }: { defaultRequestId?: string }) {
  const [message, setMessage] = useState('');
  const [requestId, setRequestId] = useState(defaultRequestId || '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { user } = useAppContext();

  // Update requestId when defaultRequestId changes (after form submission)
  useEffect(() => {
    if (defaultRequestId) {
      setRequestId(defaultRequestId);
    }
  }, [defaultRequestId]);

  const handleSendQuery = async () => {
    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }

    setSending(true);
    setSent(false);

    try {
      const response = await fetch(getApiUrl('/api/leave-queries'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: requestId || 'general',
          teamMember: user?.name || 'Unknown',
          message: message,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setSent(true);
        setMessage('');
        setTimeout(() => setSent(false), 3000);
      } else {
        alert('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending query:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="requestId" className="dark:text-gray-300">Request ID (Optional)</Label>
        <Input
          id="requestId"
          type="text"
          placeholder="Enter Request ID if asking about specific request"
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
          className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
      </div>

      <div>
        <Label htmlFor="queryMessage" className="dark:text-gray-300">Your Message to CSP</Label>
        <Textarea
          id="queryMessage"
          placeholder="Example: When will my leave request be reviewed? Can I change my dates?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
      </div>

      {sent && (
        <Alert className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-300">
            ✓ Message sent to your CSP! They will respond shortly.
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleSendQuery}
        disabled={sending || !message.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {sending ? 'Sending...' : 'Send Message to CSP'}
      </Button>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        💡 Your CSP will receive this message and can respond via email or the system
      </p>
    </div>
  );
}
