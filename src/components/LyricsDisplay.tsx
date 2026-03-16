import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';
import { HarmonyAnalysis } from '../utils/audioProcessor';

interface LyricsDisplayProps {
  harmonyAnalysis: HarmonyAnalysis | null;
  detectedKey: string;
  isRecording: boolean;
}

interface SongMatch {
  title: string;
  artist: string;
  confidence: number;
  lyrics: string[];
}

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({
  harmonyAnalysis,
  detectedKey,
  isRecording
}) => {
  const [songMatches, setSongMatches] = useState<SongMatch[]>([]);
  const [currentLyrics, setCurrentLyrics] = useState<string[]>([]);
  const [selectedSongIndex, setSelectedSongIndex] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);

  const mockSongsDatabase = [
    {
      title: "Let It Be",
      artist: "The Beatles",
      keySignature: "C",
      mode: "major",
      lyrics: [
        "When I find myself in times of trouble",
        "Mother Mary comes to me",
        "Speaking words of wisdom, let it be",
        "And in my hour of darkness",
        "She is standing right in front of me",
        "Speaking words of wisdom, let it be",
        "Let it be, let it be",
        "Let it be, let it be",
        "Whisper words of wisdom, let it be"
      ]
    },
    {
      title: "Imagine",
      artist: "John Lennon",
      keySignature: "C",
      mode: "major",
      lyrics: [
        "Imagine there's no heaven",
        "It's easy if you try",
        "No hell below us",
        "Above us only sky",
        "Imagine all the people",
        "Living life in peace"
      ]
    },
    {
      title: "Yesterday",
      artist: "The Beatles",
      keySignature: "F",
      mode: "major",
      lyrics: [
        "Yesterday, all my troubles seemed so far away",
        "Now it looks as though they're here to stay",
        "Oh, I believe in yesterday",
        "Suddenly, I'm not half the man I used to be",
        "There's a shadow hanging over me"
      ]
    },
    {
      title: "Hallelujah",
      artist: "Leonard Cohen",
      keySignature: "C",
      mode: "major",
      lyrics: [
        "Now I've heard there was a secret chord",
        "That David played, and it pleased the Lord",
        "But you don't really care for music, do you?",
        "It goes like this the fourth, the fifth",
        "The minor fall, the major lift"
      ]
    }
  ];

  useEffect(() => {
    if (isRecording && harmonyAnalysis && detectedKey) {
      const confidence = Math.min(100, harmonyAnalysis.chordNotes.length * 15);
      const matchedSongs = mockSongsDatabase
        .filter(song => song.keySignature === detectedKey || song.mode === 'major')
        .slice(0, 3)
        .map(song => ({
          title: song.title,
          artist: song.artist,
          confidence: Math.random() * 30 + 60,
          lyrics: song.lyrics
        }));

      setSongMatches(matchedSongs);

      if (matchedSongs.length > 0) {
        setCurrentLyrics(matchedSongs[0].lyrics);
        setSelectedSongIndex(0);
      }
    }
  }, [isRecording, harmonyAnalysis, detectedKey]);

  useEffect(() => {
    if (currentLyrics.length > 0 && isRecording) {
      const interval = setInterval(() => {
        setScrollPosition(prev => (prev + 1) % currentLyrics.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentLyrics, isRecording]);

  const handleSongSelect = (index: number) => {
    setSelectedSongIndex(index);
    setCurrentLyrics(songMatches[index].lyrics);
    setScrollPosition(0);
  };

  if (!isRecording) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Music className="w-6 h-6 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Song Lyrics Display</h2>
        </div>
        <p className="text-gray-400 text-center py-8">
          Start listening to detect songs and display their lyrics
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Music className="w-6 h-6 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">Song Lyrics Display</h2>
      </div>

      {songMatches.length > 0 ? (
        <div className="space-y-4">
          {/* Song Selection */}
          <div className="flex flex-wrap gap-2">
            {songMatches.map((song, index) => (
              <button
                key={index}
                onClick={() => handleSongSelect(index)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  selectedSongIndex === index
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <div className="text-sm font-medium">{song.title}</div>
                <div className="text-xs opacity-75">{song.artist}</div>
                <div className="text-xs mt-1">
                  {song.confidence.toFixed(0)}% match
                </div>
              </button>
            ))}
          </div>

          {/* Lyrics Display */}
          <div className="bg-gray-900/50 rounded-lg p-6 min-h-40 flex flex-col items-center justify-center border border-gray-700">
            <div className="text-center space-y-4">
              {currentLyrics.map((lyric, index) => (
                <div
                  key={index}
                  className={`transition-all duration-500 text-base leading-relaxed ${
                    index === scrollPosition
                      ? 'text-white text-lg font-semibold scale-105'
                      : index === (scrollPosition + 1) % currentLyrics.length
                      ? 'text-gray-300 text-base'
                      : 'text-gray-500 text-sm'
                  }`}
                >
                  {lyric}
                </div>
              ))}
            </div>
          </div>

          {/* Lyrics Info */}
          <div className="text-xs text-gray-400 text-center">
            Lyrics auto-scroll every 3 seconds | {currentLyrics.length} lines
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-400">Analyzing audio...</p>
          <p className="text-gray-500 text-sm mt-2">Detection in progress</p>
        </div>
      )}
    </div>
  );
};

export default LyricsDisplay;
