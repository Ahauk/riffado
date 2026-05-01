import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef } from "react";

import { NOTE_SAMPLES } from "./sampleMap";

const ARPEGGIO_GAP_MS = 240;
const PITCH_CLASS_COUNT = 12;
const MAX_VOICES = 4;

/**
 * Plays a chord as a slow arpeggio — one note per voice, staggered by
 * ARPEGGIO_GAP_MS. Each voice rings out over the next so the result feels
 * like a guitar strum rather than four staccato beeps.
 *
 * One pre-loaded player per chromatic pitch class: replacing a player's
 * source at runtime in expo-audio is asynchronous, so calling play()
 * immediately after replace() races the load and the note silently no-ops.
 * Pinning each player to a fixed note avoids that race entirely — play()
 * just rewinds and triggers an already-loaded sample.
 *
 * Re-pressing during a previous arpeggio cancels its pending stagger and
 * restarts cleanly.
 */
export function useChordPlayer() {
  // 12 pre-loaded voices — one per chromatic pitch class. Hook order is
  // stable across renders, which is what useAudioPlayer requires.
  const p0 = useAudioPlayer(NOTE_SAMPLES[0]);
  const p1 = useAudioPlayer(NOTE_SAMPLES[1]);
  const p2 = useAudioPlayer(NOTE_SAMPLES[2]);
  const p3 = useAudioPlayer(NOTE_SAMPLES[3]);
  const p4 = useAudioPlayer(NOTE_SAMPLES[4]);
  const p5 = useAudioPlayer(NOTE_SAMPLES[5]);
  const p6 = useAudioPlayer(NOTE_SAMPLES[6]);
  const p7 = useAudioPlayer(NOTE_SAMPLES[7]);
  const p8 = useAudioPlayer(NOTE_SAMPLES[8]);
  const p9 = useAudioPlayer(NOTE_SAMPLES[9]);
  const p10 = useAudioPlayer(NOTE_SAMPLES[10]);
  const p11 = useAudioPlayer(NOTE_SAMPLES[11]);
  const players = [p0, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11];

  const pendingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Force playback to ignore the silent-mode switch and route audio to the
  // main speaker. Recording flows (tuner, /v1/analyze) leave allowsRecording
  // pinned to true on iOS, which routes playback through the earpiece —
  // flipping both back here makes the chord button audible regardless of
  // where the user came from.
  useEffect(() => {
    void setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    }).catch(() => {});
  }, []);

  const play = useCallback(
    (rootChromatic: number, intervals: number[]) => {
      // Cancel any in-flight stagger from a prior press.
      for (const t of pendingTimers.current) clearTimeout(t);
      pendingTimers.current = [];

      const voices = intervals.slice(0, MAX_VOICES);
      voices.forEach((interval, i) => {
        const pc =
          (((rootChromatic + interval) % PITCH_CLASS_COUNT) + PITCH_CLASS_COUNT) %
          PITCH_CLASS_COUNT;
        const player = players[pc];

        const fire = () => {
          try {
            player.seekTo(0);
            player.play();
          } catch (e) {
            console.warn("[useChordPlayer] play failed", e);
          }
        };

        if (i === 0) {
          fire();
        } else {
          const t = setTimeout(fire, i * ARPEGGIO_GAP_MS);
          pendingTimers.current.push(t);
        }
      });
    },
    // players come from useAudioPlayer hooks; their identities are stable
    // across renders, so the deps array is intentionally empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { play };
}
