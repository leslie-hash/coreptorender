import React, { useState, useEffect } from 'react';
import { Settings, Users, Database, Mail, Key, Shield, Clock, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';

interface SystemConfig {
  general: {
    companyName: string;
    timezone: string;
    dateFormat: string;
    workingDaysPerWeek: number;
  };
  pto: {
    defaultAnnualDays: number;
    defaultSickDays: number;
    carryOverEnabled: boolean;
    maxCarryOverDays: number;
    requireDocumentation: boolean;
    autoApproveLimit: number;
  };
  notifications: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    digestEnabled: boolean;
    reminderDaysBefore: number;
  };
  security: {
    sessionTimeout: number;
    requirePasswordChange: boolean;
    passwordExpiryDays: number;
    twoFactorEnabled: boolean;
  };
  integrations: {
    googleSheetsEnabled: boolean;
    slackEnabled: boolean;
    teamsEnabled: boolean;
  };
}

export default function SystemSettings() {
  const [config, setConfig] = useState<SystemConfig>({
    general: {
      companyName: 'ZimWorx',
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      workingDaysPerWeek: 5,
    },
    pto: {
      defaultAnnualDays: 15,
      defaultSickDays: 10,
      carryOverEnabled: true,
      maxCarryOverDays: 5,
      requireDocumentation: false,
      autoApproveLimit: 0,
    },
    notifications: {
      emailEnabled: true,
      pushEnabled: false,
      digestEnabled: true,
      reminderDaysBefore: 3,
    },
    security: {
      sessionTimeout: 30,
      requirePasswordChange: false,
      passwordExpiryDays: 90,
      twoFactorEnabled: false,
    },
    integrations: {
      googleSheetsEnabled: true,
      slackEnabled: false,
      teamsEnabled: false,
    },
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
          <p className="text-sm text-gray-600 mt-1">Configure system-wide settings and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {saveSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="pto">PTO Policies</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                General Settings
              </CardTitle>
              <CardDescription>Configure basic system settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={config.general.companyName}
                  onChange={(e) => setConfig({
                    ...config,
                    general: { ...config.general, companyName: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={config.general.timezone}
                  onChange={(e) => setConfig({
                    ...config,
                    general: { ...config.general, timezone: e.target.value }
                  })}
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Africa/Harare">Central Africa Time (CAT)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <select
                  id="dateFormat"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={config.general.dateFormat}
                  onChange={(e) => setConfig({
                    ...config,
                    general: { ...config.general, dateFormat: e.target.value }
                  })}
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workingDays">Working Days Per Week</Label>
                <Input
                  id="workingDays"
                  type="number"
                  min="1"
                  max="7"
                  value={config.general.workingDaysPerWeek}
                  onChange={(e) => setConfig({
                    ...config,
                    general: { ...config.general, workingDaysPerWeek: parseInt(e.target.value) }
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PTO Policies */}
        <TabsContent value="pto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                PTO Policies
              </CardTitle>
              <CardDescription>Configure default PTO policies and rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annualDays">Default Annual Leave Days</Label>
                  <Input
                    id="annualDays"
                    type="number"
                    min="0"
                    value={config.pto.defaultAnnualDays}
                    onChange={(e) => setConfig({
                      ...config,
                      pto: { ...config.pto, defaultAnnualDays: parseInt(e.target.value) }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sickDays">Default Sick Leave Days</Label>
                  <Input
                    id="sickDays"
                    type="number"
                    min="0"
                    value={config.pto.defaultSickDays}
                    onChange={(e) => setConfig({
                      ...config,
                      pto: { ...config.pto, defaultSickDays: parseInt(e.target.value) }
                    })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="carryOver">Enable Carry Over</Label>
                  <p className="text-sm text-gray-600">Allow unused PTO to carry over to next year</p>
                </div>
                <Switch
                  id="carryOver"
                  checked={config.pto.carryOverEnabled}
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    pto: { ...config.pto, carryOverEnabled: checked }
                  })}
                />
              </div>

              {config.pto.carryOverEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="maxCarryOver">Maximum Carry Over Days</Label>
                  <Input
                    id="maxCarryOver"
                    type="number"
                    min="0"
                    value={config.pto.maxCarryOverDays}
                    onChange={(e) => setConfig({
                      ...config,
                      pto: { ...config.pto, maxCarryOverDays: parseInt(e.target.value) }
                    })}
                  />
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="requireDocs">Require Documentation</Label>
                  <p className="text-sm text-gray-600">Require supporting documents for leave requests</p>
                </div>
                <Switch
                  id="requireDocs"
                  checked={config.pto.requireDocumentation}
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    pto: { ...config.pto, requireDocumentation: checked }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="autoApprove">Auto-Approve Limit (Days)</Label>
                <Input
                  id="autoApprove"
                  type="number"
                  min="0"
                  value={config.pto.autoApproveLimit}
                  onChange={(e) => setConfig({
                    ...config,
                    pto: { ...config.pto, autoApproveLimit: parseInt(e.target.value) }
                  })}
                />
                <p className="text-sm text-gray-600">Set to 0 to disable auto-approval</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>Configure notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="emailEnabled">Email Notifications</Label>
                  <p className="text-sm text-gray-600">Send email notifications to users</p>
                </div>
                <Switch
                  id="emailEnabled"
                  checked={config.notifications.emailEnabled}
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    notifications: { ...config.notifications, emailEnabled: checked }
                  })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="pushEnabled">Push Notifications</Label>
                  <p className="text-sm text-gray-600">Enable browser push notifications</p>
                </div>
                <Switch
                  id="pushEnabled"
                  checked={config.notifications.pushEnabled}
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    notifications: { ...config.notifications, pushEnabled: checked }
                  })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="digestEnabled">Daily Digest</Label>
                  <p className="text-sm text-gray-600">Send daily summary emails</p>
                </div>
                <Switch
                  id="digestEnabled"
                  checked={config.notifications.digestEnabled}
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    notifications: { ...config.notifications, digestEnabled: checked }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminderDays">Reminder Days Before Leave</Label>
                <Input
                  id="reminderDays"
                  type="number"
                  min="0"
                  max="30"
                  value={config.notifications.reminderDaysBefore}
                  onChange={(e) => setConfig({
                    ...config,
                    notifications: { ...config.notifications, reminderDaysBefore: parseInt(e.target.value) }
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Configure security and authentication settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min="5"
                  max="1440"
                  value={config.security.sessionTimeout}
                  onChange={(e) => setConfig({
                    ...config,
                    security: { ...config.security, sessionTimeout: parseInt(e.target.value) }
                  })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="requirePasswordChange">Require Password Change</Label>
                  <p className="text-sm text-gray-600">Force users to change password on first login</p>
                </div>
                <Switch
                  id="requirePasswordChange"
                  checked={config.security.requirePasswordChange}
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    security: { ...config.security, requirePasswordChange: checked }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                <Input
                  id="passwordExpiry"
                  type="number"
                  min="0"
                  max="365"
                  value={config.security.passwordExpiryDays}
                  onChange={(e) => setConfig({
                    ...config,
                    security: { ...config.security, passwordExpiryDays: parseInt(e.target.value) }
                  })}
                />
                <p className="text-sm text-gray-600">Set to 0 to disable password expiry</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="twoFactor">Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-600">Require 2FA for all users</p>
                  <Badge variant="outline" className="mt-1">Coming Soon</Badge>
                </div>
                <Switch
                  id="twoFactor"
                  checked={config.security.twoFactorEnabled}
                  disabled
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    security: { ...config.security, twoFactorEnabled: checked }
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Integrations
              </CardTitle>
              <CardDescription>Manage third-party integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="googleSheets">Google Sheets</Label>
                  <p className="text-sm text-gray-600">Sync data with Google Sheets</p>
                  <Badge variant="outline" className="mt-1 bg-green-100 text-green-800">Active</Badge>
                </div>
                <Switch
                  id="googleSheets"
                  checked={config.integrations.googleSheetsEnabled}
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    integrations: { ...config.integrations, googleSheetsEnabled: checked }
                  })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="slack">Slack</Label>
                  <p className="text-sm text-gray-600">Send notifications to Slack</p>
                  <Badge variant="outline" className="mt-1">Coming Soon</Badge>
                </div>
                <Switch
                  id="slack"
                  checked={config.integrations.slackEnabled}
                  disabled
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    integrations: { ...config.integrations, slackEnabled: checked }
                  })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="teams">Microsoft Teams</Label>
                  <p className="text-sm text-gray-600">Send notifications to Teams</p>
                  <Badge variant="outline" className="mt-1">Coming Soon</Badge>
                </div>
                <Switch
                  id="teams"
                  checked={config.integrations.teamsEnabled}
                  disabled
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    integrations: { ...config.integrations, teamsEnabled: checked }
                  })}
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Configure integration credentials in the respective integration settings pages.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
