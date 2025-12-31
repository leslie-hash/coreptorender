import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Download, Filter } from 'lucide-react';

interface ClientAnalytics {
  region: string;
  clientCount: number;
  activeClients: number;
  dataVolume: number;
  avgDownloads: number;
}

interface TrendData {
  month: string;
  newClients: number;
  dataUploads: number;
  downloads: number;
}

export default function ClientAnalytics() {
  const [analytics, setAnalytics] = useState<ClientAnalytics[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [dateRange, setDateRange] = useState('last-30-days');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedRegion, dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/clients?region=${selectedRegion}&range=${dateRange}`);
      const data = await res.json();
      setAnalytics(data.analytics || []);
      setTrends(data.trends || []);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
    setLoading(false);
  };

  const handleExportReport = async () => {
    try {
      const res = await fetch('/api/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region: selectedRegion, range: dateRange })
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `client-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (err) {
      alert('Failed to export report.');
    }
  };

  const totalClients = analytics.reduce((sum, a) => sum + a.clientCount, 0);
  const totalActive = analytics.reduce((sum, a) => sum + a.activeClients, 0);
  const totalDataVolume = analytics.reduce((sum, a) => sum + a.dataVolume, 0);
  const avgEngagement = totalActive > 0 ? ((totalActive / totalClients) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Client Analytics & Reports</h3>
          <button
            onClick={handleExportReport}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Regions</option>
              <option value="North America">North America</option>
              <option value="Europe">Europe</option>
              <option value="Asia Pacific">Asia Pacific</option>
              <option value="Latin America">Latin America</option>
              <option value="Middle East">Middle East</option>
              <option value="Africa">Africa</option>
            </select>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="last-7-days">Last 7 Days</option>
            <option value="last-30-days">Last 30 Days</option>
            <option value="last-90-days">Last 90 Days</option>
            <option value="year-to-date">Year to Date</option>
          </select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-gray-600">Total Clients</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <p className="text-sm text-gray-600">Active Clients</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalActive}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <PieChart className="w-5 h-5 text-purple-600" />
              <p className="text-sm text-gray-600">Data Volume (GB)</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalDataVolume}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <p className="text-sm text-gray-600">Engagement</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{avgEngagement}%</p>
          </div>
        </div>
      </div>

      {/* Regional Breakdown */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Regional Breakdown</h4>
        <div className="space-y-3">
          {analytics.map((region) => (
            <div key={region.region} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-semibold text-gray-900">{region.region}</h5>
                <span className="text-sm text-gray-600">{region.clientCount} clients</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Active</p>
                  <p className="font-semibold">{region.activeClients}</p>
                </div>
                <div>
                  <p className="text-gray-600">Data (GB)</p>
                  <p className="font-semibold">{region.dataVolume}</p>
                </div>
                <div>
                  <p className="text-gray-600">Avg Downloads</p>
                  <p className="font-semibold">{region.avgDownloads}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(region.activeClients / region.clientCount) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {((region.activeClients / region.clientCount) * 100).toFixed(1)}% engagement
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trends Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Activity Trends</h4>
        <div className="space-y-4">
          {trends.map((trend) => (
            <div key={trend.month} className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium text-gray-700">{trend.month}</div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(trend.newClients / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-20">{trend.newClients} new</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(trend.dataUploads / 50) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-20">{trend.dataUploads} uploads</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${(trend.downloads / 100) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-20">{trend.downloads} downloads</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
