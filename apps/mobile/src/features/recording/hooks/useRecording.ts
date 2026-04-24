import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

export type RecordingStatus = "idle" | "recording" | "stopped" | "denied";

const MAX_DURATION_MS = 60_000;
const UPDATE_INTERVAL_MS = 80;
const SAMPLE_BUFFER_SIZE = 32;

/** Map an iOS metering value (dB, typically -160..0) into [0, 1]. */
function normaliseMetering(db: number | null | undefined): number {
  if (db == null || !Number.isFinite(db)) return 0;
  const floor = -60;
  if (db <= floor) return 0;
  if (db >= 0) return 1;
  return (db - floor) / -floor;
}

export function useRecording() {
  const recorderConfig = useMemo(
    () => ({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true }),
    []
  );
  const recorder = useAudioRecorder(recorderConfig);
  const recorderState = useAudioRecorderState(recorder, UPDATE_INTERVAL_MS);
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [samples, setSamples] = useState<number[]>(
    () => Array(SAMPLE_BUFFER_SIZE).fill(0)
  );
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
    };
  }, []);

  // Push new metering sample onto the rolling buffer while recording.
  useEffect(() => {
    if (status !== "recording") return;
    const level = normaliseMetering(recorderState.metering);
    setSamples((prev) => {
      const next = prev.slice(1);
      next.push(level);
      return next;
    });
  }, [status, recorderState.metering]);

  const stop = useCallback(async () => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    try {
      await recorder.stop();
      setAudioUri(recorder.uri ?? null);
      setStatus("stopped");
    } catch (e) {
      console.warn("stop failed", e);
      setStatus("idle");
    }
  }, [recorder]);

  const start = useCallback(async () => {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setStatus("denied");
      Alert.alert(
        "Sin permiso de micrófono",
        "Riffado necesita escuchar la canción para detectar los acordes. Actívalo en Ajustes."
      );
      return;
    }

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    setAudioUri(null);
    setSamples(Array(SAMPLE_BUFFER_SIZE).fill(0));
    await recorder.prepareToRecordAsync();
    recorder.record();
    setStatus("recording");

    autoStopRef.current = setTimeout(() => {
      void stop();
    }, MAX_DURATION_MS);
  }, [recorder, stop]);

  const reset = useCallback(() => {
    setAudioUri(null);
    setStatus("idle");
    setSamples(Array(SAMPLE_BUFFER_SIZE).fill(0));
  }, []);

  return {
    status,
    audioUri,
    start,
    stop,
    reset,
    samples,
    durationMs: recorderState.durationMillis,
    maxDurationMs: MAX_DURATION_MS,
  };
}
