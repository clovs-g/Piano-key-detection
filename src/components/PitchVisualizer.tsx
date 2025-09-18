import React, { useEffect, useRef } from 'react';
import { PitchData } from '../types/audio';
import { TrendingUp } from 'lucide-react';

interface PitchVisualizerProps {
  pitchHistory: PitchData[];
  isActive: boolean;
}

const PitchVisualizer: React.FC<PitchVisualizerProps> = ({
  pitchHistory,
  isActive
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (!isActive || pitchHistory.length < 2) {
      // Draw inactive state
      ctx.fillStyle = '#374151';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for musical input...', rect.width / 2, rect.height / 2);
      return;
    }

    // Draw pitch graph
    const maxHistory = 100;
    const recentHistory = pitchHistory.slice(-maxHistory);
    
    if (recentHistory.length < 2) return;

    // Calculate frequency range
    const frequencies = recentHistory.map(p => p.frequency);
    const minFreq = Math.min(...frequencies) * 0.9;
    const maxFreq = Math.max(...frequencies) * 1.1;
    const freqRange = maxFreq - minFreq;

    // Draw grid lines
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines (frequency)
    for (let i = 0; i <= 4; i++) {
      const y = (rect.height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
      
      // Frequency labels
      const freq = maxFreq - (freqRange / 4) * i;
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${freq.toFixed(0)}Hz`, 5, y - 5);
    }

    // Vertical grid lines (time)
    for (let i = 0; i <= 10; i++) {
      const x = (rect.width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }

    // Draw pitch line
    ctx.strokeStyle = '#4e9cff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    recentHistory.forEach((pitch, index) => {
      const x = (index / (recentHistory.length - 1)) * rect.width;
      const y = rect.height - ((pitch.frequency - minFreq) / freqRange) * rect.height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw confidence overlay
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1;
    ctx.beginPath();

    recentHistory.forEach((pitch, index) => {
      const x = (index / (recentHistory.length - 1)) * rect.width;
      const y = rect.height - (pitch.confidence * rect.height);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw current frequency indicator
    if (recentHistory.length > 0) {
      const currentPitch = recentHistory[recentHistory.length - 1];
      const x = rect.width - 10;
      const y = rect.height - ((currentPitch.frequency - minFreq) / freqRange) * rect.height;
      
      ctx.fillStyle = '#4e9cff';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Current frequency text
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${currentPitch.frequency.toFixed(1)}Hz`, rect.width - 20, y - 10);
    }

  }, [pitchHistory, isActive]);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/20 rounded-full">
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Pitch Analysis</h3>
            <p className="text-xs text-gray-400">
              {isActive ? 'Real-time frequency tracking' : 'Waiting for input'}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-xs text-gray-400">History</div>
          <div className="text-sm font-mono text-white">
            {pitchHistory.length}/100
          </div>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-32 rounded bg-gray-900"
          style={{ width: '100%', height: '128px' }}
        />
        
        {/* Legend */}
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-0.5 bg-blue-400"></div>
              <span>Frequency</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-0.5 bg-green-400"></div>
              <span>Confidence</span>
            </div>
          </div>
          <span>Time →</span>
        </div>
      </div>
    </div>
  );
};

export default PitchVisualizer;