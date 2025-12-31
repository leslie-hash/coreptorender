import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api.service';

interface GmailMessage {
  id: string;
  snippet?: string;
  threadId?: string;
}

export default function TeamMemberEmailViewer() {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEmails = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiService.get('/api/gmail');
        const result = res.data as { messages?: GmailMessage[]; error?: string };
        if (result.messages && result.messages.length > 0) {
          setMessages(result.messages);
        } else {
          setMessages([]);
          setError(result.error || 'No Gmail messages found');
        }
      } catch (err) {
        setError('Failed to fetch Gmail data');
        setMessages([]);
      }
      setLoading(false);
    };
    fetchEmails();
  }, []);

  return (
    <div>
      <h2>Team Member Email Viewer</h2>
      {loading && <div>Loading Gmail data...</div>}
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      {messages.length > 0 && (
        <table border={1} style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th>Email ID</th>
              <th>Snippet</th>
              <th>Thread ID</th>
            </tr>
          </thead>
          <tbody>
            {messages.map(msg => (
              <tr key={msg.id}>
                <td>{msg.id}</td>
                <td>{msg.snippet || 'N/A'}</td>
                <td>{msg.threadId || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {messages.length === 0 && !loading && !error && (
        <div>No Gmail messages found for team members.</div>
      )}
    </div>
  );
}
