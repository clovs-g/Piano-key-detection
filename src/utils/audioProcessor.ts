import { AudioConfig, NoiseGateConfig, SignalDetectionConfig, AudioState, PitchData, ChromaData } from '../types/audio';

export interface RhythmData {
  tempo: number;
  beatStrength: number;
  timeSignature: string;
  currentBeat: number;
  isOnBeat: boolean;
}

export interface HarmonyAnalysis {
  melodyNotes: string[];
  chordNotes: string[];
  rhythmData: RhythmData;
  harmonyType: 'melody' | 'chord' | 'both' | 'none';
}

export class SmartAudioProcessor {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isProcessing = false;
  private noiseFloor = -60;
  private gateThreshold = -35;
  private currentState = AudioState.IDLE;
  private pitchHistory: PitchData[] = [];
  private animationFrame: number | null = null;
  private harmonicHistory: number[] = [];
  private pitchStabilityHistory: number[] = [];
  
  // Enhanced rhythm and harmony detection
  private amplitudeHistory: number[] = [];
  private beatHistory: number[] = [];
  private lastBeatTime = 0;
  private tempoHistory: number[] = [];
  private simultaneousNotes: Map<number, string[]> = new Map();
  private melodySequence: Array<{note: string, time: number, duration: number}> = [];
  private chordSequence: Array<{notes: string[], time: number, duration: number}> = [];
  
  // Note memory for single notes
  private lastMelodyNote: string | null = null;
  private lastMelodyNoteTime: number = 0;
  private melodyNoteMemoryMs: number = 200;
  
  // Chord memory for smoothing
  private lastChordNotes: string[] = [];
  private lastChordTime: number = 0;
  private chordMemoryMs: number = 50;
  
  private config: AudioConfig = {
    sampleRate: 44100,
    bufferSize: 2048,
    fftSize: 4096,
    minFreq: 80,
    maxFreq: 1100
  };

  private noiseGate: NoiseGateConfig = {
    thresholdMin: -65,
    thresholdMax: -20,
    attackTime: 0.01,
    releaseTime: 0.1,
    hysteresis: 3,
    adaptiveWindow: 2.0
  };

  private signalDetection: SignalDetectionConfig = {
    harmonicThreshold: 0.18,
    pitchStability: 0.35,
    minDuration: 0.12,
    spectralCentroid: {
      minVocal: 150,
      maxVocal: 1200,
      minPiano: 27,
      maxPiano: 4186
    }
  };

  // Polyphonic mode for audio song chord detection
  private polyphonicMode: boolean = false;

