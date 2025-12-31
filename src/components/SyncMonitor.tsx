import React, { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Database } from 'lucide-react';

interface SyncStatus {
  system: string;
  lastSync: string;
  status: 'synced' | 'syncing' | 'error';
  records: number;
}

export default function SyncMonitor() {
  const [systems, setSystems] = useState<SyncStatus[]>([
    { system: 'HubSpot CRM', lastSync: '2 min ago', status: 'synced', records: 1247 },
    { system: 'Odoo ERP', lastSync: '5 min ago', status: 'synced', records: 893 },
    { system: 'Google Sheets', lastSync: '1 min ago', status: 'synced', records: 2156 },
    { system: 'Client Tracker', lastSync: 'Syncing...', status: 'syncing', records: 0 }
  ]);

  const [conflicts] = useState([
    { id: '1', field: 'Client Contact Email', systems: 'HubSpot vs Odoo', suggestion: 'Use HubSpot value (more recent)' },
    { id: '2', field: 'Billing Address', systems: 'Sheets vs Tracker', suggestion: 'Use Tracker value (verified)' }
  ]);

  const handleSyncAll = () => {
    setSystems(systems.map(s => ({ ...s, status: 'syncing' as const })));
    setTimeout(() => {
      setSystems(systems.map(s => ({ ...s, status: 'synced' as const, lastSync: 'Just now' })));
    }, 2000);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Cross-System Sync</h3>
        <button
          onClick={handleSyncAll}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Sync All
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {systems.map((system) => (
          <div key={system.system} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">{system.system}</h4>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{system.lastSync}</p>
                {system.status === 'synced' && (
                  <p className="text-xs text-gray-500">{system.records} records</p>
                )}
              </div>
              {system.status === 'synced' && <CheckCircle className="w-5 h-5 text-green-500" />}
              {system.status === 'syncing' && <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />}
              {system.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
            </div>
          </div>
        ))}
      </div>

      {conflicts.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            Conflicts Detected
          </h4>
          <div className="space-y-2">
            {conflicts.map((conflict) => (
              <div key={conflict.id} className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{conflict.field}</p>
                <p className="text-xs text-gray-600 mb-1">{conflict.systems}</p>
                <p className="text-xs text-green-700">AI Suggestion: {conflict.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
