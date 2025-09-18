import React, { useState, useEffect, useCallback } from 'react';
import { PianoKeyState, KeyOverride } from '../types/music';
import { MusicTheoryEngine } from '../utils/musicTheory';
import { HarmonyAnalysis } from '../utils/audioProcessor';

interface PianoKeyboardProps {
  detectedNotes: string[];
  scaleNotes: string[];
  rootNote: string;
  onKeyOverride: (key: string, mode: 'major' | 'minor') => void;
  keyOverride: KeyOverride;
  melodyNotes: string[];
  chordNotes: string[];
  harmonyAnalysis: HarmonyAnalysis | null;
  showAllNotes?: boolean; // If true, highlight all notes in melodyNotes, not just the first
  title?: string;
}

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  detectedNotes,
  scaleNotes,
  rootNote,
  onKeyOverride,
  keyOverride,
  melodyNotes,
  chordNotes,
  harmonyAnalysis,
  showAllNotes = false,
  title = 'Virtual Piano - Melody Display'
}) => {
  const [keyStates, setKeyStates] = useState<{ [key: string]: PianoKeyState }>({});
  const [longPressKey, setLongPressKey] = useState<string | null>(null);
  const [longPressTimeout, setLongPressTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Generate piano keys (2 octaves starting from C4)
  const generateKeys = () => {
    const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const blackKeys = ['C#', 'D#', 'F#', 'G#', 'A#'];
    const octaves = [4, 5];
    
    const keys: { note: string; isBlack: boolean; position: number }[] = [];
    
    octaves.forEach(octave => {
      whiteKeys.forEach((note, index) => {
        keys.push({ 
          note: `${note}${octave}`, 
          isBlack: false, 
          position: octave * 7 + index 
        });
        
        const blackKey = blackKeys.find(bk => bk.startsWith(note));
        if (blackKey) {
          keys.push({ 
            note: `${blackKey}${octave}`, 
            isBlack: true, 
            position: octave * 7 + index + 0.5 
          });
        }
      });
    });
    
    return keys.sort((a, b) => a.position - b.position);
  };

  const keys = generateKeys();

  // Update key states - show only single note (melody) or all notes (chord) depending on showAllNotes
  useEffect(() => {
    const newKeyStates: { [key: string]: PianoKeyState } = {};
  const activeMelodyNotes = showAllNotes ? melodyNotes : (melodyNotes.length > 0 ? [melodyNotes[0]] : []);
    keys.forEach(key => {
      const noteName = key.note.slice(0, -1); // Remove octave number
      const isMelodyNote = activeMelodyNotes.includes(noteName);
      const isActive = isMelodyNote;
      newKeyStates[key.note] = {
        note: key.note,
        isPressed: false,
        isActive: isActive,
        isRoot: noteName === rootNote,
        isManuallySelected: keyOverride.isActive && keyOverride.selectedKey === noteName,
        longPressActive: longPressKey === key.note,
        isLeftHand: false, // Never show left hand on piano
        isRightHand: isMelodyNote, // Only melody notes = right hand
        isInScale: scaleNotes.includes(noteName)
      };
    });
    setKeyStates(newKeyStates);
  }, [melodyNotes, scaleNotes, rootNote, keyOverride, longPressKey, keys, showAllNotes]);

  // Handle key press start
  const handleKeyPress = useCallback((keyNote: string) => {
    const noteName = keyNote.slice(0, -1);
    
    setKeyStates(prev => ({
      ...prev,
      [keyNote]: { ...prev[keyNote], isPressed: true }
    }));

    const timeout = setTimeout(() => {
      setLongPressKey(keyNote);
      onKeyOverride(noteName, 'major');
    }, 500);

    setLongPressTimeout(timeout);
  }, [onKeyOverride]);

  // Handle key press end
  const handleKeyRelease = useCallback((keyNote: string) => {
    const noteName = keyNote.slice(0, -1);
    
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }

    setKeyStates(prev => ({
      ...prev,
      [keyNote]: { ...prev[keyNote], isPressed: false }
    }));

    if (longPressKey !== keyNote && keyOverride.isActive) {
      onKeyOverride(noteName, keyOverride.selectedMode);
    }

    setLongPressKey(null);
  }, [longPressTimeout, longPressKey, keyOverride, onKeyOverride]);

  // Simplified key color system - ONLY for melody notes
  const getKeyColor = (key: { note: string; isBlack: boolean }) => {
    const state = keyStates[key.note];
    if (!state) return key.isBlack ? '#2a2a2a' : '#ffffff';

    // Priority order for colors
    if (state.longPressActive) return '#00ff88'; // Bright green for long press
    if (state.isPressed) return '#4e9cff'; // Blue for pressed
    if (state.isManuallySelected) return '#ff6b9d'; // Pink for manual selection
    if (state.isRoot) return '#ffb84e'; // Orange for root note
    
    // ONLY melody notes get green color
    if (state.isRightHand && state.isActive) {
      return '#00ff88'; // Bright green for melody ONLY
    }
    
    // Scale notes get subtle highlighting
    if (state.isInScale) return key.isBlack ? '#404040' : '#f8f8f8';
    
    return key.isBlack ? '#2a2a2a' : '#ffffff';
  };

  // Simplified key border - ONLY for melody notes
  const getKeyBorder = (key: { note: string; isBlack: boolean }) => {
    const state = keyStates[key.note];
    if (!state) return key.isBlack ? '#444444' : '#cccccc';

    if (state.longPressActive) return '#00ff88';
    if (state.isPressed) return '#4e9cff';
    if (state.isManuallySelected) return '#ff6b9d';
    if (state.isRoot) return '#ffb84e';
    
    // ONLY melody notes get green border
    if (state.isRightHand && state.isActive) return '#00ff88';
    
    return key.isBlack ? '#444444' : '#cccccc';
  };

  // Simplified glow effect - ONLY for melody notes
  const getKeyGlow = (key: { note: string; isBlack: boolean }) => {
    const state = keyStates[key.note];
    if (!state) return '';

    // ONLY melody notes get glow effect
    if (state.isRightHand && state.isActive) return '0 0 15px rgba(0, 255, 136, 0.8)';
    
    return '';
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="text-xs text-gray-400">
          Long press any key to set manual override
        </div>
      </div>

      {/* Melody Analysis Display - ALWAYS show this, even if no melody notes */}
      {harmonyAnalysis ? (
        <div className="mb-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-white">
              Melody Detection: <span className="text-green-300">Active</span>
            </div>
            <div className="text-xs text-gray-400">
              Tempo: {harmonyAnalysis.rhythmData.tempo} BPM | Beat: {harmonyAnalysis.rhythmData.currentBeat}/4
            </div>
          </div>
          {melodyNotes.length > 0 ? (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-green-400"></div>
              <span className="text-green-300 text-sm">
                <strong>Melody Notes:</strong> {melodyNotes.join(', ')}
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-gray-400"></div>
              <span className="text-gray-300 text-sm">
                <strong>No melody detected</strong>
              </span>
            </div>
          )}
          {harmonyAnalysis.rhythmData.isOnBeat && (
            <div className="mt-2 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-green-300 text-xs ml-2">On Beat</span>
            </div>
          )}
        </div>
      ) : null}

      {/* Piano Keys Container */}
      <div className="relative bg-gray-900 rounded-lg p-4 overflow-x-auto">
        <div className="relative flex items-end" style={{ minWidth: '800px', height: '120px' }}>
          {/* White Keys */}
          {keys.filter(key => !key.isBlack).map((key, index) => (
            <button
              key={key.note}
              className="relative border-2 rounded-b-lg transition-all duration-150 select-none"
              style={{
                width: '50px',
                height: '100px',
                backgroundColor: getKeyColor(key),
                borderColor: getKeyBorder(key),
                boxShadow: getKeyGlow(key),
                marginRight: index < keys.filter(k => !k.isBlack).length - 1 ? '2px' : '0'
              }}
              onMouseDown={() => handleKeyPress(key.note)}
              onMouseUp={() => handleKeyRelease(key.note)}
              onMouseLeave={() => handleKeyRelease(key.note)}
              onTouchStart={(e) => {
                e.preventDefault();
                handleKeyPress(key.note);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleKeyRelease(key.note);
              }}
            >
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-600">
                {key.note.slice(0, -1)}
              </div>
              
              {/* ONLY show melody note indicators */}
              {keyStates[key.note]?.isRightHand && keyStates[key.note]?.isActive && (
                <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-green-400 border border-green-200"></div>
              )}
            </button>
          ))}

          {/* Black Keys */}
          {keys.filter(key => key.isBlack).map((key) => {
            const whiteKeysBefore = keys.filter(k => !k.isBlack && k.position < key.position).length;
            const leftOffset = whiteKeysBefore * 52 - 15;
            
            return (
              <button
                key={key.note}
                className="absolute border-2 rounded-b-lg transition-all duration-150 select-none z-10"
                style={{
                  width: '30px',
                  height: '65px',
                  left: `${leftOffset}px`,
                  backgroundColor: getKeyColor(key),
                  borderColor: getKeyBorder(key),
                  boxShadow: getKeyGlow(key)
                }}
                onMouseDown={() => handleKeyPress(key.note)}
                onMouseUp={() => handleKeyRelease(key.note)}
                onMouseLeave={() => handleKeyRelease(key.note)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleKeyPress(key.note);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleKeyRelease(key.note);
                }}
              >
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs font-medium text-white">
                  {key.note.slice(0, -1)}
                </div>
                
                {/* ONLY show melody note indicators for black keys */}
                {keyStates[key.note]?.isRightHand && keyStates[key.note]?.isActive && (
                  <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-400 border border-green-200"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Simplified Legend - ONLY melody-focused */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#00ff88' }}></div>
          <span className="text-gray-300">Melody Notes</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ffb84e' }}></div>
          <span className="text-gray-300">Root Note</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ff6b9d' }}></div>
          <span className="text-gray-300">Manual Lock</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded border border-gray-400" style={{ backgroundColor: '#f8f8f8' }}></div>
          <span className="text-gray-300">In Scale</span>
        </div>
      </div>

      {/* Simplified Playing Instructions - ONLY melody-focused */}
      <div className="mt-3 text-xs text-gray-400 text-center space-y-1">
        <p>🎹 <span className="text-green-400">Green keys</span> = Melody notes being played</p>
        <p>The virtual piano shows only the melody line (single notes) that you're playing</p>
        <p>Chord notes are detected but not displayed on the piano for cleaner melody visualization</p>
      </div>
    </div>
  );
};

export default PianoKeyboard;