import React, { useState, useEffect } from 'react';
import { FileDown, Calendar, TrendingUp, Users, Mail, CheckCircle, XCircle } from 'lucide-react';

export default function ReportGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState('');
  const [lastReport, setLastReport] = useState<{ timestamp: string; url?: string } | null>(null);

  const [stats, setStats] = useState({
    billableDays: 0,
    leaveDays: 0,
    absenteeismRate: '0%',
    teamSize: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      const response = await fetch('/api/reports/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setLastReport(null);

    try {
      const recipients = sendEmail && emailRecipients 
        ? emailRecipients.split(',').map(email => email.trim()).filter(Boolean)
        : [];

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sendEmail: sendEmail && recipients.length > 0,
          recipients
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setLastReport(data.report);
        alert(
          sendEmail && recipients.length > 0
            ? `Report generated and emailed to ${recipients.join(', ')}!`
            : 'Report generated successfully!'
        );
        // Refresh stats
        fetchStats();
      } else {
        alert('Failed to generate report: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Report generation error:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Monthly Reporting</h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#F3F4F6] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-[#14B8A6]" />
            <span className="text-sm text-[#14B8A6] font-medium">Billable Days</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {isLoadingStats ? '...' : stats.billableDays}
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-purple-700 font-medium">Leave Days</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {isLoadingStats ? '...' : stats.leaveDays}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700 font-medium">Absenteeism Rate</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {isLoadingStats ? '...' : stats.absenteeismRate}
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-orange-700 font-medium">Team Size</span>
          </div>
          <div className="text-2xl font-bold text-orange-900">
            {isLoadingStats ? '...' : stats.teamSize}
          </div>
        </div>
      </div>

      {lastReport && lastReport.insights && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg mb-4">
          <h4 className="font-semibold text-gray-900 mb-2">AI Insights (Latest Report)</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            {lastReport.insights.map((insight: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-[#14B8A6] mt-0.5">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Email Configuration */}
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            id="sendEmail"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="w-4 h-4 text-[#14B8A6] rounded"
          />
          <label htmlFor="sendEmail" className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email report to leadership
          </label>
        </div>
        {sendEmail && (
          <input
            type="text"
            placeholder="Enter email addresses (comma-separated)"
            value={emailRecipients}
            onChange={(e) => setEmailRecipients(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
          />
        )}
      </div>

      {/* Last Report Status */}
      {lastReport && (
        <div className="bg-[#F3F4F6] p-3 rounded-lg mb-4 text-sm">
          <div className="flex items-center gap-2 mb-1">
            {lastReport.emailSent ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : lastReport.emailError ? (
              <XCircle className="w-4 h-4 text-red-600" />
            ) : null}
            <span className="font-medium text-gray-900">
              Last Report: {lastReport.period.month} {lastReport.period.year}
            </span>
          </div>
          {lastReport.emailSent && lastReport.emailRecipients && (
            <p className="text-gray-600 text-xs">
              Sent to: {lastReport.emailRecipients.join(', ')}
            </p>
          )}
          {lastReport.emailError && (
            <p className="text-red-600 text-xs">
              Email failed: {lastReport.emailError}
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleGenerateReport}
        disabled={isGenerating || isLoadingStats}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            Generating Report...
          </>
        ) : (
          <>
            <FileDown className="w-5 h-5" />
            Generate Monthly Report
          </>
        )}
      </button>
    </div>
  );
}
