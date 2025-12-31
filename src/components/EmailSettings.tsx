import React, { useState, useEffect } from 'react';
import { Mail, Send, Clock, CheckCircle, Settings, Save, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';

interface EmailSettings {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  notifications: {
    newRequest: boolean;
    approval: boolean;
    rejection: boolean;
    upcomingLeave: boolean;
    pendingReminder: boolean;
  };
  digest: {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
    time: string;
    recipients: string[];
  };
}

const EmailSettingsComponent: React.FC = () => {
  const [settings, setSettings] = useState<EmailSettings>({
    enabled: false,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: 'noreply@company.com',
    fromName: 'Team Leave Management',
    notifications: {
      newRequest: true,
      approval: true,
      rejection: true,
      upcomingLeave: true,
      pendingReminder: true
    },
    digest: {
      enabled: true,
      frequency: 'daily',
      time: '09:00',
      recipients: []
    }
  });

  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/email/settings', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/email/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      
      if (response.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) return;
    
    setTestStatus('sending');
    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ to: testEmail })
      });
      
      if (response.ok) {
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        setTestStatus('error');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      setTestStatus('error');
    }
  };

  const sendDigestNow = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/email/digest', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        alert('Digest email sent successfully!');
      } else {
        alert('Failed to send digest email');
      }
    } catch (error) {
      console.error('Error sending digest:', error);
      alert('Error sending digest email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Email Settings</h2>
          <p className="text-muted-foreground">
            Configure automated email notifications and reminders
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saveStatus === 'saving'}>
          <Save className="h-4 w-4 mr-2" />
          {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : 'Save Settings'}
        </Button>
      </div>

      {/* SMTP Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            SMTP Configuration
          </CardTitle>
          <CardDescription>Configure your email server settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enabled">Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Send automated emails for PTO events</p>
            </div>
            <Switch
              id="enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smtpHost">SMTP Host</Label>
              <Input
                id="smtpHost"
                value={settings.smtpHost}
                onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <Label htmlFor="smtpPort">SMTP Port</Label>
              <Input
                id="smtpPort"
                type="number"
                value={settings.smtpPort}
                onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) })}
                placeholder="587"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smtpUser">SMTP Username</Label>
              <Input
                id="smtpUser"
                value={settings.smtpUser}
                onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                placeholder="user@company.com"
              />
            </div>
            <div>
              <Label htmlFor="smtpPassword">SMTP Password</Label>
              <Input
                id="smtpPassword"
                type="password"
                value={settings.smtpPassword}
                onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fromEmail">From Email</Label>
              <Input
                id="fromEmail"
                value={settings.fromEmail}
                onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
                placeholder="noreply@company.com"
              />
            </div>
            <div>
              <Label htmlFor="fromName">From Name</Label>
              <Input
                id="fromName"
                value={settings.fromName}
                onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
                placeholder="Team Leave Management"
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <Label htmlFor="testEmail">Test Email Configuration</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="testEmail"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1"
              />
              <Button onClick={sendTestEmail} disabled={!testEmail || testStatus === 'sending'}>
                <Send className="h-4 w-4 mr-2" />
                {testStatus === 'sending' ? 'Sending...' : testStatus === 'success' ? 'Sent!' : 'Send Test'}
              </Button>
            </div>
            {testStatus === 'success' && (
              <p className="text-sm text-green-600 mt-2">✓ Test email sent successfully!</p>
            )}
            {testStatus === 'error' && (
              <p className="text-sm text-red-600 mt-2">✗ Failed to send test email. Check your settings.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Types
          </CardTitle>
          <CardDescription>Choose which events trigger email notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>New PTO Request</Label>
              <p className="text-sm text-muted-foreground">Notify managers when CSPs submit new requests</p>
            </div>
            <Switch
              checked={settings.notifications.newRequest}
              onCheckedChange={(checked) => 
                setSettings({ 
                  ...settings, 
                  notifications: { ...settings.notifications, newRequest: checked }
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Request Approved</Label>
              <p className="text-sm text-muted-foreground">Notify CSPs when their request is approved</p>
            </div>
            <Switch
              checked={settings.notifications.approval}
              onCheckedChange={(checked) => 
                setSettings({ 
                  ...settings, 
                  notifications: { ...settings.notifications, approval: checked }
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Request Rejected</Label>
              <p className="text-sm text-muted-foreground">Notify CSPs when their request is rejected</p>
            </div>
            <Switch
              checked={settings.notifications.rejection}
              onCheckedChange={(checked) => 
                setSettings({ 
                  ...settings, 
                  notifications: { ...settings.notifications, rejection: checked }
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Upcoming Leave</Label>
              <p className="text-sm text-muted-foreground">Remind team 3 days before scheduled leave</p>
            </div>
            <Switch
              checked={settings.notifications.upcomingLeave}
              onCheckedChange={(checked) => 
                setSettings({ 
                  ...settings, 
                  notifications: { ...settings.notifications, upcomingLeave: checked }
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Pending Request Reminder</Label>
              <p className="text-sm text-muted-foreground">Remind managers about pending approvals after 48 hours</p>
            </div>
            <Switch
              checked={settings.notifications.pendingReminder}
              onCheckedChange={(checked) => 
                setSettings({ 
                  ...settings, 
                  notifications: { ...settings.notifications, pendingReminder: checked }
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Digest Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Digest Emails
          </CardTitle>
          <CardDescription>Automated summary emails for managers and HR</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Digest Emails</Label>
              <p className="text-sm text-muted-foreground">Send regular summary reports</p>
            </div>
            <Switch
              checked={settings.digest.enabled}
              onCheckedChange={(checked) => 
                setSettings({ 
                  ...settings, 
                  digest: { ...settings.digest, enabled: checked }
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <Select 
                value={settings.digest.frequency} 
                onValueChange={(value: 'daily' | 'weekly') => 
                  setSettings({ 
                    ...settings, 
                    digest: { ...settings.digest, frequency: value }
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="time">Send Time</Label>
              <Input
                id="time"
                type="time"
                value={settings.digest.time}
                onChange={(e) => 
                  setSettings({ 
                    ...settings, 
                    digest: { ...settings.digest, time: e.target.value }
                  })
                }
              />
            </div>
          </div>

          <div>
            <Label>Recipients</Label>
            <Input
              placeholder="manager@company.com, hr@company.com (comma-separated)"
              value={settings.digest.recipients.join(', ')}
              onChange={(e) => 
                setSettings({ 
                  ...settings, 
                  digest: { 
                    ...settings.digest, 
                    recipients: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  }
                })
              }
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter email addresses separated by commas
            </p>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={sendDigestNow} disabled={loading} variant="outline" className="w-full">
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Sending...' : 'Send Digest Now'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Templates Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
          <CardDescription>Preview of automated email notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Badge>New Request Template</Badge>
            <div className="bg-gray-50 p-4 rounded border text-sm">
              <p className="font-semibold">Subject: New PTO Request for [Team Member]</p>
              <p className="mt-2">Hello [Manager],</p>
              <p className="mt-2">[CSP Name] has submitted a PTO request on behalf of [Team Member]:</p>
              <ul className="mt-2 ml-4 list-disc">
                <li>Leave Type: [Type]</li>
                <li>Dates: [Start Date] to [End Date]</li>
                <li>Duration: [X] days</li>
              </ul>
              <p className="mt-2">Please review and approve/reject this request.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Badge>Approval Template</Badge>
            <div className="bg-gray-50 p-4 rounded border text-sm">
              <p className="font-semibold">Subject: PTO Request Approved for [Team Member]</p>
              <p className="mt-2">Hello [CSP],</p>
              <p className="mt-2">Your PTO request for [Team Member] has been approved:</p>
              <ul className="mt-2 ml-4 list-disc">
                <li>Leave Type: [Type]</li>
                <li>Dates: [Start Date] to [End Date]</li>
                <li>Duration: [X] days</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <Badge>Digest Template</Badge>
            <div className="bg-gray-50 p-4 rounded border text-sm">
              <p className="font-semibold">Subject: Daily PTO Summary - [Date]</p>
              <p className="mt-2">Hello Team,</p>
              <p className="mt-2">Here's your PTO summary for today:</p>
              <ul className="mt-2 ml-4 list-disc">
                <li>Pending Requests: [X]</li>
                <li>Approved Today: [X]</li>
                <li>Team Members On Leave: [X]</li>
                <li>Upcoming Leave (Next 7 Days): [X]</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailSettingsComponent;
