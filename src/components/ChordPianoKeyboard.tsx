import React, { useState, useEffect, useCallback } from 'react';
import { PianoKeyState, KeyOverride } from '../types/music';
import { HarmonyAnalysis } from '../utils/audioProcessor';
import { MusicTheoryEngine } from '../utils/musicTheory';

interface ChordPianoKeyboardProps {
  chordNotes: string[];
  scaleNotes: string[];
  rootNote: string;
  onKeyOverride: (key: string, mode: 'major' | 'minor') => void;
  keyOverride: KeyOverride;
  harmonyAnalysis: HarmonyAnalysis | null;
}

const ChordPianoKeyboard: React.FC<ChordPianoKeyboardProps> = ({
  chordNotes,
  scaleNotes,
  rootNote,
  onKeyOverride,
  keyOverride,
  // harmonyAnalysis
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
        keys.push({ note: `${note}${octave}`, isBlack: false, position: octave * 7 + index });
        const blackKey = blackKeys.find(bk => bk.startsWith(note));
        if (blackKey) {
          keys.push({ note: `${blackKey}${octave}`, isBlack: true, position: octave * 7 + index + 0.5 });
        }
      });
    });
    return keys.sort((a, b) => a.position - b.position);
  };
  const keys = generateKeys();

  useEffect(() => {
    const newKeyStates: { [key: string]: PianoKeyState } = {};
    keys.forEach(key => {
      const noteName = key.note.slice(0, -1);
      const isChordNote = chordNotes.includes(noteName);
      // If the note is in the current chord, mark as pressed/active
      newKeyStates[key.note] = {
        note: key.note,
        isPressed: isChordNote, // visually hold all chord notes
        isActive: isChordNote,
        isRoot: noteName === rootNote,
        isManuallySelected: keyOverride.isActive && keyOverride.selectedKey === noteName,
        longPressActive: longPressKey === key.note,
        isLeftHand: isChordNote,
        isRightHand: false,
        isInScale: scaleNotes.includes(noteName)
      };
    });
    setKeyStates(newKeyStates);
  }, [chordNotes, scaleNotes, rootNote, keyOverride, longPressKey, keys]);

  const handleKeyPress = useCallback((keyNote: string) => {
    const noteName = keyNote.slice(0, -1);
    setKeyStates(prev => ({ ...prev, [keyNote]: { ...prev[keyNote], isPressed: true } }));
    const timeout = setTimeout(() => {
      setLongPressKey(keyNote);
      onKeyOverride(noteName, 'major');
    }, 500);
    setLongPressTimeout(timeout);
  }, [onKeyOverride]);

  const handleKeyRelease = useCallback((keyNote: string) => {
    const noteName = keyNote.slice(0, -1);
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }
    setKeyStates(prev => ({ ...prev, [keyNote]: { ...prev[keyNote], isPressed: false } }));
    if (longPressKey !== keyNote && keyOverride.isActive) {
      onKeyOverride(noteName, keyOverride.selectedMode);
    }
    setLongPressKey(null);
  }, [longPressTimeout, longPressKey, keyOverride, onKeyOverride]);

  const getKeyColor = (key: { note: string; isBlack: boolean }) => {
    const state = keyStates[key.note];
    if (!state) return key.isBlack ? '#2a2a2a' : '#ffffff';
    if (state.longPressActive) return '#4e9cff';
    if (state.isPressed) return '#4e9cff';
    if (state.isManuallySelected) return '#ff6b9d';
    if (state.isRoot) return '#ffb84e';
    if (state.isLeftHand && state.isActive) return '#4e9cff';
    if (state.isInScale) return key.isBlack ? '#404040' : '#f8f8f8';
    return key.isBlack ? '#2a2a2a' : '#ffffff';
  };
  const getKeyBorder = (key: { note: string; isBlack: boolean }) => {
    const state = keyStates[key.note];
    if (!state) return key.isBlack ? '#444444' : '#cccccc';
    if (state.longPressActive) return '#4e9cff';
    if (state.isPressed) return '#4e9cff';
    if (state.isManuallySelected) return '#ff6b9d';
    if (state.isRoot) return '#ffb84e';
    if (state.isLeftHand && state.isActive) return '#4e9cff';
    return key.isBlack ? '#444444' : '#cccccc';
  };
  const getKeyGlow = (key: { note: string; isBlack: boolean }) => {
    const state = keyStates[key.note];
    if (!state) return '';
    if (state.isLeftHand && state.isActive) return '0 0 15px rgba(78, 156, 255, 0.8)';
    return '';
  };

  const identifiedChord = chordNotes.length > 0 ? MusicTheoryEngine.identifyChord(chordNotes) : null;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-white">Virtual Piano - Chord Display</h3>
          {identifiedChord && (
            <div className="px-4 py-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <div className="text-xs text-blue-300 mb-1">Current Chord</div>
              <div className="text-xl font-bold text-blue-400">{identifiedChord}</div>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-400">Long press any key to set manual override</div>
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
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-600">
                {key.note.slice(0, -1)}
              </div>
              {/* Chord note indicator */}
              {keyStates[key.note]?.isLeftHand && keyStates[key.note]?.isActive && (
                <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-blue-400 border border-blue-200"></div>
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
                title={key.note}
              >
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs font-medium text-white">
                  {key.note.slice(0, -1)}
                </div>
                {/* Chord note indicator for black keys */}
                {keyStates[key.note]?.isLeftHand && keyStates[key.note]?.isActive && (
                  <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-400 border border-blue-200"></div>
                )}
              </button>
            );
          })}
        </div>
        {chordNotes.length === 0 && (
          <div className="flex items-center justify-center h-20 text-gray-400 text-sm">
            No chord detected in the audio.
          </div>
        )}
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

export default ChordPianoKeyboard;
