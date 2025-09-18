import { ChromaData, KeyDetectionResult } from '../types/audio';

// Krumhansl-Schmuckler key profiles
const KEY_PROFILES = {
  major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
  minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export class KeyDetector {
  private keyHistory: KeyDetectionResult[] = [];
  private readonly historyLength = 5;
  private readonly confidenceThreshold = 0.05; // Very low threshold

  detectKey(chroma: ChromaData): KeyDetectionResult | null {
    if (!chroma || !chroma.vector || chroma.vector.length !== 12) {
      console.log('Invalid chroma data:', chroma);
      return null;
    }

    // Check if chroma has meaningful data
    const chromaSum = chroma.vector.reduce((sum, val) => sum + val, 0);
    if (chromaSum < 0.01) { // Very low threshold
      console.log('Chroma sum too low:', chromaSum);
      return null;
    }

    let bestKey = '';
    let bestMode: 'major' | 'minor' = 'major';
    let bestScore = -Infinity;

    console.log('Analyzing chroma vector:', chroma.vector.map(v => v.toFixed(3)));

    // Test all 24 keys (12 major + 12 minor)
    for (let root = 0; root < 12; root++) {
      for (const mode of ['major', 'minor'] as const) {
        const score = this.calculateKeyScore(chroma.vector, root, mode);
        if (score > bestScore) {
          bestScore = score;
          bestKey = NOTE_NAMES[root];
          bestMode = mode;
        }
      }
    }

    console.log(`Best key detected: ${bestKey} ${bestMode} with score: ${bestScore.toFixed(3)}`);

    const confidence = this.normalizeScore(bestScore);
    
    if (confidence < this.confidenceThreshold) {
      console.log(`Confidence too low: ${confidence.toFixed(3)}`);
      return null;
    }

    const result: KeyDetectionResult = {
      key: bestKey,
      mode: bestMode,
      confidence,
      chroma
    };

    // Add to history and smooth
    this.addToHistory(result);
    return this.getSmoothedResult();
  }

  private calculateKeyScore(chroma: number[], root: number, mode: 'major' | 'minor'): number {
    const profile = KEY_PROFILES[mode];
    let correlation = 0;
    let chromaSum = 0;
    let profileSum = 0;
    let chromaMean = 0;
    let profileMean = 0;

    // Calculate means
    for (let i = 0; i < 12; i++) {
      const chromaIndex = (i + root) % 12;
      chromaMean += chroma[chromaIndex];
      profileMean += profile[i];
    }
    chromaMean /= 12;
    profileMean /= 12;

    // Calculate correlation
    for (let i = 0; i < 12; i++) {
      const chromaIndex = (i + root) % 12;
      const chromaVal = chroma[chromaIndex] - chromaMean;
      const profileVal = profile[i] - profileMean;
      
      correlation += chromaVal * profileVal;
      chromaSum += chromaVal * chromaVal;
      profileSum += profileVal * profileVal;
    }

    // Pearson correlation coefficient
    if (chromaSum === 0 || profileSum === 0) return 0;
    return correlation / (Math.sqrt(chromaSum) * Math.sqrt(profileSum));
  }

  private normalizeScore(score: number): number {
    // Convert correlation to confidence percentage
    return Math.max(0, Math.min(1, (score + 1) / 2));
  }

  private addToHistory(result: KeyDetectionResult): void {
    this.keyHistory.push(result);
    if (this.keyHistory.length > this.historyLength) {
      this.keyHistory.shift();
    }
  }

  private getSmoothedResult(): KeyDetectionResult | null {
    if (this.keyHistory.length === 0) return null;

    // For faster response, return the latest result if we have fewer samples
    if (this.keyHistory.length < 3) {
      return this.keyHistory[this.keyHistory.length - 1];
    }

    // Count occurrences of each key
    const keyCount: { [key: string]: number } = {};

    this.keyHistory.forEach(result => {
      const keyMode = `${result.key}_${result.mode}`;
      keyCount[keyMode] = (keyCount[keyMode] || 0) + 1;
    });

    // Find most common key-mode combination
    let mostCommon = '';
    let maxCount = 0;

    Object.entries(keyCount).forEach(([keyMode, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = keyMode;
      }
    });

    if (mostCommon === '') return this.keyHistory[this.keyHistory.length - 1];

    const [key, mode] = mostCommon.split('_');
    const latestResult = this.keyHistory[this.keyHistory.length - 1];

    // Calculate smoothed confidence
    const confidence = Math.min(1, (maxCount / this.historyLength) * latestResult.confidence);

    return {
      key,
      mode: mode as 'major' | 'minor',
      confidence,
      chroma: latestResult.chroma
    };
  }

  reset(): void {
    this.keyHistory = [];
  }

  getCurrentHistory(): KeyDetectionResult[] {
    return [...this.keyHistory];
  }
}