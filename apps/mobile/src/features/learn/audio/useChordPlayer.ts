import { useAudioPlayer } from "expo-audio";
import { useCallback, useRef } from "react";

import { DEFAULT_SAMPLE, NOTE_SAMPLES } from "./sampleMap";

const ARPEGGIO_GAP_MS = 180;
const PITCH_CLASS_COUNT = 12;
const MAX_VOICES = 4;

/**
 * Plays a chord as a slow arpeggio — one note per voice, staggered by
 * ARPEGGIO_GAP_MS. Each voice gets its own player so notes can ring out
 * over each other (the natural behaviour of a guitar strum).
 *
 * Re-pressing while a previous arpeggio is still ringing cancels its
 * pending stagger and starts a fresh one. Voices are reused, so the
 * tail of the previous chord is cut off — that's the same UX as
 * strumming a guitar twice in a row.
 */
export function useChordPlayer() {
  // 4 players cover every chord type in CHORD_FORMULAS (the largest are
  // 4-note 7ths). Each starts pointed at a default source — replaced
  // synchronously before each play().
  const v1 = useAudioPlayer(DEFAULT_SAMPLE);
  const v2 = useAudioPlayer(DEFAULT_SAMPLE);
  const v3 = useAudioPlayer(DEFAULT_SAMPLE);
  const v4 = useAudioPlayer(DEFAULT_SAMPLE);
  const players = [v1, v2, v3, v4];

  const pendingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const play = useCallback(
    (rootChromatic: number, intervals: number[]) => {
      // Cancel any in-flight stagger from a prior press.
      for (const t of pendingTimers.current) clearTimeout(t);
      pendingTimers.current = [];

      const voices = intervals.slice(0, MAX_VOICES);
      voices.forEach((interval, i) => {
        const pc = ((rootChromatic + interval) % PITCH_CLASS_COUNT + PITCH_CLASS_COUNT) % PITCH_CLASS_COUNT;
        const source = NOTE_SAMPLES[pc];
        const player = players[i];

        const fire = () => {
          try {
            player.replace(source);
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