  async initialize(): Promise<boolean> {
    try {
      if (this.audioContext && this.analyser && this.audioContext.state !== 'closed') {
        console.log('Audio processor already initialized');
        return true;
      }

      console.log('Requesting microphone access...');
      this.cleanup();
      
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: this.config.sampleRate,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1
        } 
      });
      
      console.log('Microphone access granted, creating audio context...');
      
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate
      });
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('Audio context resumed');
      }
      
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = 0.2;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;
      
      this.source.connect(this.analyser);
      
      console.log('Audio processor initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      this.cleanup();
      return false;
    }
  }

  private cleanup(): void {
    this.isProcessing = false;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.analyser = null;
    
    // Reset all analysis data
    this.pitchHistory = [];
    this.harmonicHistory = [];
    this.pitchStabilityHistory = [];
    this.amplitudeHistory = [];
    this.beatHistory = [];
    this.tempoHistory = [];
    this.simultaneousNotes.clear();
    this.melodySequence = [];
    this.chordSequence = [];
    this.currentState = AudioState.IDLE;
  }

  start(onAudioData: (data: {
    state: AudioState;
    pitch: PitchData | null;
    chroma: ChromaData | null;
    amplitude: number;
    noiseGateOpen: boolean;
    harmonyAnalysis: HarmonyAnalysis | null;
  }) => void): void {
    if (!this.analyser || !this.audioContext || this.audioContext.state === 'closed') {
      console.error('Audio processor not initialized');
      return;
    }
    
    this.isProcessing = true;
    console.log('Starting enhanced musical detection with rhythm and harmony analysis...');
    
    const processAudio = () => {
      if (!this.isProcessing || !this.analyser) return;
      
      const frequencyData = new Float32Array(this.analyser.frequencyBinCount);
      const timeData = new Float32Array(this.analyser.fftSize);
      
      this.analyser.getFloatFrequencyData(frequencyData);
      this.analyser.getFloatTimeDomainData(timeData);
      
      const amplitude = this.calculateRMS(timeData);
      const amplitudeDB = amplitude > 0 ? 20 * Math.log10(amplitude) : -90;
      
      this.updateNoiseFloor(amplitudeDB);
      const gateOpen = this.applyNoiseGate(amplitudeDB);
      
      let pitch: PitchData | null = null;
      let chroma: ChromaData | null = null;
      let harmonyAnalysis: HarmonyAnalysis | null = null;
      let state = AudioState.IDLE;
      
      if (gateOpen) {
        // Detect multiple pitches simultaneously
        const detectedPitches = this.detectMultiplePitches(timeData, frequencyData);
        
        if (detectedPitches.length > 0) {
          // Use the strongest pitch as primary
          pitch = detectedPitches[0];
          
          // Analyze rhythm and beat detection
          const rhythmData = this.analyzeRhythm(amplitudeDB, timeData);
          
          // Separate melody and harmony
          harmonyAnalysis = this.analyzeMelodyHarmony(detectedPitches, rhythmData);
          
          if (this.isMusicalContent(timeData, frequencyData, pitch)) {
            chroma = this.calculateChroma(frequencyData);
            state = AudioState.MUSICAL_INPUT;
            
            console.log(`Musical input - Melody: [${harmonyAnalysis.melodyNotes.join(', ')}], Chords: [${harmonyAnalysis.chordNotes.join(', ')}], Tempo: ${rhythmData.tempo.toFixed(0)} BPM`);
          } else {
            state = AudioState.NOISE_DETECTED;
          }
        } else {
          state = AudioState.NOISE_DETECTED;
        }
      }
      
      this.currentState = state;
      
      onAudioData({
        state,
        pitch,
        chroma,
        amplitude: amplitudeDB,
        noiseGateOpen: gateOpen,
        harmonyAnalysis
      });
      
      this.animationFrame = requestAnimationFrame(processAudio);
    };
    
    processAudio();
  }

  private detectMultiplePitches(timeData: Float32Array, frequencyData: Float32Array): PitchData[] {
    const pitches: PitchData[] = [];
    
    // Primary pitch detection using autocorrelation
    const primaryPitch = this.detectPitch(timeData);
    if (primaryPitch) {
      pitches.push(primaryPitch);
    }
    
    // Secondary pitch detection using spectral peaks
    const spectralPitches = this.detectSpectralPeaks(frequencyData);
    
    // Combine and filter pitches
    spectralPitches.forEach(spectralPitch => {
      // Avoid duplicates (within 10 Hz)
      const isDuplicate = pitches.some(existing => 
        Math.abs(existing.frequency - spectralPitch.frequency) < 10
      );
      
      if (!isDuplicate && spectralPitch.confidence > 0.3) {
        pitches.push(spectralPitch);
      }
    });
    
    // Sort by confidence
    return pitches.sort((a, b) => b.confidence - a.confidence).slice(0, 6); // Max 6 simultaneous notes
  }

  private detectSpectralPeaks(frequencyData: Float32Array): PitchData[] {
    const peaks: PitchData[] = [];
    const sampleRate = this.config.sampleRate;
    const binCount = frequencyData.length;
    const binWidth = sampleRate / (2 * binCount);
    
    // Find spectral peaks
    for (let i = 2; i < binCount - 2; i++) {
      const frequency = i * binWidth;
      
      // Skip frequencies outside musical range
      if (frequency < 80 || frequency > 2000) continue;
      
      const magnitude = frequencyData[i];
      const leftMag = frequencyData[i - 1];
      const rightMag = frequencyData[i + 1];
      
      // Check if this is a local maximum
      if (magnitude > leftMag && magnitude > rightMag && magnitude > -40) {
        // Calculate confidence based on peak prominence
        const prominence = magnitude - Math.max(leftMag, rightMag);
        const confidence = Math.min(1, Math.max(0, (prominence + 20) / 30));
        
        if (confidence > 0.2) {
          peaks.push({
            frequency,
            confidence,
            timestamp: Date.now()
          });
        }
      }
    }
    
    return peaks.sort((a, b) => b.confidence - a.confidence).slice(0, 8);
  }

  private analyzeRhythm(amplitudeDB: number, timeData: Float32Array): RhythmData {
    const currentTime = Date.now();
    
    // Add to amplitude history
    this.amplitudeHistory.push(amplitudeDB);
    if (this.amplitudeHistory.length > 100) {
      this.amplitudeHistory.shift();
    }
    
    // Detect beats using onset detection
    const beatStrength = this.detectOnset(timeData, amplitudeDB);
    
    // Beat detection threshold
    if (beatStrength > 0.6 && (currentTime - this.lastBeatTime) > 200) {
      this.beatHistory.push(currentTime);
      this.lastBeatTime = currentTime;
      
      // Keep recent beat history
      if (this.beatHistory.length > 8) {
        this.beatHistory.shift();
      }
    }
    
    // Calculate tempo
    let tempo = 120; // Default tempo
    if (this.beatHistory.length >= 4) {
      const intervals = [];
      for (let i = 1; i < this.beatHistory.length; i++) {
        intervals.push(this.beatHistory[i] - this.beatHistory[i - 1]);
      }
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      tempo = Math.round(60000 / avgInterval); // Convert to BPM
      
      // Smooth tempo
      this.tempoHistory.push(tempo);
      if (this.tempoHistory.length > 5) {
        this.tempoHistory.shift();
      }
      
      tempo = Math.round(this.tempoHistory.reduce((a, b) => a + b, 0) / this.tempoHistory.length);
    }
    
    // Determine current beat position
    const timeSinceLastBeat = currentTime - this.lastBeatTime;
    const beatInterval = 60000 / tempo;
    const currentBeat = Math.floor(timeSinceLastBeat / beatInterval) + 1;
    const isOnBeat = timeSinceLastBeat < 100; // Within 100ms of beat
    
    return {
      tempo: Math.max(60, Math.min(200, tempo)), // Clamp tempo
      beatStrength,
      timeSignature: '4/4', // Default for now
      currentBeat: Math.max(1, Math.min(4, currentBeat)),
      isOnBeat
    };
  }

  private detectOnset(timeData: Float32Array, amplitudeDB: number): number {
    // Simple onset detection based on amplitude increase
    if (this.amplitudeHistory.length < 3) return 0;
    
    const recent = this.amplitudeHistory.slice(-3);
    const current = recent[2];
    const previous = recent[1];
    const beforePrevious = recent[0];
    
    // Look for sudden amplitude increase
    const increase1 = current - previous;
    const increase2 = previous - beforePrevious;
    
    if (increase1 > 3 && increase1 > increase2 * 1.5) {
      return Math.min(1, increase1 / 10);
    }
    
    return 0;
  }

  private analyzeMelodyHarmony(pitches: PitchData[], rhythmData: RhythmData): HarmonyAnalysis {
    const currentTime = Date.now();
    const melodyNotes: string[] = [];
    const chordNotes: string[] = [];
    
    if (pitches.length === 0) {
      return {
        melodyNotes,
        chordNotes,
        rhythmData,
        harmonyType: 'none'
      };
    }
    
    try {
      // Convert pitches to note names
      const noteData = pitches.map(pitch => {
        const note = this.frequencyToNote(pitch.frequency);
        // Debug log for every detected note
        console.log(`[DEBUG] Detected note: ${note.name} (${pitch.frequency.toFixed(2)} Hz, conf: ${pitch.confidence.toFixed(2)})`);
        return {
          note: note.name,
          frequency: pitch.frequency,
          confidence: pitch.confidence,
          octave: note.octave
        };
      });
      
      // Polyphonic mode: treat all strong detected notes as chord notes
      if (this.polyphonicMode) {
        const now = Date.now();
        const strongNotes = noteData.filter(n => n.confidence > 0.05);
        if (strongNotes.length >= 2) {
          chordNotes.push(...strongNotes.map(n => n.note));
          this.lastChordNotes = chordNotes;
          this.lastChordTime = now;
          console.log(`[DEBUG][Polyphonic] Chord notes: ${chordNotes.join(', ')}`);
        } else if (this.lastChordNotes.length >= 2 && now - this.lastChordTime < this.chordMemoryMs) {
          // Use memory to reduce flicker
          chordNotes.push(...this.lastChordNotes);
          console.log(`[DEBUG][Polyphonic][Memory] Chord notes: ${chordNotes.join(', ')}`);
        }
        return {
          melodyNotes: [],
          chordNotes,
          rhythmData,
          harmonyType: 'chord'
        };
      }
      
      // Analyze playing pattern
      if (noteData.length === 1) {
        // Single note - likely melody
        const detectedNote = noteData[0].note;
        // Note memory logic
        if (this.lastMelodyNote === detectedNote || this.lastMelodyNote === null) {
          melodyNotes.push(detectedNote);
          this.lastMelodyNote = detectedNote;
          this.lastMelodyNoteTime = currentTime;
        } else if (currentTime - this.lastMelodyNoteTime < this.melodyNoteMemoryMs) {
          // Keep previous note active if within memory window
          melodyNotes.push(this.lastMelodyNote);
        } else {
          melodyNotes.push(detectedNote);
          this.lastMelodyNote = detectedNote;
          this.lastMelodyNoteTime = currentTime;
        }
        // Add to melody sequence
        this.melodySequence.push({
          note: melodyNotes[0],
          time: currentTime,
          duration: 0 // Will be updated when note changes
        });
        // Keep recent melody history
        if (this.melodySequence.length > 20) {
          this.melodySequence.shift();
        }
        return {
          melodyNotes,
          chordNotes,
          rhythmData,
          harmonyType: 'melody'
        };
      } else if (noteData.length >= 2) {
        // Multiple notes - analyze for chord vs melody
        
        // Sort by frequency (bass to treble)
        noteData.sort((a, b) => a.frequency - b.frequency);
        
        // Check if notes form chord intervals
        const intervals = [];
        for (let i = 1; i < noteData.length; i++) {
          const semitones = this.calculateSemitones(noteData[i-1].frequency, noteData[i].frequency);
          intervals.push(semitones);
        }
        
        // Common chord intervals: 3rds (3-4 semitones), 4ths (5 semitones), 5ths (7 semitones)
        const hasChordIntervals = intervals.some(interval => 
          (interval >= 3 && interval <= 4) || // Major/minor 3rd
          interval === 5 || // Perfect 4th
          interval === 7    // Perfect 5th
        );
        
        if (hasChordIntervals && noteData.length >= 3) {
          // This is likely a chord (left hand)
          chordNotes.push(...noteData.map(n => n.note));
          // Debug log for detected chord notes
          console.log(`[DEBUG] Detected chord notes: ${noteData.map(n => `${n.note} (${n.frequency.toFixed(2)} Hz, conf: ${n.confidence.toFixed(2)})`).join(', ')}`);
          
          // Add to chord sequence
          this.chordSequence.push({
            notes: noteData.map(n => n.note),
            time: currentTime,
            duration: 0
          });
          
          if (this.chordSequence.length > 10) {
            this.chordSequence.shift();
          }
          
          return {
            melodyNotes,
            chordNotes,
            rhythmData,
            harmonyType: 'chord'
          };
        } else {
          // Multiple notes but not chord-like - could be melody with harmonies
          // Highest note is likely melody, lower notes are harmony
          const melodyNote = noteData[noteData.length - 1]; // Highest
          const harmonyNotes = noteData.slice(0, -1); // Lower notes
          
          melodyNotes.push(melodyNote.note);
          chordNotes.push(...harmonyNotes.map(n => n.note));
          // Debug log for detected chord notes (harmony)
          if (chordNotes.length > 0) {
            console.log(`[DEBUG] Detected harmony notes: ${harmonyNotes.map(n => `${n.note} (${n.frequency.toFixed(2)} Hz, conf: ${n.confidence.toFixed(2)})`).join(', ')}`);
          }
          return {
            melodyNotes,
            chordNotes,
            rhythmData,
            harmonyType: 'both'
          };
        }
      }
    } catch (error) {
      console.error('Error in melody/harmony analysis:', error);
    }
    
    return {
      melodyNotes,
      chordNotes,
      rhythmData,
      harmonyType: 'none'
    };
  }

  private frequencyToNote(frequency: number): { name: string; octave: number } {
    const A4 = 440;
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    const midiNumber = Math.round(12 * Math.log2(frequency / A4) + 69);
    const octave = Math.floor(midiNumber / 12) - 1;
    const noteIndex = midiNumber % 12;
    
    return {
      name: noteNames[noteIndex],
      octave: Math.max(0, octave)
    };
  }

  private calculateSemitones(freq1: number, freq2: number): number {
    return Math.round(12 * Math.log2(freq2 / freq1));
  }

  // Helper: Check for strong formant peaks (voice-like) in 300–3400 Hz
  private hasStrongVoiceFormants(frequencyData: Float32Array): boolean {
    const sampleRate = this.config.sampleRate;
    const binCount = frequencyData.length;
    const binWidth = sampleRate / (2 * binCount);
    // Typical voice formant regions (Hz)
    const formantBands = [
      { min: 300, max: 800 },   // F1
      { min: 1000, max: 1800 }, // F2
      { min: 2000, max: 3400 }  // F3
    ];
    let totalFormantEnergy = 0;
    let totalEnergy = 0;
    for (let i = 0; i < binCount; i++) {
      const freq = i * binWidth;
      const magnitude = Math.pow(10, frequencyData[i] / 20);
      totalEnergy += magnitude;
      if (formantBands.some(b => freq >= b.min && freq <= b.max)) {
        totalFormantEnergy += magnitude;
      }
    }
    // If more than 40% of energy is in formant bands, likely voice
    return totalEnergy > 0 && (totalFormantEnergy / totalEnergy) > 0.4;
  }

  // Helper: Check for high vibrato (rapid pitch changes)
  private hasHighVibrato(): boolean {
    if (this.pitchHistory.length < 6) return false;
    // Calculate pitch difference between consecutive frames (in semitones)
    let totalChange = 0;
    let count = 0;
    for (let i = 1; i < this.pitchHistory.length; i++) {
      const prev = this.pitchHistory[i - 1];
      const curr = this.pitchHistory[i];
      if (prev && curr) {
        const diff = Math.abs(12 * Math.log2(curr.frequency / prev.frequency));
        totalChange += diff;
        count++;
      }
    }
    const avgChange = count > 0 ? totalChange / count : 0;
    // If average change > 0.5 semitones per frame, treat as vibrato (voice-like)
    return avgChange > 0.5;
  }

  private isMusicalContent(timeData: Float32Array, frequencyData: Float32Array, pitch: PitchData): boolean {
    const harmonicRatio = this.analyzeHarmonicContent(frequencyData, pitch.frequency);
    this.harmonicHistory.push(harmonicRatio);
    if (this.harmonicHistory.length > 6) this.harmonicHistory.shift();
    const pitchStability = this.measurePitchStability(pitch);
    this.pitchStabilityHistory.push(pitchStability);
    if (this.pitchStabilityHistory.length > 8) this.pitchStabilityHistory.shift();
    const spectralCentroid = this.calculateSpectralCentroid(frequencyData);
    const zeroCrossingRate = this.calculateZeroCrossingRate(timeData);
    const sustainedTone = this.detectSustainedTone();
    const avgHarmonic = this.harmonicHistory.length > 0 ? 
      this.harmonicHistory.reduce((a, b) => a + b, 0) / this.harmonicHistory.length : 0;
    const avgStability = this.pitchStabilityHistory.length > 0 ? 
      this.pitchStabilityHistory.reduce((a, b) => a + b, 0) / this.pitchStabilityHistory.length : 0;
    const isHarmonic = avgHarmonic > this.signalDetection.harmonicThreshold;
    const isStable = avgStability > this.signalDetection.pitchStability;
    const isInMusicalRange = spectralCentroid > this.signalDetection.spectralCentroid.minVocal && 
                            spectralCentroid < this.signalDetection.spectralCentroid.maxPiano;
    const isNotSpeechLike = zeroCrossingRate < 0.12;
    const isSustained = sustainedTone;
    // Advanced voice filtering:
    // 1. Ignore if strong formant peaks (voice-like)
    if (this.hasStrongVoiceFormants(frequencyData)) return false;
    // 2. Ignore if high vibrato (voice-like)
    if (this.hasHighVibrato()) return false;
    // 3. Ignore if spectral centroid is in typical voice range and zero-crossing rate is high
    if (spectralCentroid > 150 && spectralCentroid < 1200 && zeroCrossingRate > 0.12) return false;
    // Combine all conditions
    const conditions = [isHarmonic, isStable, isInMusicalRange, isNotSpeechLike, isSustained];
    const passedConditions = conditions.filter(Boolean).length;
    return passedConditions >= 3;
  }

  private analyzeHarmonicContent(frequencyData: Float32Array, fundamentalFreq: number): number {
    const sampleRate = this.config.sampleRate;
    const binCount = frequencyData.length;
    const binWidth = sampleRate / (2 * binCount);
    
    let harmonicEnergy = 0;
    let totalEnergy = 0;
    
    for (let harmonic = 1; harmonic <= 5; harmonic++) {
      const harmonicFreq = fundamentalFreq * harmonic;
      const binIndex = Math.round(harmonicFreq / binWidth);
      
      if (binIndex < binCount && binIndex > 0) {
        const magnitude = Math.pow(10, frequencyData[binIndex] / 20);
        harmonicEnergy += magnitude;
      }
    }
    
    const minBin = Math.max(1, Math.floor(this.config.minFreq / binWidth));
    const maxBin = Math.min(binCount - 1, Math.floor(this.config.maxFreq / binWidth));
    
    for (let i = minBin; i <= maxBin; i++) {
      const magnitude = Math.pow(10, frequencyData[i] / 20);
      totalEnergy += magnitude;
    }
    
    return totalEnergy > 0 ? harmonicEnergy / totalEnergy : 0;
  }

  private measurePitchStability(currentPitch: PitchData): number {
    this.pitchHistory.push(currentPitch);
    if (this.pitchHistory.length > 12) {
      this.pitchHistory.shift();
    }
    
    if (this.pitchHistory.length < 3) return 0;
    
    const frequencies = this.pitchHistory.map(p => p.frequency);
    const mean = frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length;
    const variance = frequencies.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / frequencies.length;
    const standardDeviation = Math.sqrt(variance);
    
    const relativeStability = mean > 0 ? 1 - Math.min(1, standardDeviation / mean) : 0;
    return Math.max(0, relativeStability);
  }

  private calculateSpectralCentroid(frequencyData: Float32Array): number {
    const sampleRate = this.config.sampleRate;
    const binCount = frequencyData.length;
    
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 1; i < binCount; i++) {
      const frequency = (i * sampleRate) / (2 * binCount);
      const magnitude = Math.pow(10, frequencyData[i] / 20);
      
      if (magnitude > 0.001) {
        weightedSum += frequency * magnitude;
        magnitudeSum += magnitude;
      }
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  private calculateZeroCrossingRate(timeData: Float32Array): number {
    let crossings = 0;
    
    for (let i = 1; i < timeData.length; i++) {
      if ((timeData[i] >= 0) !== (timeData[i - 1] >= 0)) {
        crossings++;
      }
    }
    
    return crossings / timeData.length;
  }

  private detectSustainedTone(): boolean {
    if (this.pitchHistory.length < 4) return false;
    
    const recentPitches = this.pitchHistory.slice(-6);
    const avgConfidence = recentPitches.reduce((sum, p) => sum + p.confidence, 0) / recentPitches.length;
    
    return avgConfidence > 0.4;
  }

  stop(): void {
    console.log('Stopping enhanced audio processing...');
    this.cleanup();
  }

  private calculateRMS(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  private updateNoiseFloor(amplitudeDB: number): void {
    const alpha = 0.001;
    this.noiseFloor = this.noiseFloor * (1 - alpha) + amplitudeDB * alpha;
  }

  private applyNoiseGate(amplitudeDB: number): boolean {
    const threshold = Math.max(this.noiseFloor + 8, this.noiseGate.thresholdMin);
    return amplitudeDB > threshold;
  }

  private detectPitch(timeData: Float32Array): PitchData | null {
    const correlations = this.autocorrelate(timeData);
    const minPeriod = Math.floor(this.config.sampleRate / 2000);
    const maxPeriod = Math.floor(this.config.sampleRate / this.config.minFreq);
    
    let bestPeriod = 0;
    let bestCorrelation = 0;
    
    for (let period = minPeriod; period < Math.min(maxPeriod, correlations.length / 2); period++) {
      if (correlations[period] > bestCorrelation) {
        bestCorrelation = correlations[period];
        bestPeriod = period;
      }
    }
    
    if (bestCorrelation < 0.2 || bestPeriod === 0) return null;
    
    const frequency = this.config.sampleRate / bestPeriod;
    
    if (frequency < 50 || frequency > 2000) return null;
    
    return {
      frequency,
      confidence: bestCorrelation,
      timestamp: Date.now()
    };
  }

  private autocorrelate(buffer: Float32Array): Float32Array {
    const result = new Float32Array(buffer.length);
    
    for (let lag = 0; lag < buffer.length; lag++) {
      let sum = 0;
      for (let i = 0; i < buffer.length - lag; i++) {
        sum += buffer[i] * buffer[i + lag];
      }
      result[lag] = sum;
    }
    
    if (result[0] > 0) {
      for (let i = 0; i < result.length; i++) {
        result[i] /= result[0];
      }
    }
    
    return result;
  }

  private calculateChroma(frequencyData: Float32Array): ChromaData {
    const chroma = new Array(12).fill(0);
    const sampleRate = this.config.sampleRate;
    const binCount = frequencyData.length;
    
    for (let i = 1; i < binCount; i++) {
      const frequency = (i * sampleRate) / (2 * binCount);
      
      if (frequency < 80 || frequency > 2000) continue;
      
      const magnitude = Math.pow(10, frequencyData[i] / 20);
      
      if (magnitude < 0.001) continue;
      
      const midiNote = 12 * Math.log2(frequency / 440) + 69;
      const chromaClass = Math.round(midiNote) % 12;
      
      if (chromaClass >= 0 && chromaClass < 12) {
        chroma[chromaClass] += magnitude;
      }
    }
    
    const sum = chroma.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < chroma.length; i++) {
        chroma[i] /= sum;
      }
    }
    
    let dominant = 0;
    let maxValue = chroma[0];
    for (let i = 1; i < chroma.length; i++) {
      if (chroma[i] > maxValue) {
        maxValue = chroma[i];
        dominant = i;
      }
    }
    
    return {
      vector: chroma,
      dominant,
      confidence: maxValue
    };
  }

  getState(): AudioState {
    return this.currentState;
  }

  getNoiseFloor(): number {
    return this.noiseFloor;
  }

  getGateThreshold(): number {
    return this.gateThreshold;
  }

  setGateThreshold(threshold: number): void {
    this.gateThreshold = Math.max(this.noiseGate.thresholdMin, Math.min(this.noiseGate.thresholdMax, threshold));
  }

  // New methods for rhythm and harmony access
  getCurrentTempo(): number {
    return this.tempoHistory.length > 0 ? 
      this.tempoHistory[this.tempoHistory.length - 1] : 120;
  }

  getMelodySequence(): Array<{note: string, time: number, duration: number}> {
    return [...this.melodySequence];
  }

  getChordSequence(): Array<{notes: string[], time: number, duration: number}> {
    return [...this.chordSequence];
  }

  // Allow dynamic adjustment of noise gate threshold
  public setNoiseGateThreshold(threshold: number): void {
    this.noiseGate.thresholdMin = threshold;
  }

  // Public method to set polyphonic mode
  public setPolyphonicMode(enabled: boolean): void {
    this.polyphonicMode = enabled;
  }
}