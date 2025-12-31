import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, FileSpreadsheet, Database, TrendingUp } from 'lucide-react';

interface DataIssue {
  id: string;
  clientId: string;
  clientName: string;
  issueType: 'duplicate' | 'missing' | 'inconsistent' | 'outdated';
  field: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  status: 'pending' | 'resolved';
  detectedAt: string;
}

interface DataSource {
  id: string;
  name: string;
  type: string;
  lastSync: string;
  recordCount: number;
  status: 'synced' | 'pending' | 'error';
}

export default function DataIntegrityMonitor() {
  const [issues, setIssues] = useState<DataIssue[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalClients: 0,
    duplicates: 0,
    missingData: 0,
    inconsistencies: 0,
    integrityScore: 0
  });

  useEffect(() => {
    fetchDataIntegrity();
  }, []);

  const fetchDataIntegrity = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data-integrity/check');
      const data = await res.json();
      setIssues(data.issues || []);
      setDataSources(data.sources || []);
      setStats(data.stats || stats);
    } catch (err) {
      console.error('Failed to fetch data integrity:', err);
    }
    setLoading(false);
  };

  const handleResolveIssue = async (issueId: string) => {
    try {
      await fetch(`/api/data-integrity/resolve/${issueId}`, { method: 'POST' });
      fetchDataIntegrity();
    } catch (err) {
      alert('Failed to resolve issue.');
    }
  };

  const handleSyncData = async () => {
    setLoading(true);
    try {
      await fetch('/api/data-integrity/sync', { method: 'POST' });
      alert('Data sync initiated!');
      fetchDataIntegrity();
    } catch (err) {
      alert('Failed to sync data.');
    }
    setLoading(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-300';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-300';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-300';
      default: return 'text-gray-600 bg-gray-50 border-gray-300';
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'duplicate': return '⚠️';
      case 'missing': return '❌';
      case 'inconsistent': return '🔄';
      case 'outdated': return '⏰';
      default: return '📋';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Data Integrity Monitor</h3>
          <button
            onClick={handleSyncData}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Sync All Sources
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-gray-600">Total Clients</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-gray-600">Duplicates</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.duplicates}</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-gray-600">Missing Data</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.missingData}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <p className="text-sm text-gray-600">Inconsistencies</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.inconsistencies}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <p className="text-sm text-gray-600">Integrity Score</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.integrityScore}%</p>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Data Sources</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dataSources.map((source) => (
            <div key={source.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <h5 className="font-semibold text-gray-900">{source.name}</h5>
              </div>
              <p className="text-sm text-gray-600 mb-2">{source.type}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Records: {source.recordCount}</span>
                <span className={`px-2 py-1 rounded ${
                  source.status === 'synced' ? 'bg-green-100 text-green-700' :
                  source.status === 'error' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {source.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">Last sync: {new Date(source.lastSync).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Issues List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Data Quality Issues ({issues.length})</h4>
        <div className="space-y-3">
          {issues.map((issue) => (
            <div key={issue.id} className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getIssueIcon(issue.issueType)}</span>
                    <h5 className="font-semibold text-gray-900">{issue.clientName}</h5>
                    <span className="text-xs px-2 py-1 rounded bg-white border">
                      {issue.issueType}
                    </span>
                  </div>
                  <p className="text-sm mb-1"><span className="font-medium">Field:</span> {issue.field}</p>
                  <p className="text-sm text-gray-700">{issue.description}</p>
                  <p className="text-xs text-gray-500 mt-2">Detected: {new Date(issue.detectedAt).toLocaleString()}</p>
                </div>
                {issue.status === 'pending' && (
                  <button
                    onClick={() => handleResolveIssue(issue.id)}
                    className="ml-4 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Resolve
                  </button>
                )}
                {issue.status === 'resolved' && (
                  <CheckCircle className="ml-4 w-5 h-5 text-green-600" />
                )}
              </div>
            </div>
          ))}
          {issues.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>No data integrity issues found!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
