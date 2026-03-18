import React, { useState, useEffect } from 'react';
import { Music, Globe, AlertCircle } from 'lucide-react';
import { HarmonyAnalysis } from '../utils/audioProcessor';
import { songService, type SongMatch as ServiceSongMatch, type SupportedLanguage } from '../services/songService';
import { languageDetector } from '../utils/languageDetector';

interface LyricsDisplayProps {
  harmonyAnalysis: HarmonyAnalysis | null;
  detectedKey: string;
  isRecording: boolean;
}

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({
  harmonyAnalysis,
  detectedKey,
  isRecording
}) => {
  const [songMatches, setSongMatches] = useState<ServiceSongMatch[]>([]);
  const [selectedSongIndex, setSelectedSongIndex] = useState(0);
  const [detectedLanguage, setDetectedLanguage] = useState<SupportedLanguage>('english');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [languageFilter, setLanguageFilter] = useState<SupportedLanguage | null>(null);

  const languages: SupportedLanguage[] = ['english', 'swahili', 'kirundi', 'kinyarwanda', 'lingala'];
  const languageLabels: Record<SupportedLanguage, string> = {
    english: 'English',
    swahili: 'Swahili',
    kirundi: 'Kirundi',
    kinyarwanda: 'Kinyarwanda',
    lingala: 'Lingala'
  };

  useEffect(() => {
    if (!isRecording) {
      setSongMatches([]);
      setError(null);
      return;
    }

    const detectAndFetchSongs = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!detectedKey || !harmonyAnalysis) {
          setIsLoading(false);
          return;
        }

        const keyParts = detectedKey.split('/');
        const key = (keyParts[0].toUpperCase() as any);
        const mode = (harmonyAnalysis.harmonyType === 'minor' ? 'minor' : 'major') as 'major' | 'minor';

        const matchedLyrics = (harmonyAnalysis.melodyNotes || [])
          .concat(harmonyAnalysis.chordNotes || [])
          .join(' ');

        const detectedLang = languageDetector.detectLanguage(matchedLyrics);
        setDetectedLanguage(detectedLang);

        const targetLanguage = languageFilter || detectedLang;

        const matches = await songService.matchSongs(
          key || null,
          mode,
          targetLanguage,
          5
        );

        setSongMatches(matches);

        if (matches.length === 0) {
          setError(`No songs found for ${languageLabels[targetLanguage]} in key ${key}`);
        }
      } catch (err) {
        console.error('Error fetching songs:', err);
        setError('Failed to fetch songs. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(detectAndFetchSongs, 1000);
    return () => clearTimeout(debounceTimer);
  }, [isRecording, detectedKey, harmonyAnalysis, languageFilter]);

  if (!isRecording) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Music className="w-6 h-6 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Multilingual Song Detection</h2>
        </div>
        <p className="text-gray-400 text-center py-8">
          Start listening to detect songs in English, Swahili, Kirundi, Kinyarwanda, or Lingala
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Music className="w-6 h-6 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Multilingual Song Detection</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-400 font-medium">
            {languageLabels[detectedLanguage]}
          </span>
        </div>
      </div>

      {/* Language Filter */}
      <div className="mb-4 p-3 bg-gray-900/50 rounded-lg border border-gray-600">
        <p className="text-xs text-gray-400 mb-2">Filter by language:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setLanguageFilter(null)}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              languageFilter === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Auto-detect
          </button>
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguageFilter(lang)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                languageFilter === lang
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {languageLabels[lang]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full mb-3"></div>
          <p className="text-gray-300">Detecting songs in {languageLabels[detectedLanguage]}...</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-300">{error}</p>
        </div>
      )}

      {!isLoading && songMatches.length > 0 && (
        <div className="space-y-4">
          {/* Song Selection */}
          <div className="flex flex-wrap gap-2">
            {songMatches.map((match, index) => (
              <button
                key={match.song.id}
                onClick={() => setSelectedSongIndex(index)}
                className={`px-4 py-2 rounded-lg transition-all text-left ${
                  selectedSongIndex === index
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <div className="text-sm font-medium">{match.song.title}</div>
                <div className="text-xs opacity-75">{match.song.artist}</div>
                <div className="text-xs mt-1 space-y-0.5">
                  <div>{match.confidence.toFixed(0)}% match</div>
                  <div className="opacity-60">
                    Key: {match.song.key_signature} {match.song.mode}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Song Preview */}
          {songMatches.length > 0 && (
            <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {songMatches[selectedSongIndex].song.title}
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                  by {songMatches[selectedSongIndex].song.artist}
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-400">
                  <span className="px-2 py-1 bg-gray-800 rounded">
                    {languageLabels[songMatches[selectedSongIndex].song.language]}
                  </span>
                  <span className="px-2 py-1 bg-gray-800 rounded">
                    {songMatches[selectedSongIndex].song.key_signature} {songMatches[selectedSongIndex].song.mode}
                  </span>
                </div>
              </div>

              {/* Lyrics Preview */}
              <div className="bg-gray-800/50 rounded p-4 min-h-40 flex items-center justify-center">
                {songMatches[selectedSongIndex].song.lyrics_preview ? (
                  <div className="text-gray-200 text-sm leading-relaxed">
                    <p className="italic text-gray-400 mb-2">Lyrics Preview:</p>
                    <p className="line-clamp-4">
                      {songMatches[selectedSongIndex].song.lyrics_preview}
                    </p>
                    <p className="text-xs text-gray-500 mt-3">
                      [Full lyrics available in licensed music services]
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center">No preview available for this song</p>
                )}
              </div>

              {/* Match Info */}
              <div className="mt-4 text-xs text-gray-400">
                <p>
                  Matched by: <span className="text-blue-400 font-medium">
                    {songMatches[selectedSongIndex].matchedBy.replace(/_/g, ' ')}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {!isLoading && songMatches.length === 0 && !error && (
        <div className="text-center py-8">
          <p className="text-gray-400">Waiting for audio analysis...</p>
          <p className="text-gray-500 text-sm mt-2">Keep singing to detect songs</p>
        </div>
      )}
    </div>
  );
};

export default LyricsDisplay;
