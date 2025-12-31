import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import { RefreshCw, CheckCircle2, XCircle, Sheet, Users, Calendar, Settings } from 'lucide-react';
import { authenticatedFetch } from '@/utils/auth';

interface SyncSettings {
  spreadsheetId: string;
  teamMembersRange: string;
  leaveRequestsRange: string;
  autoSync: boolean;
  syncIntervalMinutes: number;
}

export default function GoogleSheetsSyncManager() {
  const [settings, setSettings] = useState<SyncSettings>({
    spreadsheetId: '',
    teamMembersRange: 'Team member work details!A1:Z',
    leaveRequestsRange: 'Leave Tracker!A1:Z',
    autoSync: false,
    syncIntervalMinutes: 30,
  });
  
  const [syncing, setSyncing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sheetInfo, setSheetInfo] = useState<{ title: string; sheets: string[] } | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await authenticatedFetch('/api/sync/settings');
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const res = await authenticatedFetch('/api/sync/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    }
  };

  const validateConnection = async () => {
    if (!settings.spreadsheetId) {
      setMessage({ type: 'error', text: 'Please enter a Spreadsheet ID' });
      return;
    }

    setValidating(true);
    setMessage(null);
    
    try {
      const res = await authenticatedFetch('/api/sync/validate', {
        method: 'POST',
        body: JSON.stringify({ spreadsheetId: settings.spreadsheetId }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSheetInfo(data);
        setMessage({ 
          type: 'success', 
          text: `Connected to: ${data.title}` 
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to connect' });
        setSheetInfo(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Connection failed. Check your credentials.' });
      setSheetInfo(null);
    } finally {
      setValidating(false);
    }
  };

  const syncTeamMembers = async () => {
    if (!settings.spreadsheetId) {
      setMessage({ type: 'error', text: 'Please enter a Spreadsheet ID' });
      return;
    }

    setSyncing(true);
    setMessage(null);
    
    try {
      const res = await authenticatedFetch('/api/sync/team-members', {
        method: 'POST',
        body: JSON.stringify({
          spreadsheetId: settings.spreadsheetId,
          range: settings.teamMembersRange,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ ${data.message}` 
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Sync failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Sync failed. Check your sheet structure.' });
    } finally {
      setSyncing(false);
    }
  };

  const syncAllSheets = async () => {
    if (!settings.spreadsheetId) {
      setMessage({ type: 'error', text: 'Please enter a Spreadsheet ID' });
      return;
    }

    setSyncing(true);
    setMessage(null);
    
    try {
      const res = await authenticatedFetch('/api/sync/comprehensive', {
        method: 'POST',
        body: JSON.stringify({
          spreadsheetId: settings.spreadsheetId,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        const stats = data.stats;
        setMessage({ 
          type: 'success', 
          text: `✅ All sheets synced! Team: ${stats.teamMembers}, Leave: ${stats.leaveRequests}, Absenteeism: ${stats.absenteeismRecords}, History: ${stats.approvalHistory}` 
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Sync failed' });
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      setMessage({ type: 'error', text: err.message || 'Sync failed. Check your sheet structure.' });
    } finally {
      setSyncing(false);
    }
  };

  const syncLeaveRequests = async () => {
    if (!settings.spreadsheetId) {
      setMessage({ type: 'error', text: 'Please enter a Spreadsheet ID' });
      return;
    }

    setSyncing(true);
    setMessage(null);
    
    try {
      const res = await authenticatedFetch('/api/sync/leave-requests', {
        method: 'POST',
        body: JSON.stringify({
          spreadsheetId: settings.spreadsheetId,
          range: settings.leaveRequestsRange,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ ${data.message}` 
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Sync failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Sync failed. Check your sheet structure.' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Google Sheets Sync</h1>

      {message && (
        <Alert className={message.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
          <AlertDescription className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
            <Input
              id="spreadsheetId"
              placeholder="Enter your Google Sheet ID"
              value={settings.spreadsheetId}
              onChange={(e) => setSettings({ ...settings, spreadsheetId: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teamMembersRange">Team Members Range</Label>
              <Input
                id="teamMembersRange"
                value={settings.teamMembersRange}
                onChange={(e) => setSettings({ ...settings, teamMembersRange: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leaveRequestsRange">Leave Requests Range</Label>
              <Input
                id="leaveRequestsRange"
                value={settings.leaveRequestsRange}
                onChange={(e) => setSettings({ ...settings, leaveRequestsRange: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={validateConnection} disabled={validating} variant="outline" className="flex-1">
              {validating ? 'Testing...' : 'Test'}
            </Button>
            <Button onClick={saveSettings} className="flex-1">Save</Button>
          </div>

          {sheetInfo && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
              <p className="font-medium text-green-900">✅ {sheetInfo.title}</p>
              <p className="text-xs text-green-700 mt-1">
                Sheets: {Array.isArray(sheetInfo.sheets) ? sheetInfo.sheets.join(', ') : String(sheetInfo.sheets)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expected Sheet Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sheet Structure</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div>
            <p className="font-semibold">Team Members: Team Member Name | Employee ID | Department | CSP Name | Email | Join Date</p>
          </div>
          <div>
            <p className="font-semibold">Leave Requests: Request ID | Team Member Name | Leave Type | Start Date | End Date | Status | Submitted Date</p>
          </div>
        </CardContent>
      </Card>

      {/* Sync Actions */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sheet className="w-5 h-5 text-blue-600" />
            Comprehensive Sync (All 4 Tabs)
          </CardTitle>
          <CardDescription>
            Syncs: Team Member Work Details, Leave Tracker, Absenteeism Tracker, PTO Update
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={syncAllSheets} 
            disabled={syncing || !settings.spreadsheetId}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing All Sheets...' : 'Sync All 4 Tabs Now'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={syncTeamMembers} 
              disabled={syncing || !settings.spreadsheetId}
              className="w-full"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Leave Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={syncLeaveRequests} 
              disabled={syncing || !settings.spreadsheetId}
              className="w-full"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
