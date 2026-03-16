import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Pause, Trash2, Save } from 'lucide-react';
import { Instrumental } from '../lib/supabase';
import { InstrumentalService } from '../services/instrumentalService';

interface InstrumentalRecorderProps {
  onInstrumentalSaved?: (instrumental: Instrumental) => void;
  onRefresh?: () => void;
}

const InstrumentalRecorder: React.FC<InstrumentalRecorderProps> = ({ onInstrumentalSaved, onRefresh }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordingTitle, setRecordingTitle] = useState('');
  const [recordingTempo, setRecordingTempo] = useState('120');
  const [recordingKey, setRecordingKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      streamRef.current = stream;

      const options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
        options.audioBitsPerSecond = 128000;
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
        options.audioBitsPerSecond = 128000;
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        options.mimeType = 'audio/wav';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        let mimeType = options.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recordingStartTimeRef.current = Date.now();
      setDuration(0);
      mediaRecorder.start();
      setIsRecording(true);

      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));
      }, 100);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Unable to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }
  };

  const playRecording = () => {
    if (!recordedBlob) return;

    if (isPlaying && audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      const url = URL.createObjectURL(recordedBlob);
      const audio = new Audio(url);

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };

      audioElementRef.current = audio;
      audio.play();
      setIsPlaying(true);
    }
  };

  const clearRecording = () => {
    if (isPlaying && audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    }
    setRecordedBlob(null);
    setDuration(0);
    setRecordingTitle('');
    setRecordingTempo('120');
    setRecordingKey('');
  };

  const saveRecording = async () => {
    if (!recordedBlob || !recordingTitle.trim()) {
      alert('Please enter a title for the instrumental');
      return;
    }

    setIsSaving(true);
    try {
      const instrumental = await InstrumentalService.saveInstrumental(
        recordedBlob,
        recordingTitle.trim(),
        duration,
        parseInt(recordingTempo) || 120,
        recordingKey
      );

      if (instrumental) {
        onInstrumentalSaved?.(instrumental);
        onRefresh?.();
        clearRecording();
      } else {
        alert('Failed to save instrumental');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving instrumental');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  return (
    <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30">
      <h3 className="text-lg font-semibold text-white mb-4">Record Instrumental</h3>

      {!recordedBlob ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex items-center space-x-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                <Mic className="w-5 h-5" />
                <span>Start Recording</span>
              </button>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-white font-medium">{formatDuration(duration)}</span>
                </div>
                <button
                  onClick={stopRecording}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Square className="w-5 h-5" />
                  <span>Stop</span>
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">Recorded Duration</p>
                <p className="text-2xl font-bold text-white">{formatDuration(duration)}</p>
              </div>
              <button
                onClick={playRecording}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isPlaying
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Play</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-3 border-t border-gray-600 pt-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={recordingTitle}
                  onChange={(e) => setRecordingTitle(e.target.value)}
                  placeholder="e.g., Jazz Blues in F"
                  className="w-full bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Tempo (BPM)</label>
                  <input
                    type="number"
                    value={recordingTempo}
                    onChange={(e) => setRecordingTempo(e.target.value)}
                    min="40"
                    max="300"
                    className="w-full bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Key</label>
                  <select
                    value={recordingKey}
                    onChange={(e) => setRecordingKey(e.target.value)}
                    className="w-full bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:outline-none focus:border-blue-400"
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
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={saveRecording}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Instrumental'}</span>
            </button>
            <button
              onClick={clearRecording}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstrumentalRecorder;
