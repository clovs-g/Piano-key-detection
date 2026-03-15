import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, Volume2, VolumeX } from 'lucide-react';
import { Instrumental } from '../lib/supabase';
import { InstrumentalService } from '../services/instrumentalService';

interface InstrumentalPlayerProps {
  selectedInstrumental: Instrumental | null;
  onClose?: () => void;
}

const InstrumentalPlayer: React.FC<InstrumentalPlayerProps> = ({ selectedInstrumental, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!selectedInstrumental) return;

    const audio = new Audio(selectedInstrumental.audio_url);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      setTotalTime(audio.duration);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const interval = setInterval(() => {
      if (audio.currentTime !== undefined) {
        setCurrentTime(audio.currentTime);
      }
    }, 100);

    audio.volume = volume;

    return () => {
      clearInterval(interval);
      audio.pause();
      audioRef.current = null;
    };
  }, [selectedInstrumental, volume]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!selectedInstrumental) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-blue-900/90 to-cyan-900/90 rounded-lg p-6 border border-blue-500/30 max-w-md w-full shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white truncate">{selectedInstrumental.title}</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-300 mt-2">
              {selectedInstrumental.tempo && <span>{selectedInstrumental.tempo} BPM</span>}
              {selectedInstrumental.key && <span>Key: {selectedInstrumental.key}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max={totalTime || 0}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(totalTime)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={handlePlayPause}
              className={`flex items-center justify-center w-14 h-14 rounded-full font-medium transition-colors ${
                isPlaying
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center space-x-3">
            {volume === 0 ? (
              <VolumeX className="w-4 h-4 text-gray-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-gray-400" />
            )}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
            />
            <span className="text-xs text-gray-400 w-8 text-right">{Math.round(volume * 100)}%</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-black/30 rounded border border-blue-500/20 text-sm text-gray-300">
          <p>Practice along with this instrumental track</p>
        </div>
      </div>
    </div>
  );
};

export default InstrumentalPlayer;
