import React, { useState } from 'react';
import { Settings, Database, Sliders } from 'lucide-react';
import SystemSettings from './SystemSettings';
import GoogleSheetsSyncManager from './GoogleSheetsSyncManager';
import CSPSheetSync from './CSPSheetSync';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'settings' | 'sheets-sync' | 'csp-sync'>('settings');

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage system settings and integrations</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-[#4A90E2] text-[#4A90E2] font-semibold'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
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
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Database className="w-4 h-4" />
              Google Sheets Sync
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">Step 5</span>
            </button>
            <button
              onClick={() => setActiveTab('csp-sync')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'csp-sync'
                  ? 'border-[#4A90E2] text-[#4A90E2] font-semibold'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Sliders className="w-4 h-4" />
              CSP Sheet Sync
              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">NEW</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'settings' && <SystemSettings />}
      {activeTab === 'sheets-sync' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Google Sheets Sync</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Step 5 of the PTO workflow - Automatically sync approved leave requests to Google Sheets for record keeping
            </p>
          </div>
          <GoogleSheetsSyncManager />
        </div>
      )}
      {activeTab === 'csp-sync' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">CSP Sheet Sync</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Sync team member data from individual CSP Google Sheets (all 22 CSPs)
            </p>
          </div>
          <CSPSheetSync />
        </div>
      )}
    </div>
  );
}
