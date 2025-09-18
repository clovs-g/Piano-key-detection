import { Scale, ChordProgression, Note } from '../types/music';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

const MAJOR_CHORD_PROGRESSIONS: ChordProgression[] = [
  { numeral: 'I', name: 'Major', notes: [0, 2, 4], function: 'tonic', color: '#7fff7f' },
  { numeral: 'ii', name: 'minor', notes: [1, 3, 5], function: 'subdominant', color: '#4e9cff' },
  { numeral: 'iii', name: 'minor', notes: [2, 4, 6], function: 'secondary', color: '#4e9cff' },
  { numeral: 'IV', name: 'Major', notes: [3, 5, 0], function: 'subdominant', color: '#7fff7f' },
  { numeral: 'V', name: 'Major', notes: [4, 6, 1], function: 'dominant', color: '#7fff7f' },
  { numeral: 'vi', name: 'minor', notes: [5, 0, 2], function: 'secondary', color: '#4e9cff' },
  { numeral: 'vii°', name: 'diminished', notes: [6, 1, 3], function: 'dominant', color: '#ff6b9d' }
];

const MINOR_CHORD_PROGRESSIONS: ChordProgression[] = [
  { numeral: 'i', name: 'minor', notes: [0, 2, 4], function: 'tonic', color: '#7fff7f' },
  { numeral: 'ii°', name: 'diminished', notes: [1, 3, 5], function: 'subdominant', color: '#ff6b9d' },
  { numeral: 'III', name: 'Major', notes: [2, 4, 6], function: 'secondary', color: '#4e9cff' },
  { numeral: 'iv', name: 'minor', notes: [3, 5, 0], function: 'subdominant', color: '#7fff7f' },
  { numeral: 'V', name: 'Major', notes: [4, 6, 1], function: 'dominant', color: '#7fff7f' },
  { numeral: 'VI', name: 'Major', notes: [5, 0, 2], function: 'secondary', color: '#4e9cff' },
  { numeral: 'VII', name: 'Major', notes: [6, 1, 3], function: 'dominant', color: '#ffe97f' }
];

export class MusicTheoryEngine {
  static getScale(root: string, mode: 'major' | 'minor'): Scale {
    const rootIndex = NOTES.indexOf(root);
    if (rootIndex === -1) throw new Error(`Invalid root note: ${root}`);

    const intervals = mode === 'major' ? MAJOR_INTERVALS : MINOR_INTERVALS;
    const notes = intervals.map(interval => NOTES[(rootIndex + interval) % 12]);
    
    const chordProgressions = mode === 'major' ? MAJOR_CHORD_PROGRESSIONS : MINOR_CHORD_PROGRESSIONS;
    const chords = chordProgressions.map(chord => ({
      ...chord,
      notes: chord.notes.map(noteIndex => notes[noteIndex])
    }));

    return {
      root,
      mode,
      notes,
      chords
    };
  }

  static getNoteFromFrequency(frequency: number): Note {
    const a4 = 440;
    const midiNumber = Math.round(12 * Math.log2(frequency / a4) + 69);
    const octave = Math.floor(midiNumber / 12) - 1;
    const noteIndex = midiNumber % 12;
    
    return {
      name: NOTES[noteIndex],
      frequency,
      midiNumber,
      octave
    };
  }

  static getFrequencyFromNote(note: string, octave: number): number {
    const noteIndex = NOTES.indexOf(note);
    if (noteIndex === -1) throw new Error(`Invalid note: ${note}`);
    
    const midiNumber = (octave + 1) * 12 + noteIndex;
    return 440 * Math.pow(2, (midiNumber - 69) / 12);
  }

  static isChromatic(note: string, scale: Scale): boolean {
    return !scale.notes.includes(note);
  }

  static getChordExtensions(chord: ChordProgression, scale: Scale): string[] {
    const extensions = [];
    const rootIndex = scale.notes.indexOf(chord.notes[0]);
    
    if (rootIndex !== -1) {
      // Add 7th
      const seventhIndex = (rootIndex + 6) % 7;
      extensions.push(`${chord.numeral}7`);
      
      // Add 9th for major chords
      if (chord.function === 'tonic' || chord.function === 'dominant') {
        extensions.push(`${chord.numeral}9`);
      }
      
      // Add suspended chords
      extensions.push(`${chord.numeral}sus2`, `${chord.numeral}sus4`);
    }
    
    return extensions;
  }

  static getAvoidNotes(scale: Scale): string[] {
    const scaleNotes = new Set(scale.notes);
    return NOTES.filter(note => !scaleNotes.has(note));
  }

  static getRelativeKey(key: string, mode: 'major' | 'minor'): { key: string; mode: 'major' | 'minor' } {
    const rootIndex = NOTES.indexOf(key);
    if (rootIndex === -1) throw new Error(`Invalid key: ${key}`);

    if (mode === 'major') {
      // Relative minor is a minor third down
      const relativeMinorIndex = (rootIndex + 9) % 12;
      return { key: NOTES[relativeMinorIndex], mode: 'minor' };
    } else {
      // Relative major is a minor third up
      const relativeMajorIndex = (rootIndex + 3) % 12;
      return { key: NOTES[relativeMajorIndex], mode: 'major' };
    }
  }

  static getCircleOfFifths(): string[] {
    const circle = [];
    let currentNote = 0; // Start with C
    
    for (let i = 0; i < 12; i++) {
      circle.push(NOTES[currentNote]);
      currentNote = (currentNote + 7) % 12; // Move up a fifth
    }
    
    return circle;
  }

  static getKeySignature(key: string, mode: 'major' | 'minor'): { sharps: string[]; flats: string[] } {
    const scale = this.getScale(key, mode);
    const sharps = scale.notes.filter(note => note.includes('#'));
    const flats = scale.notes.filter(note => note.includes('b'));
    
    return { sharps, flats };
  }
}