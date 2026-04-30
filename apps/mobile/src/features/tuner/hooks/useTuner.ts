import { useAudioRecorder } from "@siteed/audio-studio";
import { useCallback, useEffect, useRef, useState } from "react";

import { detectPitchYin } from "../algorithms/yin";
import { NoteReading, readingFromFrequency } from "../utils/noteMapping";

// 16 kHz is plenty for guitar pitch (E2≈82 Hz, E4≈330 Hz, harmonics up to
// ~5 kHz). At 44.1 kHz, YIN's O(N²) per chunk landed around 5M ops which
// Hermes was processing slower than the 100 ms cadence, so chunks queued
// up and the UI froze with stale readings. 16 kHz drops it ~8× and stays
// real-time.
const SAMPLE_RATE = 16000;
const CHUNK_INTERVAL_MS = 100;
const MIN_CONFIDENCE = 0.5;
const EMA_ALPHA = 0.4;

export type TunerStatus = "idle" | "starting" | "listening" | "denied" | "error";

export interface TunerState {
  status: TunerStatus;
  reading: NoteReading | null;
  /** Confidence of the most recent YIN result (0..1). */
  confidence: number;
  /** Diagnostic snapshot from the last chunk so the screen can surface it. */
  debug: {
    chunkSize: number;
    rawFreq: number | null;
    maxAmplitude: number;
    chunksSeen: number;
    lastChunkAgoMs: number;
  };
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
 *
 * `start` and `stop` are stable across renders by design — they only depend
 * on refs, not on `status` or the recorder object. This is critical because
 * `TunerScreen` feeds them into `useFocusEffect`'s dep array; if they
 * changed every time `setStatus` ran the focus effect would re-execute and
 * call `stop()` again, which would `setStatus("idle")` and trigger an
 * infinite update loop.
 */
export function useTuner(): TunerState {
  const recorder = useAudioRecorder();
  const [status, setStatus] = useState<TunerStatus>("idle");
  const [reading, setReading] = useState<NoteReading | null>(null);
  const [confidence, setConfidence] = useState(0);

  // Mirror render-time values into refs so the stable callbacks below can
  // read the latest value without taking them as deps.
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;
  const statusRef = useRef<TunerStatus>("idle");
  statusRef.current = status;

  const smoothedFreqRef = useRef<number | null>(null);
  const chunksSeenRef = useRef(0);
  const lastChunkAtRef = useRef(0);
  const [debug, setDebug] = useState<TunerState["debug"]>({
    chunkSize: 0,
    rawFreq: null,
    maxAmplitude: 0,
    chunksSeen: 0,
    lastChunkAgoMs: 0,
  });

  const handleChunk = useCallback(async (samples: Float32Array) => {
    if (samples.length < 32) return;
    const now = Date.now();
    chunksSeenRef.current += 1;
    const sinceLast = lastChunkAtRef.current === 0 ? 0 : now - lastChunkAtRef.current;
    lastChunkAtRef.current = now;

    let max = 0;
    for (let i = 0; i < samples.length; i++) {
      const a = Math.abs(samples[i]);
      if (a > max) max = a;
    }

    const result = detectPitchYin(samples, { sampleRate: SAMPLE_RATE });
    setConfidence(result.confidence);

    // Surface raw diagnostics every ~500ms so the screen can show whether
    // chunks are arriving at all and what YIN is producing.
    if (chunksSeenRef.current % 5 === 0) {
      setDebug({
        chunkSize: samples.length,
        rawFreq: result.freq,
        maxAmplitude: max,
        chunksSeen: chunksSeenRef.current,
        lastChunkAgoMs: sinceLast,
      });
    }

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
    const current = statusRef.current;
    if (current === "starting" || current === "listening") return;
    setStatus("starting");
    smoothedFreqRef.current = null;
    setReading(null);
    setConfidence(0);
    try {
      await recorderRef.current.startRecording({
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
  }, [handleChunk]);

  const stop = useCallback(async () => {
    if (!recorderRef.current.isRecording) {
      // No-op when nothing is recording. Crucially we do NOT setStatus here —
      // doing so on every focus cleanup would re-trigger renders and a loop.
      return;
    }
    try {
      await recorderRef.current.stopRecording();
    } catch (e) {
      console.warn("[useTuner] stopRecording failed", e);
    }
    smoothedFreqRef.current = null;
    setReading(null);
    setConfidence(0);
    setStatus("idle");
  }, []);

  // Stop on unmount so the mic stream doesn't keep running after navigating
  // away from the screen.
  useEffect(() => {
    return () => {
      if (recorderRef.current.isRecording) {
        void recorderRef.current.stopRecording().catch(() => {});
      }
    };
  }, []);

  return { status, reading, confidence, debug, start, stop };
}
