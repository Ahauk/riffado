/**
 * YIN pitch detection algorithm (de Cheveigné & Kawahara, 2002).
 *
 * Steps:
 *   1. Difference function d(τ) = Σ (x[i] - x[i+τ])²
 *   2. Cumulative mean normalized difference d'(τ)
 *   3. Find smallest τ where d'(τ) drops below threshold
 *   4. Parabolic interpolation around that τ for sub-sample accuracy
 *   5. Convert τ → frequency = sampleRate / τ
 *
 * Tuned for guitar: search range maps to roughly 70-1300 Hz, which covers
 * standard tuning (E2 ≈ 82 Hz) up to a high-fret first-string note.
 */

export interface YinResult {
  /** Detected fundamental frequency in Hz, or null if unreliable. */
  freq: number | null;
  /** 1 - normalized difference at the picked τ (0..1). Higher = cleaner pitch. */
  confidence: number;
}

export interface YinConfig {
  sampleRate: number;
  /** Threshold on normalized difference; lower = stricter. 0.10–0.15 typical. */
  threshold: number;
  /** Minimum frequency to consider (lower bound for τ search). */
  minFreq: number;
  /** Maximum frequency to consider (upper bound for τ search). */
  maxFreq: number;
}

const DEFAULT_CONFIG: Omit<YinConfig, "sampleRate"> = {
  threshold: 0.12,
  minFreq: 70,
  maxFreq: 1300,
};

/**
 * Run YIN over a buffer of mono PCM samples (-1..1 floats).
 *
 * Allocates a scratch array of length buffer.length / 2 each call. For
 * production hot-paths you'd preallocate it; for our 100ms cadence on a
 * 2048-sample window this is negligible.
 */
export function detectPitchYin(
  buffer: Float32Array,
  config: Partial<YinConfig> & { sampleRate: number },
): YinResult {
  const { sampleRate, threshold, minFreq, maxFreq } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const halfLen = Math.floor(buffer.length / 2);
  if (halfLen < 16) return { freq: null, confidence: 0 };

  const tauMin = Math.max(2, Math.floor(sampleRate / maxFreq));
  const tauMax = Math.min(halfLen - 1, Math.floor(sampleRate / minFreq));
  if (tauMax <= tauMin) return { freq: null, confidence: 0 };

  // Step 1: difference function. Only compute for τ in [tauMin, tauMax].
  // d[0] is unused.
  const yinBuf = new Float32Array(halfLen);
  for (let tau = 1; tau < halfLen; tau++) {
    let sum = 0;
    for (let i = 0; i < halfLen; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    yinBuf[tau] = sum;
  }

  // Step 2: cumulative mean normalized difference.
  // d'(0) = 1; d'(τ) = d(τ) / ((1/τ) Σ d(j))
  yinBuf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfLen; tau++) {
    runningSum += yinBuf[tau];
    yinBuf[tau] = (yinBuf[tau] * tau) / runningSum;
  }

  // Step 3: pick the first τ in range where d'(τ) < threshold AND it's a
  // local minimum (so we don't latch onto the falling edge of a deeper dip).
  let pickedTau = -1;
  for (let tau = tauMin; tau <= tauMax; tau++) {
    if (yinBuf[tau] < threshold) {
      while (tau + 1 <= tauMax && yinBuf[tau + 1] < yinBuf[tau]) {
        tau++;
      }
      pickedTau = tau;
      break;
    }
  }

  if (pickedTau < 0) {
    // No τ passed the threshold — pick the global minimum in range, but
    // report low confidence so the caller can ignore.
    let bestTau = tauMin;
    let bestVal = yinBuf[tauMin];
    for (let tau = tauMin + 1; tau <= tauMax; tau++) {
      if (yinBuf[tau] < bestVal) {
        bestVal = yinBuf[tau];
        bestTau = tau;
      }
    }
    if (bestVal > 0.5) {
      return { freq: null, confidence: 0 };
    }
    pickedTau = bestTau;
  }

  // Step 4: parabolic interpolation around pickedTau for sub-sample accuracy.
  let betterTau = pickedTau;
  if (pickedTau > tauMin && pickedTau < tauMax) {
    const s0 = yinBuf[pickedTau - 1];
    const s1 = yinBuf[pickedTau];
    const s2 = yinBuf[pickedTau + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (denom !== 0) {
      betterTau = pickedTau + (s2 - s0) / denom;
    }
  }

  const freq = sampleRate / betterTau;
  const confidence = Math.max(0, Math.min(1, 1 - yinBuf[pickedTau]));
  return { freq, confidence };
}
