import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface LeaveRequestFormProps {
  onClose: () => void;
  onSubmit: (data: Record<string, string | number | File | null>) => void;
}

export default function LeaveRequestForm({ onClose, onSubmit }: LeaveRequestFormProps) {
  // Import user context
  // eslint-disable-next-line
  // @ts-ignore
  const { userRole, userName } = (window.__APP_CONTEXT__ || {});

  // If using React context, import and use it:
  // import { useAppContext } from '@/contexts/AppContext';
  // const { userRole, userName } = useAppContext();

  const [formData, setFormData] = useState({
    teamMemberName: '',
    leaveType: 'vacation',
    startDate: '',
    endDate: '',
    reason: '',
    submittedBy: userName || 'CSP'
  });
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ptoBalance, setPtoBalance] = useState<{ annualPTO: number; usedPTO: number; remainingPTO: number } | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [sickNoteFile, setSickNoteFile] = useState<File | null>(null);

  useEffect(() => {
    fetch('/api/team-members')
      .then(res => res.json())
      .then(data => setTeamMembers(data.teamMembers || []));
  }, []);

  // Fetch PTO balance when team member is selected
  useEffect(() => {
    if (formData.teamMemberName) {
      setLoadingBalance(true);
      fetch(`/api/pto-balance/${encodeURIComponent(formData.teamMemberName)}`)
        .then(res => res.json())
        .then(data => {
          setPtoBalance(data);
          setLoadingBalance(false);
        })
        .catch(() => {
          setLoadingBalance(false);
        });
    } else {
      setPtoBalance(null);
    }
  }, [formData.teamMemberName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setValidationErrors([]);
    
    // Calculate days
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    try {
      let sickNoteUrl = null;
      
      // Upload sick note if sick leave and file selected
      if (formData.leaveType === 'sick' && sickNoteFile) {
        const formDataFile = new FormData();
        formDataFile.append('sickNote', sickNoteFile);
        formDataFile.append('teamMemberName', formData.teamMemberName);
        
        const uploadResponse = await fetch('/api/upload-sick-note', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formDataFile
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          sickNoteUrl = uploadData.filePath;
        }
      }
      
      const dataWithDays = { 
        ...formData, 
        teamMember: formData.teamMemberName, 
        days,
        sickNoteUrl
      };
      
      await Promise.resolve(onSubmit(dataWithDays));
      onClose();
    } catch (error: unknown) {
      setSubmitting(false);
      const err = error as { validationErrors?: string[] };
      if (err.validationErrors) {
        setValidationErrors(error.validationErrors);
      } else {
        alert('Failed to submit leave request');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Submit PTO for Team Member</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">As a CSP, submit time-off requests for your team members</p>
        {submitting && (
          <div className="flex items-center justify-center mb-4">
            <span className="text-[#14B8A6]">Submitting...</span>
            <svg className="animate-spin ml-2 h-5 w-5 text-[#14B8A6]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
          </div>
        )}
        {validationErrors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-semibold text-red-800 mb-2">⚠️ Validation Errors:</p>
            <ul className="list-disc list-inside text-sm text-red-700">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        {ptoBalance && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-semibold text-blue-800 mb-1">PTO Balance for {formData.teamMemberName}:</p>
            <div className="flex gap-4 text-sm text-blue-700">
              <span>Annual: <strong>{ptoBalance.annualPTO}</strong> days</span>
              <span>Used: <strong>{ptoBalance.usedPTO}</strong> days</span>
              <span>Remaining: <strong className={ptoBalance.remainingPTO < 5 ? 'text-red-600' : ''}>{ptoBalance.remainingPTO}</strong> days</span>
            </div>
          </div>
        )}
        {loadingBalance && (
          <div className="mb-4 text-sm text-gray-600">Loading PTO balance...</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team Member Name</label>
            <input
              type="text"
              required
              value={formData.teamMemberName}
              onChange={(e) => {
                setFormData({ ...formData, teamMemberName: e.target.value });
                setFilter(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Select or type team member name"
              autoComplete="off"
            />
            {filter && (
              <ul className="border border-gray-200 rounded-md bg-white mt-1 max-h-40 overflow-y-auto">
                {teamMembers.filter(name => name.toLowerCase().includes(filter.toLowerCase())).map((name, idx) => (
                  <li
                    key={idx}
                    className="px-3 py-2 cursor-pointer hover:bg-[#F3F4F6]"
                    onClick={() => {
                      setFormData({ ...formData, teamMemberName: name });
                      setFilter('');
                    }}
                  >
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
            <select
              value={formData.leaveType}
              onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="vacation">Vacation</option>
              <option value="sick">Sick Leave</option>
              <option value="personal">Personal</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {formData.leaveType === 'sick' && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
              <label className="block text-sm font-semibold text-amber-900 mb-2">
                📄 Sick Note Upload (Required for Sick Leave)
              </label>
              <p className="text-xs text-amber-700 mb-3">
                Please upload a scanned copy of your sick note or medical certificate
              </p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setSickNoteFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-100 file:text-blue-900 hover:file:bg-blue-200 cursor-pointer"
                required
              />
              {sickNoteFile && (
                <p className="text-xs text-green-600 mt-2">✓ File selected: {sickNoteFile.name}</p>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-[#14B8A6] text-white py-2 px-4 rounded-md hover:bg-[#0D9488] transition-colors"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
