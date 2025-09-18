import React from 'react';
import { Music, Lock, Unlock } from 'lucide-react';
import { KeyDetectionResult } from '../types/audio';
import { KeyOverride } from '../types/music';

interface KeyDisplayProps {
  detectedKey: KeyDetectionResult | null;
  keyOverride: KeyOverride;
  confidence: number;
}

const KeyDisplay: React.FC<KeyDisplayProps> = ({
  detectedKey,
  keyOverride,
  confidence
}) => {
  const currentKey = keyOverride.isActive 
    ? { key: keyOverride.selectedKey, mode: keyOverride.selectedMode }
    : detectedKey;

  const displayConfidence = keyOverride.isActive ? 1.0 : confidence;
  
  const getConfidenceColor = (conf: number) => {
    if (conf > 0.8) return '#00ff88';
    if (conf > 0.6) return '#ffb84e';
    return '#ff6b9d';
  };

  const confidenceColor = getConfidenceColor(displayConfidence);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/20 rounded-full">
            <Music className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Detected Key</h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">
                {keyOverride.isActive ? 'Manual Override' : 'Auto Detection'}
              </span>
              {keyOverride.isActive ? (
                <Lock className="w-3 h-3 text-pink-400" />
              ) : (
                <Unlock className="w-3 h-3 text-gray-400" />
              )}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-xs text-gray-400">Confidence</div>
          <div 
            className="text-sm font-mono font-medium"
            style={{ color: confidenceColor }}
          >
            {(displayConfidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Key Display */}
      <div className="text-center mb-4">
        {currentKey ? (
          <div className="space-y-2">
            <div className="text-4xl font-bold text-white">
              {currentKey.key}
              <span className="text-2xl text-gray-400 ml-2">
                {currentKey.mode}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              {currentKey.key} {currentKey.mode} scale
            </div>
          </div>
        ) : (
          <div className="text-gray-500">
            <div className="text-2xl font-bold">- -</div>
            <div className="text-sm">No key detected</div>
          </div>
        )}
      </div>

      {/* Confidence Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Stability</span>
          <span>{(displayConfidence * 100).toFixed(0)}%</span>
        </div>
        <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full transition-all duration-300 rounded-full"
            style={{ 
              width: `${displayConfidence * 100}%`,
              backgroundColor: confidenceColor
            }}
          />
        </div>
      </div>

      {/* Mode Indicator */}
      {keyOverride.isActive && (
        <div className="mt-3 p-2 bg-pink-500/10 rounded border border-pink-500/20">
          <div className="flex items-center justify-center space-x-2 text-pink-400">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">Manual Key Selected</span>
          </div>
          <div className="text-xs text-pink-300 text-center mt-1">
            Press different key to change, double-tap to return to auto
          </div>
        </div>
      )}
    </div>
  );
};

export default KeyDisplay;