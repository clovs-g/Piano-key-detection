import React, { useState, useEffect } from 'react';
import { Play, Pause, Trash2, Edit2, Check, X, Music2 } from 'lucide-react';
import { Recording } from '../lib/supabase';
import { RecordingService } from '../services/recordingService';

interface RecordingsListProps {
  onRecordingsUpdate?: () => void;
}

const RecordingsList: React.FC<RecordingsListProps> = ({ onRecordingsUpdate }) => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    setLoading(true);
    const data = await RecordingService.getAllRecordings();
    setRecordings(data);
    setLoading(false);
    onRecordingsUpdate?.();
  };

  const handlePlay = (recording: Recording) => {
    if (playingId === recording.id) {
      audioElement?.pause();
      setPlayingId(null);
      setAudioElement(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }

      const audio = new Audio(recording.audio_url);
      audio.onended = () => {
        setPlayingId(null);
        setAudioElement(null);
      };
      audio.play();
      setAudioElement(audio);
      setPlayingId(recording.id);
    }
  };

  const handleDelete = async (recording: Recording) => {
    if (!confirm(`Delete "${recording.title}"?`)) return;

    if (playingId === recording.id) {
      audioElement?.pause();
      setPlayingId(null);
      setAudioElement(null);
    }

    const success = await RecordingService.deleteRecording(recording.id, recording.audio_url);
    if (success) {
      await loadRecordings();
    }
  };

  const startEdit = (recording: Recording) => {
    setEditingId(recording.id);
    setEditTitle(recording.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const saveEdit = async (id: string) => {
    if (!editTitle.trim()) {
      cancelEdit();
      return;
    }

    const success = await RecordingService.updateRecordingTitle(id, editTitle.trim());
    if (success) {
      await loadRecordings();
      cancelEdit();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Your Recordings</h3>
        <div className="text-center text-gray-400 py-8">Loading recordings...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Music2 className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Your Recordings</h3>
          <span className="text-sm text-gray-400">({recordings.length})</span>
        </div>
      </div>

      {recordings.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <Music2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No recordings yet</p>
          <p className="text-sm mt-1">Start listening and click the record button to save your performance</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {recordings.map((recording) => (
            <div
              key={recording.id}
              className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {editingId === recording.id ? (
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 bg-gray-600 text-white px-3 py-1 rounded border border-gray-500 focus:outline-none focus:border-blue-400"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(recording.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <button
                        onClick={() => saveEdit(recording.id)}
                        className="p-1 text-green-400 hover:text-green-300 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-white font-medium truncate">{recording.title}</h4>
                      <button
                        onClick={() => startEdit(recording)}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center space-x-4 text-xs text-gray-400">
                    <span>{formatDuration(recording.duration)}</span>
                    <span>{formatFileSize(recording.file_size)}</span>
                    {recording.detected_key && (
                      <span className="text-blue-400">Key: {recording.detected_key} {recording.detected_mode}</span>
                    )}
                    <span>{new Date(recording.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handlePlay(recording)}
                    className={`p-2 rounded-lg transition-colors ${
                      playingId === recording.id
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {playingId === recording.id ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(recording)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecordingsList;
