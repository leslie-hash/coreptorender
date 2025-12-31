import React, { useState, useEffect } from 'react';
import { Zap, Download, Calendar, Send, Check, ExternalLink, FileSpreadsheet, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';

interface IntegrationSettings {
  slack: {
    enabled: boolean;
    webhookUrl: string;
    notifyOnSubmit: boolean;
    notifyOnApproval: boolean;
    notifyOnRejection: boolean;
  };
  googleSheets: {
    enabled: boolean;
    spreadsheetId: string;
    autoSync: boolean;
  };
}

const IntegrationsHub: React.FC = () => {
  const [settings, setSettings] = useState<IntegrationSettings>({
    slack: {
      enabled: false,
      webhookUrl: '',
      notifyOnSubmit: true,
      notifyOnApproval: true,
      notifyOnRejection: true
    },
    googleSheets: {
      enabled: false,
      spreadsheetId: '',
      autoSync: false
    }
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success'>('idle');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/integrations/settings', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching integration settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/integrations/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      
      if (response.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const testSlackWebhook = async () => {
    if (!settings.slack.webhookUrl) return;
    
    setTestStatus('testing');
    try {
      const response = await fetch('/api/integrations/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ webhookUrl: settings.slack.webhookUrl })
      });
      
      if (response.ok) {
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        setTestStatus('error');
      }
    } catch (error) {
      console.error('Error testing Slack:', error);
      setTestStatus('error');
    }
  };

  const exportToGoogleSheets = async () => {
    setExportStatus('exporting');
    try {
      const response = await fetch('/api/export/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ spreadsheetId: settings.googleSheets.spreadsheetId })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Successfully prepared ${data.exported} records for export!`);
        setExportStatus('success');
        setTimeout(() => setExportStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Export failed. Check console for details.');
    }
  };

  const downloadCSV = async (type: 'leave_requests' | 'team_members') => {
    try {
      const response = await fetch(`/api/export/csv?type=${type}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Error downloading CSV:', error);
    }
  };

  const downloadICalFeed = async () => {
    try {
      const response = await fetch('/api/calendar/ical', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'team_pto_calendar.ics';
        a.click();
        alert('Calendar file downloaded! Import it into your calendar app.');
      }
    } catch (error) {
      console.error('Error downloading iCal:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Integrations Hub</h2>
          <p className="text-muted-foreground">
            Connect with Slack, Google Sheets, and export data
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saveStatus === 'saving'}>
          {saveStatus === 'success' ? <Check className="h-4 w-4 mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
          {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : 'Save Settings'}
        </Button>
      </div>

      {/* Slack Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle>Slack Integration</CardTitle>
                <CardDescription>Real-time notifications in your Slack workspace</CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.slack.enabled}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, slack: { ...settings.slack, enabled: checked }})
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input
              id="webhookUrl"
              value={settings.slack.webhookUrl}
              onChange={(e) => 
                setSettings({ ...settings, slack: { ...settings.slack, webhookUrl: e.target.value }})
              }
              placeholder="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Get your webhook URL from{' '}
              <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                Slack API
                <ExternalLink className="inline h-3 w-3 ml-1" />
              </a>
            </p>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <h4 className="font-medium text-sm">Notification Events</h4>
            
            <div className="flex items-center justify-between">
              <Label className="font-normal">New PTO request submitted</Label>
              <Switch
                checked={settings.slack.notifyOnSubmit}
                onCheckedChange={(checked) => 
                  setSettings({ 
                    ...settings, 
                    slack: { ...settings.slack, notifyOnSubmit: checked }
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="font-normal">Request approved</Label>
              <Switch
                checked={settings.slack.notifyOnApproval}
                onCheckedChange={(checked) => 
                  setSettings({ 
                    ...settings, 
                    slack: { ...settings.slack, notifyOnApproval: checked }
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="font-normal">Request rejected</Label>
              <Switch
                checked={settings.slack.notifyOnRejection}
                onCheckedChange={(checked) => 
                  setSettings({ 
                    ...settings, 
                    slack: { ...settings.slack, notifyOnRejection: checked }
                  })
                }
              />
            </div>
          </div>

          <div className="pt-2 border-t">
            <Button 
              onClick={testSlackWebhook} 
              disabled={!settings.slack.webhookUrl || testStatus === 'testing'}
              variant="outline"
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {testStatus === 'testing' ? 'Testing...' : testStatus === 'success' ? 'Test Sent!' : 'Send Test Message'}
            </Button>
            {testStatus === 'success' && (
              <p className="text-sm text-green-600 mt-2">✓ Check your Slack channel for the test message!</p>
            )}
            {testStatus === 'error' && (
              <p className="text-sm text-red-600 mt-2">✗ Failed to send message. Check your webhook URL.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Google Sheets Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle>Google Sheets Export</CardTitle>
                <CardDescription>Export PTO data to Google Sheets</CardDescription>
              </div>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
            <Input
              id="spreadsheetId"
              value={settings.googleSheets.spreadsheetId}
              onChange={(e) => 
                setSettings({ 
                  ...settings, 
                  googleSheets: { ...settings.googleSheets, spreadsheetId: e.target.value }
                })
              }
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Find this in your Google Sheets URL
            </p>
          </div>

          <div className="pt-2 border-t">
            <Button 
              onClick={exportToGoogleSheets} 
              disabled={!settings.googleSheets.spreadsheetId || exportStatus === 'exporting'}
              variant="outline"
              className="w-full"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {exportStatus === 'exporting' ? 'Exporting...' : 'Export to Google Sheets'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Requires Google Sheets API authentication in production
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Export Options */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-blue-500" />
            <div>
              <CardTitle>Quick Exports</CardTitle>
              <CardDescription>Download data in various formats</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => downloadCSV('leave_requests')} 
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Leave Requests CSV
            </Button>

            <Button 
              onClick={() => downloadCSV('team_members')} 
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Team Members CSV
            </Button>
          </div>

          <Button 
            onClick={downloadICalFeed} 
            variant="outline"
            className="w-full"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Download iCal Calendar Feed
          </Button>
          
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-1">📅 iCal Calendar Feed</p>
            <p className="text-xs text-blue-700">
              Import the downloaded .ics file into Apple Calendar, Google Calendar, Outlook, or any calendar app to see all approved PTO dates.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Integration Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Why Use Integrations?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-purple-600" />
              </div>
              <h4 className="font-semibold">Slack Notifications</h4>
              <p className="text-sm text-muted-foreground">
                Get instant updates in your team channel when PTO is requested or approved
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
              </div>
              <h4 className="font-semibold">Google Sheets</h4>
              <p className="text-sm text-muted-foreground">
                Export data for further analysis, reporting, or sharing with stakeholders
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <h4 className="font-semibold">Calendar Sync</h4>
              <p className="text-sm text-muted-foreground">
                View team PTO in your preferred calendar app alongside meetings and tasks
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationsHub;
