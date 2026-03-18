import { supabase } from '../lib/supabase';

export type SupportedLanguage = 'english' | 'swahili' | 'kirundi' | 'kinyarwanda' | 'lingala';
export type MusicKey = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type MusicMode = 'major' | 'minor';

export interface Song {
  id: string;
  title: string;
  artist: string;
  key_signature: MusicKey;
  mode: MusicMode;
  language: SupportedLanguage;
  lyrics_preview: string | null;
  created_at: string;
}

export interface SongMatch {
  song: Song;
  confidence: number;
  matchedBy: 'key' | 'key_and_mode' | 'language';
}

class SongService {
  private cache: Map<string, Song[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private CACHE_TTL = 5 * 60 * 1000;

  async searchSongsByLanguage(language: SupportedLanguage): Promise<Song[]> {
    const cacheKey = `lang_${language}`;
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey) || [];
    }

    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('language', language)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching songs for language ${language}:`, error);
      return [];
    }

    const songs = (data || []) as Song[];
    this.setCache(cacheKey, songs);
    return songs;
  }

  async searchSongsByKeyAndLanguage(
    key: MusicKey,
    mode: MusicMode,
    language: SupportedLanguage
  ): Promise<Song[]> {
    const cacheKey = `key_${key}_${mode}_${language}`;
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey) || [];
    }

    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('key_signature', key)
      .eq('mode', mode)
      .eq('language', language)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching songs by key:', error);
      return [];
    }

    const songs = (data || []) as Song[];
    this.setCache(cacheKey, songs);
    return songs;
  }

  async searchSongsByKey(key: MusicKey, mode: MusicMode): Promise<Song[]> {
    const cacheKey = `key_${key}_${mode}`;
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey) || [];
    }

    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('key_signature', key)
      .eq('mode', mode)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching songs by key:', error);
      return [];
    }

    const songs = (data || []) as Song[];
    this.setCache(cacheKey, songs);
    return songs;
  }

  async matchSongs(
    detectedKey: MusicKey | null,
    mode: MusicMode,
    language: SupportedLanguage,
    limit: number = 5
  ): Promise<SongMatch[]> {
    const matches: SongMatch[] = [];

    if (detectedKey && language) {
      const keyAndLangSongs = await this.searchSongsByKeyAndLanguage(
        detectedKey,
        mode,
        language
      );
      matches.push(
        ...keyAndLangSongs.map((song, index) => ({
          song,
          confidence: Math.max(80, 95 - index * 5),
          matchedBy: 'key_and_mode' as const,
        }))
      );
    }

    if (language && matches.length < limit) {
      const langSongs = await this.searchSongsByLanguage(language);
      const existingIds = new Set(matches.map((m) => m.song.id));
      const newSongs = langSongs
        .filter((s) => !existingIds.has(s.id))
        .slice(0, limit - matches.length);

      matches.push(
        ...newSongs.map((song, index) => ({
          song,
          confidence: Math.max(60, 75 - index * 5),
          matchedBy: 'language' as const,
        }))
      );
    }

    if (detectedKey && matches.length < limit) {
      const keySongs = await this.searchSongsByKey(detectedKey, mode);
      const existingIds = new Set(matches.map((m) => m.song.id));
      const newSongs = keySongs
        .filter((s) => !existingIds.has(s.id))
        .slice(0, limit - matches.length);

      matches.push(
        ...newSongs.map((song, index) => ({
          song,
          confidence: Math.max(50, 70 - index * 5),
          matchedBy: 'key' as const,
        }))
      );
    }

    return matches.slice(0, limit);
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry) return false;
    return Date.now() < expiry;
  }

  private setCache(key: string, data: Song[]): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }
}

export const songService = new SongService();
