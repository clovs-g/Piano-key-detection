import React, { useState, useEffect } from 'react';
import { Play, Pause, Trash2, CreditCard as Edit2, Check, X, Music, Upload } from 'lucide-react';
import { Instrumental } from '../lib/supabase';
import { InstrumentalService } from '../services/instrumentalService';

interface InstrumentalsListProps {
  onInstrumentalSelect?: (instrumental: Instrumental) => void;
  onRefresh?: () => void;
}

const InstrumentalsList: React.FC<InstrumentalsListProps> = ({ onInstrumentalSelect, onRefresh }) => {
  const [instrumentals, setInstrumentals] = useState<Instrumental[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTempo, setUploadTempo] = useState('120');
  const [uploadKey, setUploadKey] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  useEffect(() => {
    loadInstrumentals();
  }, []);

  const loadInstrumentals = async () => {
    setLoading(true);
    const data = await InstrumentalService.getAllInstrumentals();
    setInstrumentals(data);
    setLoading(false);
  };

  const handlePlay = (instrumental: Instrumental) => {
    if (playingId === instrumental.id) {
      audioElement?.pause();
      setPlayingId(null);
      setAudioElement(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }

      const audio = new Audio(instrumental.audio_url);
      audio.onended = () => {
        setPlayingId(null);
        setAudioElement(null);
      };
      audio.play();
      setAudioElement(audio);
      setPlayingId(instrumental.id);
    }
  };

  const handleDelete = async (instrumental: Instrumental) => {
    if (!confirm(`Delete "${instrumental.title}"?`)) return;

    if (playingId === instrumental.id) {
      audioElement?.pause();
      setPlayingId(null);
      setAudioElement(null);
    }

    const success = await InstrumentalService.deleteInstrumental(
      instrumental.id,
      instrumental.audio_url
    );
    if (success) {
      await loadInstrumentals();
    }
  };

  const startEdit = (instrumental: Instrumental) => {
    setEditingId(instrumental.id);
    setEditTitle(instrumental.title);
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

    const success = await InstrumentalService.updateInstrumentalTitle(id, editTitle.trim());
    if (success) {
      await loadInstrumentals();
      cancelEdit();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const duration = 0;
      const tempo = parseInt(uploadTempo) || 120;

      const instrumental = await InstrumentalService.saveInstrumental(
        file,
        uploadTitle || file.name,
        duration,
        tempo,
        uploadKey
      );

      if (instrumental) {
        await loadInstrumentals();
        setUploadTitle('');
        setUploadTempo('120');
        setUploadKey('');
        setShowUploadForm(false);
        event.target.value = '';
        onRefresh?.();
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
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

  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Instrumentals Library</h3>
        <div className="text-center text-gray-400 py-8">Loading instrumentals...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Music className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Instrumentals Library</h3>
          <span className="text-sm text-gray-400">({instrumentals.length})</span>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="flex items-center space-x-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm"
        >
          <Upload className="w-4 h-4" />
          <span>Upload</span>
        </button>
      </div>

      {showUploadForm && (
        <div className="mb-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
          <h4 className="text-white font-medium mb-3">Upload Instrumental</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Instrumental name"
                className="w-full bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:outline-none focus:border-green-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Tempo (BPM)</label>
                <input
                  type="number"
                  value={uploadTempo}
                  onChange={(e) => setUploadTempo(e.target.value)}
                  min="40"
                  max="300"
                  className="w-full bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:outline-none focus:border-green-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Key</label>
                <select
                  value={uploadKey}
                  onChange={(e) => setUploadKey(e.target.value)}
                  className="w-full bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:outline-none focus:border-green-400"
                >
                  <option value="">Select key...</option>
                  {keys.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Audio File</label>
              <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-500 rounded-lg cursor-pointer hover:border-green-400 transition-colors">
                <span className="text-gray-300">Choose file...</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {instrumentals.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No instrumentals yet</p>
          <p className="text-sm mt-1">Upload backing tracks to practice with</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {instrumentals.map((instrumental) => (
            <div
              key={instrumental.id}
              className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors cursor-pointer"
              onClick={() => onInstrumentalSelect?.(instrumental)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {editingId === instrumental.id ? (
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 bg-gray-600 text-white px-3 py-1 rounded border border-gray-500 focus:outline-none focus:border-green-400"
                        autoFocus
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') saveEdit(instrumental.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveEdit(instrumental.id);
                        }}
                        className="p-1 text-green-400 hover:text-green-300 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEdit();
                        }}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-white font-medium truncate">{instrumental.title}</h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(instrumental);
                        }}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center space-x-4 text-xs text-gray-400">
                    <span>{formatDuration(instrumental.duration)}</span>
                    <span>{formatFileSize(instrumental.file_size)}</span>
                    {instrumental.tempo && <span>{instrumental.tempo} BPM</span>}
                    {instrumental.key && <span className="text-green-400">Key: {instrumental.key}</span>}
                    <span>{new Date(instrumental.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlay(instrumental);
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      playingId === instrumental.id
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {playingId === instrumental.id ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(instrumental);
                    }}
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

export default InstrumentalsList;
