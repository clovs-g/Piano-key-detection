import React, { useState, useEffect, useCallback } from 'react';
import { PianoKeyState, KeyOverride } from '../types/music';
import { HarmonyAnalysis } from '../utils/audioProcessor';

interface ChordPianoProps {
  chordNotes: string[];
  scaleNotes: string[];
  rootNote: string;
  onKeyOverride: (key: string, mode: 'major' | 'minor') => void;
  keyOverride: KeyOverride;
  harmonyAnalysis: HarmonyAnalysis | null;
  isRecording: boolean;
}

const ChordPiano: React.FC<ChordPianoProps> = ({
  chordNotes,
  scaleNotes,
  rootNote,
  onKeyOverride,
  keyOverride,
  // harmonyAnalysis,
  isRecording
}) => {
  // Debug log for troubleshooting
  console.log('[ChordPiano] isRecording:', isRecording, 'chordNotes.length:', chordNotes.length);

  const [keyStates, setKeyStates] = useState<{ [key: string]: PianoKeyState }>({});
  const [longPressKey, setLongPressKey] = useState<string | null>(null);
  const [longPressTimeout, setLongPressTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Generate piano keys (2 octaves starting from C4, matching melody piano)
  const generateKeys = () => {
    const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const blackKeys = ['C#', 'D#', 'F#', 'G#', 'A#'];
    const octaves = [4, 5]; // Match melody piano octaves
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

  // Update key states - ONLY show chord notes (left hand)
  useEffect(() => {
    const newKeyStates: { [key: string]: PianoKeyState } = {};
    
    keys.forEach(key => {
      const noteName = key.note.slice(0, -1); // Remove octave number
      
      // ONLY show chord notes - ignore melody notes completely
      const isChordNote = chordNotes.includes(noteName);
      const isActive = isChordNote; // Only chord notes are considered active
      
      newKeyStates[key.note] = {
        note: key.note,
        isPressed: false,
        isActive: isActive,
        isRoot: noteName === rootNote,
        isManuallySelected: keyOverride.isActive && keyOverride.selectedKey === noteName,
        longPressActive: longPressKey === key.note,
        isLeftHand: isChordNote, // Only chord notes = left hand
        isRightHand: false, // Never show right hand on chord piano
        isInScale: scaleNotes.includes(noteName)
      };
    });
    
    setKeyStates(newKeyStates);
  }, [chordNotes, scaleNotes, rootNote, keyOverride, longPressKey, keys]);

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

  // Chord-focused key color system
  const getKeyColor = (key: { note: string; isBlack: boolean }) => {
    const state = keyStates[key.note];
    if (!state) return key.isBlack ? '#2a2a2a' : '#ffffff';

    // Priority order for colors
    if (state.longPressActive) return '#4e9cff'; // Blue for long press
    if (state.isPressed) return '#7c3aed'; // Purple for pressed
    if (state.isManuallySelected) return '#ff6b9d'; // Pink for manual selection
    if (state.isRoot) return '#ffb84e'; // Orange for root note
    
    // ONLY chord notes get blue color
    if (state.isLeftHand && state.isActive) {
      return '#4e9cff'; // Blue for chords ONLY
    }
    
    // Scale notes get subtle highlighting
    if (state.isInScale) return key.isBlack ? '#404040' : '#f8f8f8';
    
    return key.isBlack ? '#2a2a2a' : '#ffffff';
  };

  // Chord-focused key border
  const getKeyBorder = (key: { note: string; isBlack: boolean }) => {
    const state = keyStates[key.note];
    if (!state) return key.isBlack ? '#444444' : '#cccccc';

    if (state.longPressActive) return '#4e9cff';
    if (state.isPressed) return '#7c3aed';
    if (state.isManuallySelected) return '#ff6b9d';
    if (state.isRoot) return '#ffb84e';
    
    // ONLY chord notes get blue border
    if (state.isLeftHand && state.isActive) return '#4e9cff';
    
    return key.isBlack ? '#444444' : '#cccccc';
  };

  // Chord-focused glow effect
  const getKeyGlow = (key: { note: string; isBlack: boolean }) => {
    const state = keyStates[key.note];
    if (!state) return '';

    // ONLY chord notes get glow effect
    if (state.isLeftHand && state.isActive) return '0 0 15px rgba(78, 156, 255, 0.8)';
    
    return '';
  };

  // Analyze chord type from detected notes
  const analyzeChordType = (notes: string[]): string => {
    if (notes.length < 2) return 'Single Note';
    if (notes.length === 2) return 'Interval';
    if (notes.length === 3) return 'Triad';
    if (notes.length === 4) return 'Seventh Chord';
    return 'Extended Chord';
  };

  const currentChordType = chordNotes.length > 0 ? analyzeChordType(chordNotes) : 'No Chord';

  // Chord detection status label logic
  let chordStatus = 'Inactive';
  if (isRecording) {
    if (chordNotes.length >= 2) {
      chordStatus = 'Active';
    } else {
      chordStatus = 'Listening (no chord detected)';
    }
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700 mt-2">
      <div className="flex items-center justify-end mb-4">
        <div className="text-xs text-gray-400">
          {currentChordType} | <span className={chordStatus === 'Active' ? 'text-green-400' : 'text-gray-400'}>{chordStatus}</span>
        </div>
      </div>
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
              title={key.note}
            >
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-base font-medium text-gray-600">
                {key.note.slice(0, -1)}
              </div>
              {/* Chord note indicator */}
              {keyStates[key.note]?.isLeftHand && keyStates[key.note]?.isActive && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-400 border-2 border-blue-200"></div>
              )}
            </button>
          ))}

          {/* Black Keys */}
          {keys.filter(key => key.isBlack).map((key) => {
            const whiteKeysBefore = keys.filter(k => !k.isBlack && k.position < key.position).length;
            const leftOffset = whiteKeysBefore * 62 - 18;
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
                title={key.note}
              >
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs font-medium text-white">
                  {key.note.slice(0, -1)}
                </div>
                {/* Chord note indicator for black keys */}
                {keyStates[key.note]?.isLeftHand && keyStates[key.note]?.isActive && (
                  <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-blue-400 border border-blue-200"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {/* Legend for Chord Piano */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#4e9cff' }}></div>
          <span className="text-gray-300">Chord Notes</span>
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
      {/* Instructions for Chord Piano */}
      <div className="mt-3 text-xs text-gray-400 text-center space-y-1">
        <p>🎹 <span className="text-blue-400">Blue keys</span> = Chord notes being played</p>
        <p>The virtual piano shows only the harmony/chord notes (multiple notes) that you're playing</p>
        <p>Melody notes are detected but not displayed on the chord piano for clarity</p>
      </div>
    </div>
  );
};

export default ChordPiano;