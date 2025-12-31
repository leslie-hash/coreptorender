import React, { useState } from 'react';
import { FileText, Sparkles, Send, Upload, Mic, Video, Type, Link2 } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  date: string;
  summary: string;
  actionItems: string[];
}

type InputMethod = 'upload' | 'text' | 'integration' | 'record';

export default function MeetingNotes() {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: '1',
      title: 'Client Launch Call - Acme Corp',
      date: 'Oct 30, 2025',
      summary: 'Discussed project timeline, resource allocation, and key deliverables. Client confirmed budget approval.',
      actionItems: ['Send contract by Nov 1', 'Schedule kickoff meeting', 'Assign project manager']
    },
    {
      id: '2',
      title: 'Weekly Team Sync',
      date: 'Oct 29, 2025',
      summary: 'Reviewed sprint progress, addressed blockers, and planned next iteration.',
      actionItems: ['Update roadmap', 'Review design mockups', 'Deploy staging environment']
    }
  ]);

  const [inputMethod, setInputMethod] = useState<InputMethod>('upload');
  const [transcriptText, setTranscriptText] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiNote, setAiNote] = useState<Note | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // If it's a text file, read it
      if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.vtt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setTranscriptText(e.target?.result as string);
        };
        reader.readAsText(file);
      }
    }
  };

  const handleProcessTranscript = () => {
    if (!transcriptText && !uploadedFile) return;
    
    setIsProcessing(true);

    // If there's a file, use the upload endpoint
    if (uploadedFile) {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('title', meetingTitle || uploadedFile.name);

      fetch('/api/meeting-notes/upload', {
        method: 'POST',
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          setIsProcessing(false);
          setTranscriptText('');
          setUploadedFile(null);
          setMeetingTitle('');
          if (data.summary) {
            setAiNote({
              id: 'ai-' + Date.now(),
              title: data.title || meetingTitle || 'AI-Generated Meeting Notes',
              date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
              summary: data.summary,
              actionItems: data.actionItems || []
            });
          } else {
            alert(data.error || 'Failed to generate notes.');
          }
        })
        .catch((err) => {
          setIsProcessing(false);
          console.error('Upload error:', err);
          alert('Error processing file. Please try again.');
        });
    } 
    // Otherwise use the text endpoint
    else {
      fetch('/api/meeting-notes/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript: transcriptText, 
          title: meetingTitle || 'Meeting Notes'
        })
      })
        .then(res => res.json())
        .then(data => {
          setIsProcessing(false);
          setTranscriptText('');
          setMeetingTitle('');
          if (data.summary) {
            setAiNote({
              id: 'ai-' + Date.now(),
              title: data.title || meetingTitle || 'AI-Generated Meeting Notes',
              date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
              summary: data.summary,
              actionItems: data.actionItems || []
            });
          } else {
            alert(data.error || 'Failed to generate notes.');
          }
        })
        .catch((err) => {
          setIsProcessing(false);
          console.error('Processing error:', err);
          alert('Error processing transcript. Please try again.');
        });
    }
  };

  const handleIntegration = (platform: string) => {
    alert(`${platform} integration coming soon! This will allow you to automatically sync meetings and transcripts.`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Meeting Intelligence</h3>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h4 className="font-semibold text-gray-900">AI-Powered Notes</h4>
        </div>

        {/* Input Method Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          <button
            onClick={() => setInputMethod('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors whitespace-nowrap ${
              inputMethod === 'upload'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload File
          </button>
          <button
            onClick={() => setInputMethod('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors whitespace-nowrap ${
              inputMethod === 'text'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Type className="w-4 h-4" />
            Paste Text
          </button>
          <button
            onClick={() => setInputMethod('integration')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors whitespace-nowrap ${
              inputMethod === 'integration'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Integrations
          </button>
        </div>

        {/* Meeting Title Input */}
        <input
          type="text"
          placeholder="Meeting title (optional)"
          value={meetingTitle}
          onChange={(e) => setMeetingTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 mb-3"
        />

        {/* Upload Method */}
        {inputMethod === 'upload' && (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileUpload}
                accept=".txt,.vtt,.srt,.mp3,.mp4,.wav,.m4a"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">
                  {uploadedFile ? uploadedFile.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-gray-500">
                  Transcript files (.txt, .vtt, .srt) or Audio/Video (.mp3, .mp4, .wav)
                </p>
              </label>
            </div>
            {uploadedFile && (
              <div className="flex items-center justify-between bg-white p-3 rounded-md">
                <div className="flex items-center gap-2">
                  {uploadedFile.type.includes('audio') || uploadedFile.type.includes('video') ? (
                    <Video className="w-4 h-4 text-purple-600" />
                  ) : (
                    <FileText className="w-4 h-4 text-purple-600" />
                  )}
                  <span className="text-sm text-gray-700">{uploadedFile.name}</span>
                </div>
                <button
                  onClick={() => setUploadedFile(null)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}

        {/* Text Input Method */}
        {inputMethod === 'text' && (
          <div>
            <textarea
              placeholder="Paste your meeting transcript here..."
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              Paste the full transcript from your meeting platform or recording service
            </p>
          </div>
        )}

        {/* Integration Method */}
        {inputMethod === 'integration' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-3">Connect your meeting platform for automatic sync</p>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => handleIntegration('Zoom')}
                className="flex items-center gap-3 p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
              >
                <Video className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Zoom</p>
                  <p className="text-xs text-gray-500">Auto-import recordings and transcripts</p>
                </div>
              </button>
              <button
                onClick={() => handleIntegration('Google Meet')}
                className="flex items-center gap-3 p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
              >
                <Video className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Google Meet</p>
                  <p className="text-xs text-gray-500">Import transcripts</p>
                </div>
              </button>
              <button
                onClick={() => handleIntegration('Otter.ai')}
                className="flex items-center gap-3 p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
              >
                <Mic className="w-5 h-5 text-indigo-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Otter.ai</p>
                  <p className="text-xs text-gray-500">Connect transcription</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Process Button */}
        <button
          onClick={handleProcessTranscript}
          disabled={isProcessing || (!transcriptText && !uploadedFile)}
          className="w-full mt-4 bg-purple-600 text-white px-4 py-3 rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate AI Notes
            </>
          )}
        </button>
      </div>

      <div className="space-y-4">
        {aiNote && (
          <div className="border border-purple-300 rounded-lg p-4 bg-purple-50">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-purple-900">{aiNote.title}</h4>
              </div>
              <span className="text-sm text-gray-500">{aiNote.date}</span>
            </div>
            <p className="text-sm text-gray-700 mb-3">{aiNote.summary}</p>
            <div className="bg-gray-100 p-3 rounded-md">
              <p className="text-xs font-semibold text-gray-700 mb-2">Action Items:</p>
              <ul className="space-y-1">
                {aiNote.actionItems.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {notes.map((note) => (
          <div key={note.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">{note.title}</h4>
              </div>
              <span className="text-sm text-gray-500">{note.date}</span>
            </div>
            <p className="text-sm text-gray-700 mb-3">{note.summary}</p>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-xs font-semibold text-gray-700 mb-2">Action Items:</p>
              <ul className="space-y-1">
                {note.actionItems.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
