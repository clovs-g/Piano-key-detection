import { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Settings, Info, Music, Circle, Square } from 'lucide-react';
import { SmartAudioProcessor, HarmonyAnalysis } from './utils/audioProcessor';
import { KeyDetector } from './utils/keyDetection';
import { MusicTheoryEngine } from './utils/musicTheory';
import { AudioState, PitchData, KeyDetectionResult } from './types/audio';
import { KeyOverride, Scale } from './types/music';
import { AudioRecorder } from './utils/audioRecorder';
import { RecordingService } from './services/recordingService';
import AudioStatusIndicator from './components/AudioStatusIndicator';
import KeyDisplay from './components/KeyDisplay';
import PianoKeyboard from './components/PianoKeyboard';
import PitchVisualizer from './components/PitchVisualizer';
import RecordingsList from './components/RecordingsList';

function App() {
  // Audio processing state
  const [audioProcessor] = useState(() => new SmartAudioProcessor());
  const [keyDetector] = useState(() => new KeyDetector());
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [isRecording, setIsRecording] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isSavingRecording, setIsSavingRecording] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  
  // Audio analysis state
  const [audioState, setAudioState] = useState<AudioState>(AudioState.IDLE);
  const [amplitude, setAmplitude] = useState(-60);
  const [noiseGateOpen, setNoiseGateOpen] = useState(false);
  const [pitchHistory, setPitchHistory] = useState<PitchData[]>([]);
  
  // Enhanced harmony and rhythm state
  const [harmonyAnalysis, setHarmonyAnalysis] = useState<HarmonyAnalysis | null>(null);
  const [melodyNotes, setMelodyNotes] = useState<string[]>([]);
  const [chordNotes, setChordNotes] = useState<string[]>([]);
  const [currentTempo, setCurrentTempo] = useState(120);
  const [isOnBeat, setIsOnBeat] = useState(false);
  
  // Key detection state
  const [detectedKey, setDetectedKey] = useState<KeyDetectionResult | null>(null);
  const [keyConfidence, setKeyConfidence] = useState(0);
  const [keyOverride, setKeyOverride] = useState<KeyOverride>({
    isActive: false,
    selectedKey: '',
    selectedMode: 'major',
    timestamp: 0
  });
  
  // Music theory state
  const [currentScale, setCurrentScale] = useState<Scale | null>(null);
  const [detectedNotes, setDetectedNotes] = useState<string[]>([]);

  // Initialize audio processor
  useEffect(() => {
    const initAudio = async () => {
      try {
        console.log('Initializing enhanced audio processor...');
        const success = await audioProcessor.initialize();
        setIsInitialized(success);

        if (!success) {
          setInitError('Failed to access microphone. Please check permissions.');
          console.error('Failed to initialize audio processor');
        } else {
          setInitError(null);
          console.log('Enhanced audio processor initialized successfully');
        }
      } catch (error) {
        console.error('Audio initialization error:', error);
        setInitError('Microphone access denied or not available.');
        setIsInitialized(false);
      }
    };

    initAudio();

    return () => {
      audioProcessor.stop();
    };
  }, [audioProcessor]);

  // Handle audio recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });
      setMediaStream(stream);
      await audioRecorder.start(stream);
      setIsRecordingAudio(true);
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setInitError('Failed to start recording. Please check microphone permissions.');
    }
  }, [audioRecorder]);

  const stopRecording = useCallback(async () => {
    try {
      setIsSavingRecording(true);
      const { blob, duration } = await audioRecorder.stop();

      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }

      setIsRecordingAudio(false);

      const currentKey = keyOverride.isActive
        ? keyOverride.selectedKey
        : (detectedKey?.key || '');
      const currentMode = keyOverride.isActive
        ? keyOverride.selectedMode
        : (detectedKey?.mode || 'major');

      console.log('Saving recording...');
      const recording = await RecordingService.saveRecording(blob, duration, currentKey, currentMode);

      if (recording) {
        console.log('Recording saved successfully:', recording);
      } else {
        console.error('Failed to save recording');
        setInitError('Failed to save recording. Please try again.');
      }

      setIsSavingRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsSavingRecording(false);
      setIsRecordingAudio(false);
    }
  }, [audioRecorder, mediaStream, detectedKey, keyOverride]);

  // Enhanced audio data callback with rhythm and harmony analysis
  const handleAudioData = useCallback((data: {
    state: AudioState;
    pitch: PitchData | null;
    chroma: any;
    amplitude: number;
    noiseGateOpen: boolean;
    harmonyAnalysis: HarmonyAnalysis | null;
  }) => {
    setAudioState(data.state);
    setAmplitude(data.amplitude);
    setNoiseGateOpen(data.noiseGateOpen);
    
    // Update harmony analysis
    if (data.harmonyAnalysis) {
      setHarmonyAnalysis(data.harmonyAnalysis);
      setMelodyNotes(data.harmonyAnalysis.melodyNotes);
      setChordNotes(data.harmonyAnalysis.chordNotes);
      setCurrentTempo(data.harmonyAnalysis.rhythmData.tempo);
      setIsOnBeat(data.harmonyAnalysis.rhythmData.isOnBeat);
      
      // Combine melody and chord notes for overall detection
      const allNotes = [...data.harmonyAnalysis.melodyNotes, ...data.harmonyAnalysis.chordNotes];
      setDetectedNotes(() => {
        const uniqueNotes = Array.from(new Set([...allNotes]));
        return uniqueNotes.slice(-12); // Keep last 12 unique notes
      });
      
      console.log(`Harmony Analysis - Type: ${data.harmonyAnalysis.harmonyType}, Melody: [${data.harmonyAnalysis.melodyNotes.join(', ')}], Chords: [${data.harmonyAnalysis.chordNotes.join(', ')}], Tempo: ${data.harmonyAnalysis.rhythmData.tempo} BPM, Beat: ${data.harmonyAnalysis.rhythmData.currentBeat}/4`);
    }
    
    // Add pitch to history
    if (data.pitch && data.pitch.confidence > 0.25) {
      setPitchHistory(prev => {
        const newHistory = [...prev, data.pitch!];
        return newHistory.slice(-100);
      });
      
      try {
        const note = MusicTheoryEngine.getNoteFromFrequency(data.pitch.frequency);
        console.log(`Primary pitch: ${note.name} (${data.pitch.frequency.toFixed(1)}Hz, conf: ${data.pitch.confidence.toFixed(2)})`);
      } catch (error) {
        console.error('Error processing primary pitch:', error);
      }
    }
    
    // Key detection from chroma data - more sensitive and responsive
    if (data.chroma && !keyOverride.isActive) {
      try {
        const key = keyDetector.detectKey(data.chroma);
        // Lowered confidence threshold for faster detection
        if (key && key.confidence > 0.01) {
          setDetectedKey(key);
          setKeyConfidence(key.confidence);
        }
      } catch (error) {
        console.error('Error in key detection:', error);
      }
    }
  }, [keyDetector, keyOverride.isActive]);

  // Update current scale when key changes
  useEffect(() => {
    const currentKey = keyOverride.isActive 
      ? { key: keyOverride.selectedKey, mode: keyOverride.selectedMode }
      : detectedKey;
      
    if (currentKey && currentKey.key) {
      try {
        console.log(`Generating scale for ${currentKey.key} ${currentKey.mode}`);
        const scale = MusicTheoryEngine.getScale(currentKey.key, currentKey.mode);
        setCurrentScale(scale);
        console.log('Scale notes:', scale.notes);
      } catch (error) {
        console.error('Failed to generate scale:', error);
      }
    } else {
      setCurrentScale(null);
    }
  }, [detectedKey, keyOverride]);

  // Handle manual key override
  const handleKeyOverride = useCallback((key: string, mode: 'major' | 'minor') => {
    console.log(`Manual key override: ${key} ${mode}`);
    
    if (keyOverride.isActive && keyOverride.selectedKey === key && keyOverride.selectedMode === mode) {
      console.log('Returning to auto detection mode');
      setKeyOverride({
        isActive: false,
        selectedKey: '',
        selectedMode: 'major',
        timestamp: 0
      });
      keyDetector.reset();
    } else {
      console.log('Setting manual key override');
      setKeyOverride({
        isActive: true,
        selectedKey: key,
        selectedMode: mode,
        timestamp: Date.now()
      });
    }
  }, [keyOverride, keyDetector]);

  // Start/stop recording
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      console.log('Stopping audio recording...');
      audioProcessor.stop();
      setIsRecording(false);
      setPitchHistory([]);
      setDetectedNotes([]);
      setMelodyNotes([]);
      setChordNotes([]);
      setHarmonyAnalysis(null);
      setAudioState(AudioState.IDLE);
      setDetectedKey(null);
      setKeyConfidence(0);
      return;
    }

    let initializationSuccessful = isInitialized;
    
    if (!isInitialized) {
      console.log('Audio not initialized, attempting to initialize...');
      try {
        initializationSuccessful = await audioProcessor.initialize();
        setIsInitialized(initializationSuccessful);
        
        if (!initializationSuccessful) {
          setInitError('Failed to access microphone. Please check permissions and try again.');
          return;
        }
        setInitError(null);
      } catch (error) {
        console.error('Failed to initialize audio processor:', error);
        setInitError('Failed to access microphone. Please check permissions and try again.');
        setIsInitialized(false);
        return;
      }
    }
    
    if (initializationSuccessful) {
      console.log('Starting enhanced audio recording with rhythm and harmony detection...');
      try {
        audioProcessor.start(handleAudioData);
        setIsRecording(true);
        setInitError(null);
      } catch (error) {
        console.error('Failed to start audio processing:', error);
        setInitError('Failed to start audio processing. Please try again.');
      }
    }
  }, [isInitialized, isRecording, audioProcessor, handleAudioData]);

  // Get root note for display
  const rootNote = keyOverride.isActive ? keyOverride.selectedKey : (detectedKey?.key || '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Mic className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Musical Key Detector</h1>
                <p className="text-sm text-gray-400">Professional Audio Analysis with Melody & Harmony Separation</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleRecording}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                } ${!isInitialized && !isRecording ? 'opacity-75' : ''}`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Stop Listening</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Start Listening</span>
                  </>
                )}
              </button>

              {isRecording && (
                <button
                  onClick={isRecordingAudio ? stopRecording : startRecording}
                  disabled={isSavingRecording}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isRecordingAudio
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  } ${isSavingRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSavingRecording ? (
                    <>
                      <Circle className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : isRecordingAudio ? (
                    <>
                      <Square className="w-4 h-4" />
                      <span>Stop Recording</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-4 h-4" />
                      <span>Start Recording</span>
                    </>
                  )}
                </button>
              )}

              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </button>

              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <Info className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Error Message */}
          {initError && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{initError}</p>
              <p className="text-red-300 text-xs mt-1">
                Make sure to allow microphone access when prompted by your browser.
              </p>
            </div>
          )}

          {/* Enhanced Rhythm and Harmony Status */}
          {harmonyAnalysis && isRecording && (
            <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Music className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-300 text-sm font-medium">
                      {harmonyAnalysis.harmonyType.charAt(0).toUpperCase() + harmonyAnalysis.harmonyType.slice(1)} Detected
                    </span>
                  </div>
                  <div className="text-purple-300 text-sm">
                    Tempo: {currentTempo} BPM
                  </div>
                  <div className={`text-sm ${isOnBeat ? 'text-green-400' : 'text-gray-400'}`}>
                    Beat: {harmonyAnalysis.rhythmData.currentBeat}/4
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {melodyNotes.length > 0 && (
                    <div className="text-green-300 text-sm">
                      Melody: {melodyNotes.join(', ')}
                    </div>
                  )}
                  {chordNotes.length > 0 && (
                    <div className="text-blue-300 text-sm">
                      Harmony: {chordNotes.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Audio Status & Key Detection */}
          <div className="space-y-6">
            <AudioStatusIndicator
              audioState={audioState}
              amplitude={amplitude}
              noiseGateOpen={noiseGateOpen}
              isRecording={isRecording}
            />
            
            <KeyDisplay
              detectedKey={detectedKey}
              keyOverride={keyOverride}
              confidence={keyConfidence}
            />
            
            <PitchVisualizer
              pitchHistory={pitchHistory}
              isActive={audioState === AudioState.MUSICAL_INPUT || audioState === AudioState.PROCESSING}
            />
          </div>

          {/* Middle & Right Columns - Dual Piano Display */}
          <div className="lg:col-span-2 space-y-6">
            {/* Melody Piano (Right Hand) */}
            <PianoKeyboard
              detectedNotes={detectedNotes}
              scaleNotes={currentScale?.notes || []}
              rootNote={rootNote}
              onKeyOverride={handleKeyOverride}
              keyOverride={keyOverride}
              melodyNotes={melodyNotes}
              chordNotes={chordNotes}
              harmonyAnalysis={harmonyAnalysis}
              showAllNotes={false}
              title="Virtual Piano - Melody Display"
            />

            {/* Chord Piano (Left Hand) - same style as melody piano */}
            {/* Chord Piano (always visible, shows all combination notes) */}
            {/* Chord Piano now uses the same component as the melody piano, but for chords */}
            <PianoKeyboard
              detectedNotes={detectedNotes}
              scaleNotes={currentScale?.notes || []}
              rootNote={rootNote}
              onKeyOverride={handleKeyOverride}
              keyOverride={keyOverride}
              melodyNotes={chordNotes}
              chordNotes={[]}
              harmonyAnalysis={harmonyAnalysis}
              showAllNotes={true}
              title="Virtual Piano - Chord Display"
            />
          </div>
        </div>

        {/* Enhanced Status Bar */}
        <div className="mt-8 bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-gray-300">
                  Audio: {isInitialized ? 'Ready' : 'Initializing'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                <span className="text-gray-300">
                  Listening: {isRecording ? 'Active' : 'Stopped'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${audioState === AudioState.MUSICAL_INPUT ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                <span className="text-gray-300">
                  Detection: {audioState === AudioState.MUSICAL_INPUT ? 'Musical Input' : 'Standby'}
                </span>
              </div>

              {harmonyAnalysis && (
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isOnBeat ? 'bg-purple-400' : 'bg-gray-500'}`}></div>
                  <span className="text-gray-300">
                    Rhythm: {isOnBeat ? 'On Beat' : 'Off Beat'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="text-gray-400">
              {keyOverride.isActive ? 'Manual Mode' : 'Auto Detection'} | 
              {melodyNotes.length} melody notes | 
              {chordNotes.length} chord notes | 
              {pitchHistory.length} samples
            </div>
          </div>
        </div>

        {/* Recordings List */}
        <div className="mt-6">
          <RecordingsList />
        </div>

        {/* Enhanced Instructions */}
        {!isRecording && (
          <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h3 className="text-blue-400 font-medium mb-2">Dual Piano Display - Melody & Harmony Separation:</h3>
            <ul className="text-blue-300 text-sm space-y-1">
              <li>• Click "Start Listening" to begin advanced audio detection with dual piano display</li>
              <li>• <strong>Top Piano (Melody):</strong> <span className="text-green-400">Green keys</span> = Single melody notes (right hand/treble)</li>
              <li>• <strong>Bottom Piano (Chords):</strong> <span className="text-blue-400">Blue keys</span> = Chord combinations (left hand/bass)</li>
              <li>• The app automatically separates melody from harmony using advanced audio analysis</li>
              <li>• Play single notes to see melody tracking, play multiple notes to see chord analysis</li>
              <li>• Rhythm detection shows tempo, beat patterns, and musical timing</li>
              <li>• Long-press any piano key to manually set the key signature</li>
              <li>• <strong>Recording:</strong> Click "Start Recording" while listening to save your performance for later playback</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;