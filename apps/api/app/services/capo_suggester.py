"""Suggest a capo fret only when it really unlocks a significantly easier
position. Defaults to capo 0 so we respect the song's natural tuning.
"""
from __future__ import annotations

from .chord_simplifier import _parse, simplify

NOTE_ORDER = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Chords that an intermediate guitarist plays without a barre.
EASY_OPEN = {"C", "G", "D", "A", "E", "Am", "Em", "Dm"}

# Chords that almost always force a barre.
HARD_BARRE = {
    "F", "Fm", "B", "Bm", "F#", "F#m", "C#", "C#m", "G#", "G#m",
    "D#", "D#m", "A#", "A#m", "Bb", "Bbm", "Eb", "Ebm", "Ab", "Abm",
    "Db", "Dbm", "Gb", "Gbm",
}

# Minimum improvement (share of chords becoming open-friendly) before we
# recommend a capo at all. 0.35 ≈ "at least a third of the progression gets
# materially easier".
IMPROVEMENT_THRESHOLD = 0.35


def _transpose_down(chord: str, semitones: int) -> str:
    root, rest = _parse(chord)
    if root not in NOTE_ORDER:
        return chord
    idx = NOTE_ORDER.index(root)
    return NOTE_ORDER[(idx - semitones) % 12] + rest


def _playability_score(chords: list[str]) -> float:
    """Net score: +1 for open-friendly chord, -1 for hard-barre chord."""
    if not chords:
        return 0.0
    score = 0.0
    for c in chords:
        simp = simplify(c)
        if simp in EASY_OPEN:
            score += 1.0
        elif simp in HARD_BARRE:
            score -= 1.0
    return score / len(chords)


def suggest_capo(chord_names: list[str]) -> tuple[int, str]:
    """Return (fret, human reason). fret=0 means "play it as-is, no capo".

    Strategy:
    - If no chord is hard-barre, keep capo 0.
    - Otherwise search 1-7 frets and only move if we gain ≥ threshold.
    """
    if not chord_names:
        return 0, "No detectamos acordes claros."

    has_hard = any(simplify(c) in HARD_BARRE for c in chord_names)
    baseline = _playability_score(chord_names)

    if not has_hard:
        return 0, "La tonalidad original ya es cómoda para tocar sin capo."

    best_fret = 0
    best_score = baseline
    for fret in range(1, 8):
        transposed = [_transpose_down(c, fret) for c in chord_names]
        score = _playability_score(transposed)
        if score - baseline >= IMPROVEMENT_THRESHOLD and score > best_score:
            best_score = score
            best_fret = fret

    if best_fret == 0:
        return 0, "Se puede tocar sin capo, aunque requiere acordes con barré."

    transposed = [_transpose_down(c, best_fret) for c in chord_names]
    simplified_unique = list(dict.fromkeys(simplify(c) for c in transposed))
    playable = " ".join(simplified_unique)
    return best_fret, f"Con capo {best_fret} tocas: {playable}"
