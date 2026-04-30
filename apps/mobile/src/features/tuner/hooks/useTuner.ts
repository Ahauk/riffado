import { useAudioRecorder } from "@siteed/audio-studio";
import { useCallback, useEffect, useRef, useState } from "react";

import { detectPitchYin } from "../algorithms/yin";
import { NoteReading, readingFromFrequency } from "../utils/noteMapping";

const SAMPLE_RATE = 44100;
const CHUNK_INTERVAL_MS = 100; // 100ms ≈ 4410 samples → enough window for low-E (~82 Hz, 12 cycles).
const MIN_CONFIDENCE = 0.85;
const EMA_ALPHA = 0.4; // Exponential moving average on detected frequency to steady the needle.

export type TunerStatus = "idle" | "starting" | "listening" | "denied" | "error";

export interface TunerState {
  status: TunerStatus;
  reading: NoteReading | null;
  /** Confidence of the most recent YIN result (0..1). */
  confidence: number;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

/**
 * Continuously analyses mic input with YIN and emits a stable note reading.
 *
 * `@siteed/audio-studio` streams raw Float32 PCM chunks at the configured
 * interval; we run YIN on each chunk and feed an EMA-smoothed frequency into
 * the note mapper. Results below MIN_CONFIDENCE are ignored — they're almost
 * always silence/noise/transient and would just make the needle jitter.
 */
export function useTuner(): TunerState {
  const recorder = useAudioRecorder();
  const [status, setStatus] = useState<TunerStatus>("idle");
  const [reading, setReading] = useState<NoteReading | null>(null);
  const [confidence, setConfidence] = useState(0);

  // Smoothed frequency state lives in a ref so the audio callback can read
  // and update it without forcing re-renders.
  const smoothedFreqRef = useRef<number | null>(null);

  // Reset smoothing whenever we (re)start recording so a stale frequency
  // from a previous session doesn't leak into the first chunk.
  const startedAtRef = useRef(0);

  const handleChunk = useCallback(async (samples: Float32Array) => {
    if (samples.length < 32) return;
    const result = detectPitchYin(samples, { sampleRate: SAMPLE_RATE });
    setConfidence(result.confidence);
    if (result.freq == null || result.confidence < MIN_CONFIDENCE) {
      // Don't override the last good reading — keeps the UI stable while the
      // user moves between strings or lifts off briefly.
      return;
    }
    const prev = smoothedFreqRef.current;
    const smoothed =
      prev == null ? result.freq : prev * (1 - EMA_ALPHA) + result.freq * EMA_ALPHA;
    smoothedFreqRef.current = smoothed;
    setReading(readingFromFrequency(smoothed));
  }, []);

  const start = useCallback(async () => {
    if (status === "starting" || status === "listening") return;
    setStatus("starting");
    smoothedFreqRef.current = null;
    setReading(null);
    setConfidence(0);
    startedAtRef.current = Date.now();
    try {
      await recorder.startRecording({
        sampleRate: SAMPLE_RATE,
        channels: 1,
        encoding: "pcm_32bit",
        interval: CHUNK_INTERVAL_MS,
        streamFormat: "float32",
        // We don't need a saved audio file from the tuner; suppress the
        // primary output so we're not littering Documents/ with unused .wav's.
        output: { primary: { enabled: false } },
        keepAwake: true,
        onAudioStream: async (event) => {
          if (event.streamFormat === "float32") {
            await handleChunk(event.data);
          }
        },
      });
      setStatus("listening");
    } catch (e) {
      console.warn("[useTuner] startRecording failed", e);
      setStatus(
        e instanceof Error && /permission|denied/i.test(e.message)
          ? "denied"
          : "error",
      );
    }
  }, [recorder, status, handleChunk]);

  const stop = useCallback(async () => {
    if (!recorder.isRecording) {
      setStatus("idle");
      return;
    }
    try {
      await recorder.stopRecording();
    } catch (e) {
      console.warn("[useTuner] stopRecording failed", e);
    }
    smoothedFreqRef.current = null;
    setReading(null);
    setConfidence(0);
    setStatus("idle");
  }, [recorder]);

  // Stop on unmount so the mic stream doesn't keep running after navigating
  // away from the screen.
  useEffect(() => {
    return () => {
      if (recorder.isRecording) {
        void recorder.stopRecording().catch(() => {});
      }
    };
    // We deliberately depend only on the stable recorder reference. The
    // exhaustive-deps lint rule would suggest including stop, but stop is
    // recreated on every state change and we'd then have a teardown loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, reading, confidence, start, stop };
}
