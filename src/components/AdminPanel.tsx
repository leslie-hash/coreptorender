import React, { useState } from 'react';
import { Settings, Database, Sliders } from 'lucide-react';
import SystemSettings from './SystemSettings';
import GoogleSheetsSyncManager from './GoogleSheetsSyncManager';
import CSPSheetSync from './CSPSheetSync';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'settings' | 'sheets-sync' | 'csp-sync'>('settings');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
          <p className="text-gray-600 mt-1">Manage system settings and integrations</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-[#4A90E2] text-[#4A90E2] font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              System Settings
            </button>
            <button
              onClick={() => setActiveTab('sheets-sync')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'sheets-sync'
                  ? 'border-[#4A90E2] text-[#4A90E2] font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Database className="w-4 h-4" />
              Google Sheets Sync
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Step 5</span>
            </button>
            <button
              onClick={() => setActiveTab('csp-sync')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'csp-sync'
                  ? 'border-[#4A90E2] text-[#4A90E2] font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Sliders className="w-4 h-4" />
              CSP Sheet Sync
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">NEW</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'settings' && <SystemSettings />}
      {activeTab === 'sheets-sync' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Google Sheets Sync</h3>
            <p className="text-gray-600 text-sm">
              Step 5 of the PTO workflow - Automatically sync approved leave requests to Google Sheets for record keeping
            </p>
          </div>
          <GoogleSheetsSyncManager />
        </div>
      )}
      {activeTab === 'csp-sync' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">CSP Sheet Sync</h3>
            <p className="text-gray-600 text-sm">
              Sync team member data from individual CSP Google Sheets (all 22 CSPs)
            </p>
          </div>
          <CSPSheetSync />
        </div>
      )}
    </div>
  );
}
