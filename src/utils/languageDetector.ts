import type { SupportedLanguage } from '../services/songService';

interface LanguageIndicators {
  english: string[];
  swahili: string[];
  kirundi: string[];
  kinyarwanda: string[];
  lingala: string[];
}

const languageKeywords: LanguageIndicators = {
  english: [
    'the', 'and', 'is', 'you', 'love', 'me', 'my', 'your', 'baby', 'night',
    'day', 'heart', 'feel', 'want', 'need', 'know', 'give', 'take', 'come', 'go'
  ],
  swahili: [
    'ni', 'na', 'wa', 'ya', 'la', 'ta', 'ndo', 'leo', 'sana', 'rafiki',
    'pole', 'haraka', 'jina', 'mimi', 'wewe', 'yeye', 'kupenda', 'kufa', 'maisha', 'dunia'
  ],
  kirundi: [
    'ni', 'n\'', 'ba', 'ya', 'ku', 'mu', 'ndi', 'mwe', 'indi', 'uri',
    'arimo', 'iriya', 'ubwenge', 'ubuntu', 'ijambo', 'agaciro', 'umugisha', 'inzira'
  ],
  kinyarwanda: [
    'ni', 'n\'', 'ba', 'ya', 'ku', 'mu', 'ndi', 'mwe', 'indi', 'uri',
    'arimo', 'iriya', 'ubwenge', 'ubuntu', 'ijambo', 'agaciro', 'inzira', 'akazi'
  ],
  lingala: [
    'na', 'ye', 'ba', 'ka', 'li', 'lo', 'ndoki', 'yo', 'bo', 'nde',
    'lingala', 'bolingo', 'mokonzi', 'muntu', 'malamu', 'lisalisi', 'mokili', 'bangbi'
  ]
};

const languagePatterns: Record<SupportedLanguage, RegExp[]> = {
  english: [
    /\b(the|and|is|you|love|me|my|your|baby|night|day)\b/gi,
  ],
  swahili: [
    /\b(ni|na|wa|ya|la|ta|ndo|leo|sana|rafiki)\b/gi,
    /[aeiou]{2,}/g,
  ],
  kirundi: [
    /n'[aeiou]/gi,
    /\bni\b/gi,
    /[iyu]$/gm,
  ],
  kinyarwanda: [
    /n'[aeiou]/gi,
    /\bni\b/gi,
    /[iyu]$/gm,
  ],
  lingala: [
    /\bnda\b/gi,
    /\bna\b/gi,
    /[eao]na/gi,
  ]
};

class LanguageDetector {
  detectLanguage(text: string): SupportedLanguage {
    if (!text || text.trim().length === 0) {
      return 'english';
    }

    const normalizedText = text.toLowerCase().trim();
    const scores: Record<SupportedLanguage, number> = {
      english: 0,
      swahili: 0,
      kirundi: 0,
      kinyarwanda: 0,
      lingala: 0
    };

    const languages: SupportedLanguage[] = [
      'english',
      'swahili',
      'kirundi',
      'kinyarwanda',
      'lingala'
    ];

    for (const lang of languages) {
      const keywords = languageKeywords[lang];
      const keywordMatches = keywords.filter(kw =>
        new RegExp(`\\b${kw}\\b`, 'gi').test(normalizedText)
      ).length;
      scores[lang] += keywordMatches * 5;

      const patterns = languagePatterns[lang];
      for (const pattern of patterns) {
        const matches = normalizedText.match(pattern);
        scores[lang] += (matches ? matches.length : 0);
      }
    }

    let maxScore = 0;
    let detectedLanguage: SupportedLanguage = 'english';

    for (const lang of languages) {
      if (scores[lang] > maxScore) {
        maxScore = scores[lang];
        detectedLanguage = lang;
      }
    }

    return detectedLanguage;
  }

  detectMultipleSongs(
    texts: string[]
  ): { text: string; language: SupportedLanguage }[] {
    return texts.map(text => ({
      text,
      language: this.detectLanguage(text)
    }));
  }

  getConfidence(text: string, language: SupportedLanguage): number {
    if (!text || text.trim().length === 0) {
      return 0;
    }

    const normalizedText = text.toLowerCase();
    const patterns = languagePatterns[language];
    let matches = 0;
    let totalPatternTests = 0;

    for (const pattern of patterns) {
      const found = normalizedText.match(pattern);
      matches += found ? found.length : 0;
      totalPatternTests += (pattern.global ? normalizedText.length / 10 : 1);
    }

    const keywords = languageKeywords[language];
    const keywordMatches = keywords.filter(kw =>
      new RegExp(`\\b${kw}\\b`, 'gi').test(normalizedText)
    ).length;

    const confidence = Math.min(100, (matches + keywordMatches * 3) / (totalPatternTests / 10));
    return Math.round(confidence);
  }
}

export const languageDetector = new LanguageDetector();
export type { SupportedLanguage };
