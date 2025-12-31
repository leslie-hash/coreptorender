import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Users, Upload, Download, FileText, Plus, Edit2, Trash2 } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  region: string;
  industry: string;
  contactEmail: string;
  contactPhone: string;
  assignedCSP: string;
  status: string;
}

interface ClientData {
  id: string;
  clientId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  description: string;
  category: string;
  uploadedAt: string;
  downloadCount: number;
  status: string;
}

export default function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientData, setClientData] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showUploadData, setShowUploadData] = useState(false);

  const [newClient, setNewClient] = useState({
    name: '',
    region: '',
    industry: '',
    contactEmail: '',
    contactPhone: '',
    assignedCSP: ''
  });

  const [uploadForm, setUploadForm] = useState({
    fileName: '',
    fileType: 'report',
    description: '',
    category: 'monthly-report'
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
    setLoading(false);
  };

  const fetchClientData = async (clientId: string) => {
    try {
      const res = await fetch(`/api/clients/${clientId}/data`);
      const data = await res.json();
      setClientData(data);
    } catch (err) {
      console.error('Failed to fetch client data:', err);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
      });
      const result = await res.json();
      if (result.success) {
        alert('Client added successfully!');
        setShowAddClient(false);
        setNewClient({ name: '', region: '', industry: '', contactEmail: '', contactPhone: '', assignedCSP: '' });
        fetchClients();
      }
    } catch (err) {
      alert('Failed to add client.');
    }
  };

  const handleUploadData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
      const res = await fetch(`/api/clients/${selectedClient.id}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...uploadForm, uploadedBy: 'CSP' })
      });
      const result = await res.json();
      if (result.success) {
        alert('Data uploaded successfully!');
        setShowUploadData(false);
        setUploadForm({ fileName: '', fileType: 'report', description: '', category: 'monthly-report' });
        fetchClientData(selectedClient.id);
      }
    } catch (err) {
      alert('Failed to upload data.');
    }
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    fetchClientData(client.id);
  };

  const handleTrackDownload = async (dataId: string) => {
    if (!selectedClient) return;
    try {
      await fetch(`/api/clients/${selectedClient.id}/data/${dataId}/download`, {
        method: 'POST'
      });
      fetchClientData(selectedClient.id);
    } catch (err) {
      console.error('Failed to track download:', err);
    }
  };

  const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Africa'];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Client Management</h3>
        <button
          onClick={() => setShowAddClient(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="lg:col-span-1 space-y-3">
          <h4 className="font-semibold text-gray-700 mb-3">Clients ({clients.length})</h4>
          {loading && <p className="text-gray-500">Loading...</p>}
          {clients.map((client) => (
            <div
              key={client.id}
              onClick={() => handleSelectClient(client)}
              className={`p-4 border rounded-lg cursor-pointer hover:bg-blue-50 ${
                selectedClient?.id === client.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h5 className="font-semibold text-gray-900">{client.name}</h5>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-3 h-3" />
                {client.region}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <Users className="w-3 h-3" />
                CSP: {client.assignedCSP || 'Unassigned'}
              </div>
            </div>
          ))}
        </div>

        {/* Client Details & Data */}
        <div className="lg:col-span-2">
          {selectedClient ? (
            <>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{selectedClient.name}</h4>
                    <p className="text-sm text-gray-600">{selectedClient.industry}</p>
                  </div>
                  <button
                    onClick={() => setShowUploadData(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Data
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Region</p>
                    <p className="font-semibold">{selectedClient.region}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Contact</p>
                    <p className="font-semibold">{selectedClient.contactEmail}</p>
                  </div>
                </div>
              </div>

              <h4 className="font-semibold text-gray-700 mb-3">Distributed Data ({clientData.length})</h4>
              <div className="space-y-3">
                {clientData.map((data) => (
                  <div key={data.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <h5 className="font-semibold text-gray-900">{data.fileName}</h5>
                          <p className="text-sm text-gray-600">{data.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Uploaded: {new Date(data.uploadedAt).toLocaleDateString()} | Downloads: {data.downloadCount}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleTrackDownload(data.id)}
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
                {clientData.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No data uploaded for this client yet.</p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-16">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Select a client to view details and data</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Add New Client</h3>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client Name *</label>
                <input
                  type="text"
                  required
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Region *</label>
                <select
                  required
                  value={newClient.region}
                  onChange={(e) => setNewClient({ ...newClient, region: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select Region</option>
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Industry</label>
                <input
                  type="text"
                  value={newClient.industry}
                  onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Email</label>
                <input
                  type="email"
                  value={newClient.contactEmail}
                  onChange={(e) => setNewClient({ ...newClient, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assigned CSP</label>
                <input
                  type="text"
                  value={newClient.assignedCSP}
                  onChange={(e) => setNewClient({ ...newClient, assignedCSP: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                  Add Client
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  className="flex-1 bg-gray-200 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Data Modal */}
      {showUploadData && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Upload Data for {selectedClient.name}</h3>
            <form onSubmit={handleUploadData} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">File Name *</label>
                <input
                  type="text"
                  required
                  value={uploadForm.fileName}
                  onChange={(e) => setUploadForm({ ...uploadForm, fileName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Monthly Report - October 2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">File Type</label>
                <select
                  value={uploadForm.fileType}
                  onChange={(e) => setUploadForm({ ...uploadForm, fileType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="report">Report</option>
                  <option value="invoice">Invoice</option>
                  <option value="analytics">Analytics</option>
                  <option value="document">Document</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="monthly-report">Monthly Report</option>
                  <option value="quarterly-report">Quarterly Report</option>
                  <option value="financial">Financial</option>
                  <option value="operational">Operational</option>
                  <option value="compliance">Compliance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Brief description of the data..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700">
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadData(false)}
                  className="flex-1 bg-gray-200 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
