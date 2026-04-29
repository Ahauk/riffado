import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ChordDiagramSvg } from "../../chords/components/ChordDiagramSvg";
import { findShape } from "../../chords/data/chordShapes";
import { BRAND_FONT, colors, radius, spacing, typography } from "../../../theme/tokens";
import { AnalysisResult, ChordSegment } from "../../../types/api";

interface DisplayChord {
  name: string;
  shape_id: string;
}

function displayOf(chord: ChordSegment): DisplayChord {
  if (chord.user_correction) {
    return {
      name: chord.user_correction.simplified.name,
      shape_id: chord.user_correction.simplified.shape_id,
    };
  }
  return {
    name: chord.simplified.name,
    shape_id: chord.simplified.shape_id,
  };
}

interface ShareableCardProps {
  analysis: AnalysisResult;
  progressionLabel: string;
  customTitle?: string;
}

const CARD_WIDTH = 360;
const CARD_HEIGHT = 450;
const MAX_DIAGRAMS = 8;
const DIAGRAM_SIZE = { width: 64, height: 82 };

/**
 * Off-screen layout used to render a 4:5 PNG that the user can share. Sized
 * in design points (360×450); on a retina device the captured PNG comes out
 * at ~1080×1350, which fits Instagram feed/Stories and WhatsApp nicely.
 */
export const ShareableCard = forwardRef<View, ShareableCardProps>(function ShareableCard(
  { analysis, progressionLabel, customTitle },
  ref,
) {
  const modeLabel = analysis.key.mode === "major" ? "mayor" : "menor";
  const keyLabel = `${analysis.key.root} ${modeLabel}`;
  const displayedTitle = customTitle?.trim() || keyLabel;
  const showSubtitle = Boolean(customTitle?.trim());
  const capoLabel =
    analysis.suggested_capo.fret > 0
      ? `Capo ${analysis.suggested_capo.fret}`
      : "Sin capo";
  const bpmLabel = analysis.bpm > 0 ? `${Math.round(analysis.bpm)} BPM` : null;

  const seenNames = new Set<string>();
  const uniqueDisplays: DisplayChord[] = [];
  for (const chord of analysis.chords) {
    const d = displayOf(chord);
    if (seenNames.has(d.name)) continue;
    seenNames.add(d.name);
    uniqueDisplays.push(d);
  }
  const visibleDiagrams = uniqueDisplays.slice(0, MAX_DIAGRAMS);
  const hiddenCount = Math.max(uniqueDisplays.length - MAX_DIAGRAMS, 0);

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.headerBlock}>
        <Text style={styles.brand}>RIFFADO</Text>
        <Text style={styles.title} numberOfLines={2}>
          {displayedTitle}
        </Text>
        {showSubtitle && <Text style={styles.subtitle}>{keyLabel}</Text>}
        <View style={styles.metaRow}>
          <Text style={styles.metaPill}>{keyLabel}</Text>
          {bpmLabel && <Text style={styles.metaPill}>{bpmLabel}</Text>}
          <Text style={styles.metaPill}>{capoLabel}</Text>
        </View>
        {progressionLabel.length > 0 && (
          <Text style={styles.progression} numberOfLines={1}>
            {progressionLabel}
          </Text>
        )}
      </View>

      <View style={styles.diagramGrid}>
        {visibleDiagrams.map((d) => {
          const shape = findShape(d.shape_id) ?? findShape(d.name);
          return (
            <View key={d.name} style={styles.diagramCell}>
              {shape ? (
                <ChordDiagramSvg shape={shape} variant="mini" size={DIAGRAM_SIZE} />
              ) : (
                <View style={[styles.diagramFallback, DIAGRAM_SIZE]} />
              )}
              <Text style={styles.diagramName}>{d.name}</Text>
            </View>
          );
        })}
        {hiddenCount > 0 && (
          <View style={styles.diagramCell}>
            <View style={[styles.diagramFallback, DIAGRAM_SIZE]}>
              <Text style={styles.moreLabel}>+{hiddenCount}</Text>
            </View>
            <Text style={styles.diagramName}>más</Text>
          </View>
        )}
      </View>

      <Text style={styles.footer}>Riffado · detector de acordes</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    justifyContent: "space-between",
  },
  headerBlock: { gap: 6 },
  brand: {
    fontFamily: BRAND_FONT,
    fontSize: 36,
    color: colors.text,
    letterSpacing: 4,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  title: { ...typography.h2, color: colors.text, marginTop: spacing.xs },
  subtitle: { ...typography.caption, color: colors.textMuted, fontWeight: "600" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs },
  metaPill: {
    ...typography.caption,
    color: colors.primarySoft,
    fontWeight: "700",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
    overflow: "hidden",
  },
  progression: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primarySoft,
    marginTop: spacing.sm,
    letterSpacing: 1,
  },
  diagramGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  diagramCell: {
    width: (CARD_WIDTH - spacing.lg * 2 - spacing.sm * 3) / 4,
    alignItems: "center",
    gap: 4,
  },
  diagramFallback: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  diagramName: { ...typography.caption, color: colors.text, fontWeight: "700" },
  moreLabel: { ...typography.body, color: colors.text, fontWeight: "700" },
  footer: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    letterSpacing: 1,
  },
});
