export interface Note {
  name: string;
  frequency: number;
  midiNumber: number;
  octave: number;
}

export interface Scale {
  root: string;
  mode: 'major' | 'minor';
  notes: string[];
  chords: ChordProgression[];
}

export interface ChordProgression {
  numeral: string;
  name: string;
  notes: string[];
  function: 'tonic' | 'subdominant' | 'dominant' | 'secondary';
  color: string;
}

export interface PianoKeyState {
  note: string;
  isPressed: boolean;
  isActive: boolean;
  isRoot: boolean;
  isManuallySelected: boolean;
  longPressActive: boolean;
  isLeftHand?: boolean;
  isRightHand?: boolean;
  isInScale?: boolean;
}

export interface KeyOverride {
  isActive: boolean;
  selectedKey: string;
  selectedMode: 'major' | 'minor';
  timestamp: number;
}