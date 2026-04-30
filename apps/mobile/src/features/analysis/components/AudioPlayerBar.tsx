import Slider from "@react-native-community/slider";
import { AudioPlayer, AudioStatus, setAudioModeAsync } from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { colors, radius, spacing, typography } from "../../../theme/tokens";

const ICON_SIZE = 16;

/** Filled triangle pointing right. Drawn as SVG so it renders identically on
 *  every device — the unicode play/pause glyphs get coloured emoji treatment
 *  on iOS, which clashes with our flat purple button. */
function PlayIcon() {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 16 16">
      <Path d="M4 3 L13 8 L4 13 Z" fill={colors.text} />
    </Svg>
  );
}

/** Two vertical rounded bars — flat pause icon. */
function PauseIcon() {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 16 16">
      <Rect x={4} y={3} width={3} height={10} rx={1} fill={colors.text} />
      <Rect x={9} y={3} width={3} height={10} rx={1} fill={colors.text} />
    </Svg>
  );
}

interface AudioPlayerBarProps {
  player: AudioPlayer;
  status: AudioStatus;
}

function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Compact playback bar for a persisted analysis fragment. Renders a play/pause
 * toggle, a draggable scrub bar, and current/total timestamps in mm:ss.
 *
 * Now controlled: player + status are owned by the parent screen so the
 * progress can also drive other UI (e.g. highlighting the active chord row
 * in Results). The bar still owns the local scrub state because dragging is
 * a UI concern that shouldn't bubble up.
 */
export function AudioPlayerBar({ player, status }: AudioPlayerBarProps) {
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const seekDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Make sure playback isn't routed through the earpiece and works in silent
  // mode. Recording flow leaves allowsRecording=true which on iOS keeps the
  // route on the receiver (very quiet); flipping it back here is enough.
  useEffect(() => {
    void setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    }).catch(() => {});
  }, []);

  // Auto-rewind to 0 when playback finishes so the next tap on play starts
  // the fragment from the beginning instead of replaying the last frame.
  useEffect(() => {
    if (status.didJustFinish) {
      void player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  const duration = status.duration > 0 ? status.duration : 0;
  const displayedTime =
    scrubValue ?? Math.min(status.currentTime ?? 0, duration);

  const togglePlay = () => {
    if (status.playing) {
      player.pause();
    } else {
      // If we hit the end, seek to 0 first so play() actually starts.
      if (duration > 0 && status.currentTime >= duration - 0.05) {
        void player.seekTo(0);
      }
      player.play();
    }
  };

  const onSlidingStart = (value: number) => {
    setScrubValue(value);
  };

  const onValueChange = (value: number) => {
    setScrubValue(value);
    // Light debounce: skim the audio while dragging so the user hears where
    // they are, but don't fire seekTo every frame (it can stutter on iOS).
    if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
    seekDebounceRef.current = setTimeout(() => {
      void player.seekTo(value);
    }, 60);
  };

  const onSlidingComplete = (value: number) => {
    if (seekDebounceRef.current) {
      clearTimeout(seekDebounceRef.current);
      seekDebounceRef.current = null;
    }
    void player.seekTo(value);
    setScrubValue(null);
  };

  const ready = status.isLoaded && duration > 0;

  return (
    <View style={styles.bar} accessibilityLabel="Reproductor del fragmento">
      <Pressable
        onPress={togglePlay}
        disabled={!ready}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? "Pausar" : "Reproducir"}
        style={({ pressed }) => [
          styles.playBtn,
          !ready && styles.playBtnDisabled,
          pressed && styles.playBtnPressed,
        ]}
        hitSlop={8}
      >
        {status.playing ? <PauseIcon /> : <PlayIcon />}
      </Pressable>

      <View style={styles.scrubCol}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={Math.max(duration, 0.01)}
          value={displayedTime}
          onSlidingStart={onSlidingStart}
          onValueChange={onValueChange}
          onSlidingComplete={onSlidingComplete}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
          disabled={!ready}
        />
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatClock(displayedTime)}</Text>
          <Text style={styles.time}>{formatClock(duration)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  playBtnDisabled: { opacity: 0.4 },
  playBtnPressed: { opacity: 0.8 },
  scrubCol: { flex: 1, justifyContent: "center" },
  slider: { width: "100%", height: 28 },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },
  time: { ...typography.caption, color: colors.textMuted, fontVariant: ["tabular-nums"] },
});
