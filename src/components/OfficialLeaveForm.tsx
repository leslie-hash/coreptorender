import React, { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle, AlertCircle, Info, FileDown } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { useAppContext } from '@/contexts/AppContext';

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
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message?: string; requestId?: string } | null>(null);
  const [ptoBalance, setPtoBalance] = useState<{ annualPTO: number; usedPTO: number; remainingPTO: number } | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const { user, userRole } = useAppContext();
  
  // Check if user is a team member
  const isTeamMember = userRole === 'team-member' || (!userRole && user && !user.role);
  
  // Form data for generating pre-filled form
  const [formData, setFormData] = useState({
    teamMemberName: '',
    leaveType: 'Annual Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    fetchFormMetadata();
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

  // Fetch PTO balance when team member name changes
  useEffect(() => {
    if (formData.teamMemberName) {
      fetchPTOBalance(formData.teamMemberName);
    }
  }, [formData.teamMemberName]);

  const fetchFormMetadata = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/leave-form/metadata');
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
      const response = await fetch(`http://localhost:4000/api/pto-balance/${encodeURIComponent(teamMemberName)}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setPtoBalance(data);
      } else {
        console.error('Failed to fetch PTO balance');
        setPtoBalance(null);
      }
    } catch (error) {
      console.error('Error fetching PTO balance:', error);
      setPtoBalance(null);
    } finally {
      setLoadingBalance(false);
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
      const response = await fetch('/api/leave-form/generate', {
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
          teamMemberName: '',
          leaveType: 'Annual Leave',
          startDate: '',
          endDate: '',
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

    setSubmitting(true);
    setSubmitResult(null);

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
      const response = await fetch('/api/submit-leave-request', {
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
          days: days,
          submittedBy: user?.name || formData.teamMemberName,
          submissionMethod: 'official-form'
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
          teamMemberName: '',
          leaveType: 'Annual Leave',
          startDate: '',
          endDate: '',
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
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Official Leave Application Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading form information...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* PTO Balance Card */}
      {ptoBalance && (
        <Card className="w-full border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-900">Your PTO Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-blue-600 mb-1">Annual PTO</p>
                <p className="text-2xl font-bold text-blue-900">{ptoBalance.annualPTO}</p>
                <p className="text-xs text-blue-600">days</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-orange-600 mb-1">Used</p>
                <p className="text-2xl font-bold text-orange-700">{ptoBalance.usedPTO}</p>
                <p className="text-xs text-orange-600">days</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-green-600 mb-1">Remaining</p>
                <p className="text-2xl font-bold text-green-700">{ptoBalance.remainingPTO}</p>
                <p className="text-xs text-green-600">days</p>
              </div>
            </div>
            
            {/* Visual progress bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all ${
                    ptoBalance.remainingPTO > 10 ? 'bg-green-500' : 
                    ptoBalance.remainingPTO > 5 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${(ptoBalance.remainingPTO / ptoBalance.annualPTO) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-center text-gray-600 mt-1">
                {Math.round((ptoBalance.remainingPTO / ptoBalance.annualPTO) * 100)}% remaining
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loadingBalance && (
        <Card className="w-full border-gray-200">
          <CardContent className="py-4">
            <p className="text-sm text-gray-600 text-center">Loading PTO balance...</p>
          </CardContent>
        </Card>
      )}

      {/* Generate Pre-Filled Form Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            Submit Leave Request
          </CardTitle>
          <CardDescription>
            Fill in your leave details below to submit your request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teamMemberName">Team Member Name *</Label>
              <Input
                id="teamMemberName"
                placeholder="Enter full name"
                value={formData.teamMemberName}
                onChange={(e) => setFormData({ ...formData, teamMemberName: e.target.value })}
                disabled={isTeamMember}
                className={isTeamMember ? 'bg-gray-100' : ''}
              />
              {isTeamMember && (
                <p className="text-xs text-gray-500">Your name is automatically filled</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaveType">Leave Type *</Label>
              <Select
                value={formData.leaveType}
                onValueChange={(value) => setFormData({ ...formData, leaveType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                  <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                  <SelectItem value="Maternity Leave">Maternity Leave</SelectItem>
                  <SelectItem value="Bereavement Leave">Bereavement Leave</SelectItem>
                  <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="reason">Reason for Leave</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for leave request"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              onClick={handleSubmitLeaveRequest}
              disabled={submitting || !formData.teamMemberName || !formData.startDate || !formData.endDate}
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
            <Alert className={submitResult.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
              {submitResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                {submitResult.success ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-green-800">
                      ✅ Leave request submitted successfully!
                    </p>
                    <div className="text-sm text-green-700 space-y-1">
                      <p><strong>Request ID:</strong> {submitResult.requestId}</p>
                      <p><strong>Status:</strong> Ready for CSP Review</p>
                      {submitResult.validation && (
                        <p className="text-xs">
                          ✓ Validated: {submitResult.validation.days} business days, 
                          {submitResult.validation.balance?.remainingPTO} days remaining
                        </p>
                      )}
                      <p className="text-xs mt-2 pt-2 border-t border-green-300">
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
                    <p className="font-semibold text-red-800">
                      ❌ {submitResult.error}
                    </p>
                    {submitResult.validationErrors && submitResult.validationErrors.length > 0 && (
                      <ul className="text-sm text-red-700 list-disc list-inside">
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

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs space-y-2">
              <p><strong>Two Options Available:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Submit Leave Request:</strong> Directly enters the 5-step approval workflow 
                (CSP Review → Client Approval → Payroll Notification → Records Update)</li>
                <li><strong>Download Pre-Filled Form:</strong> Generate DOCX for printing, signing, 
                or record-keeping purposes</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Workflow Status Section */}
      {submitResult?.success && (
        <Card className="w-full border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-base text-green-800">5-Step PTO Workflow Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white font-bold text-sm">
                  ✓
                </div>
                <div className="flex-1">
                  <p className="font-medium text-green-800">1. Request Received</p>
                  <p className="text-sm text-green-600">Leave request submitted and validated</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500 text-white font-bold text-sm">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">2. CSP Review (Current)</p>
                  <p className="text-sm text-gray-600">Checking PTO balance and parameters</p>
                  <Badge className="mt-1 bg-yellow-500">In Progress</Badge>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-300 text-gray-600 font-bold text-sm">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-500">3. Client Approval</p>
                  <p className="text-sm text-gray-400">Pending CSP review completion</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-300 text-gray-600 font-bold text-sm">
                  4
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-500">4. Payroll Notification</p>
                  <p className="text-sm text-gray-400">Will notify after approval</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-300 text-gray-600 font-bold text-sm">
                  5
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-500">5. Update Records</p>
                  <p className="text-sm text-gray-400">Absenteeism tracker will be updated</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Query / Message CSP Component */}
      {isTeamMember && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Have Questions About Your Leave Request?
            </CardTitle>
            <CardDescription>
              Send a quick message to your CSP about leave request queries or concerns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeaveQueryMessaging />
          </CardContent>
        </Card>
      )}

    </div>
  );
}

// Simple Leave Query Messaging Component
function LeaveQueryMessaging() {
  const [message, setMessage] = useState('');
  const [requestId, setRequestId] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { user } = useAppContext();

  const handleSendQuery = async () => {
    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }

    setSending(true);
    setSent(false);

    try {
      const response = await fetch('/api/leave-queries', {
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
        <Label htmlFor="requestId">Request ID (Optional)</Label>
        <Input
          id="requestId"
          type="text"
          placeholder="Enter Request ID if asking about specific request"
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="queryMessage">Your Message to CSP</Label>
        <Textarea
          id="queryMessage"
          placeholder="Example: When will my leave request be reviewed? Can I change my dates?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="mt-1"
        />
      </div>

      {sent && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
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

      <p className="text-xs text-gray-500 text-center">
        💡 Your CSP will receive this message and can respond via email or the system
      </p>
    </div>
  );
}
