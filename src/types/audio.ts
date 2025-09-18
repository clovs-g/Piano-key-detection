export interface AudioConfig {
  sampleRate: number;
  bufferSize: number;
  fftSize: number;
  minFreq: number;
  maxFreq: number;
}

export interface NoiseGateConfig {
  thresholdMin: number;
  thresholdMax: number;
  attackTime: number;
  releaseTime: number;
  hysteresis: number;
  adaptiveWindow: number;
}

export interface SignalDetectionConfig {
  harmonicThreshold: number;
  pitchStability: number;
  minDuration: number;
  spectralCentroid: {
    minVocal: number;
    maxVocal: number;
    minPiano: number;
    maxPiano: number;
  };
}

export enum AudioState {
  IDLE = 'idle',
  NOISE_DETECTED = 'noise_detected',
  MUSICAL_INPUT = 'musical_input',
  PROCESSING = 'processing'
}

export interface PitchData {
  frequency: number;
  confidence: number;
  timestamp: number;
}

export interface ChromaData {
  vector: number[];
  dominant: number;
  confidence: number;
}

export interface KeyDetectionResult {
  key: string;
  mode: 'major' | 'minor';
  confidence: number;
  chroma: ChromaData;
}