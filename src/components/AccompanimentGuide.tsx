import React from 'react';
import { Music2, Lock, Unlock } from 'lucide-react';
import { Scale, KeyOverride } from '../types/music';
import { MusicTheoryEngine } from '../utils/musicTheory';

interface AccompanimentGuideProps {
  scale: Scale | null;
  keyOverride: KeyOverride;
}

const AccompanimentGuide: React.FC<AccompanimentGuideProps> = ({
  scale,
  keyOverride
}) => {
  if (!scale) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-purple-500/20 rounded-full">
            <Music2 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Accompaniment Guide</h3>
            <p className="text-sm text-gray-400">Waiting for key detection...</p>
          </div>
        </div>
        
        <div className="text-center text-gray-500 py-8">
          <Music2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Start singing or playing to see chord suggestions</p>
        </div>
      </div>
    );
  }

  const relativeKey = MusicTheoryEngine.getRelativeKey(scale.root, scale.mode);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-500/20 rounded-full">
            <Music2 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Accompaniment Guide</h3>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-400">
                {scale.root} {scale.mode} scale
              </p>
              {keyOverride.isActive ? (
                <Lock className="w-3 h-3 text-pink-400" />
              ) : (
                <Unlock className="w-3 h-3 text-gray-400" />
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-400">Relative Key</div>
          <div className="text-sm font-medium text-white">
            {relativeKey.key} {relativeKey.mode}
          </div>
        </div>
      </div>

      {/* Scale Notes */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Scale Notes</h4>
        <div className="flex flex-wrap gap-2">
          {scale.notes.map((note, index) => (
            <div
              key={note}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                note === scale.root
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}
            >
              {note}
              <span className="text-xs opacity-70 ml-1">
                {index === 0 ? '1' : 
                 index === 1 ? '2' :
                 index === 2 ? '3' :
                 index === 3 ? '4' :
                 index === 4 ? '5' :
                 index === 5 ? '6' : '7'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chord Progressions */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Chord Progressions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {scale.chords
            .filter((chord) => chord.type === 'major' || chord.type === 'minor')
            .map((chord) => (
              <div
                key={chord.numeral}
                className="bg-gray-700/50 rounded-lg p-3 border border-gray-600"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-white">
                      {chord.numeral}
                    </span>
                    <span className="text-sm text-gray-300">
                      {chord.name}
                    </span>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: chord.color }}
                  />
                </div>
                <div className="text-xs text-gray-400 mb-2 capitalize">
                  {chord.function}
                </div>
                <div className="flex space-x-1">
                  {chord.notes.map((note) => (
                    <span
                      key={note}
                      className="px-2 py-1 bg-gray-600 rounded text-xs font-medium text-white"
                    >
                      {note}
                    </span>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Mode Status */}
      {keyOverride.isActive && (
        <div className="mt-4 p-3 bg-pink-500/10 rounded-lg border border-pink-500/20">
          <div className="flex items-center justify-center space-x-2 text-pink-400">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">Manual Key Lock Active</span>
          </div>
          <div className="text-xs text-pink-300 text-center mt-1">
            Chord progressions locked to {scale.root} {scale.mode}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccompanimentGuide;