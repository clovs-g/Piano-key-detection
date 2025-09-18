import React from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { AudioState } from '../types/audio';

interface AudioStatusIndicatorProps {
  audioState: AudioState;
  amplitude: number;
  noiseGateOpen: boolean;
  isRecording: boolean;
}

const AudioStatusIndicator: React.FC<AudioStatusIndicatorProps> = ({
  audioState,
  amplitude,
  noiseGateOpen,
  isRecording
}) => {
  const getStatusColor = () => {
    if (!isRecording) return '#666666';
    
    switch (audioState) {
      case AudioState.MUSICAL_INPUT:
      case AudioState.PROCESSING:
        return '#00ff88'; // Bright Green - Musical input detected
      case AudioState.NOISE_DETECTED:
        return '#ffb84e'; // Orange - Noise detected
      case AudioState.IDLE:
        return noiseGateOpen ? '#4e9cff' : '#666666'; // Blue if gate open, gray if closed
      default:
        return '#666666';
    }
  };

  const getStatusText = () => {
    if (!isRecording) return 'Microphone Off';
    
    switch (audioState) {
      case AudioState.MUSICAL_INPUT:
        return 'Musical Input Detected';
      case AudioState.PROCESSING:
        return 'Processing Audio';
      case AudioState.NOISE_DETECTED:
        return 'Background Noise';
      case AudioState.IDLE:
        return noiseGateOpen ? 'Audio Detected' : 'Listening...';
      default:
        return 'Ready';
    }
  };

  const getIcon = () => {
    if (!isRecording) {
      return <MicOff className="w-5 h-5" />;
    }
    
    if (audioState === AudioState.MUSICAL_INPUT || audioState === AudioState.PROCESSING) {
      return <Volume2 className="w-5 h-5" />;
    }
    
    return <Mic className="w-5 h-5" />;
  };

  const amplitudeNormalized = Math.max(0, Math.min(1, (amplitude + 60) / 40));
  const statusColor = getStatusColor();

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div 
            className="p-2 rounded-full transition-colors duration-200"
            style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
          >
            {getIcon()}
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Audio Status</h3>
            <p 
              className="text-xs transition-colors duration-200" 
              style={{ color: statusColor }}
            >
              {getStatusText()}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-xs text-gray-400">Level</div>
          <div className="text-sm font-mono text-white">
            {amplitude.toFixed(1)}dB
          </div>
        </div>
      </div>

      {/* Audio Level Meter */}
      <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="absolute left-0 top-0 h-full transition-all duration-100 rounded-full"
          style={{ 
            width: `${amplitudeNormalized * 100}%`,
            backgroundColor: statusColor
          }}
        />
        
        {/* Noise Gate Threshold Indicator */}
        <div 
          className="absolute top-0 h-full w-0.5 bg-white/30"
          style={{ left: '25%' }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>-60dB</span>
        <span className="text-white/50">Gate</span>
        <span>-20dB</span>
      </div>

      {/* Gate Status */}
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="text-gray-400">Noise Gate:</span>
        <span className={`font-medium ${noiseGateOpen ? 'text-blue-400' : 'text-gray-500'}`}>
          {noiseGateOpen ? 'OPEN' : 'CLOSED'}
        </span>
      </div>
    </div>
  );
};

export default AudioStatusIndicator;