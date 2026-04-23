"""Suggest a capo fret that maximises open-chord playability."""
from __future__ import annotations

from .chord_simplifier import _parse, simplify

NOTE_ORDER = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
OPEN_FRIENDLY = {
    "C", "G", "D", "A", "E",
    "Am", "Em", "Dm",
}


def _transpose_down(chord: str, semitones: int) -> str:
    root, rest = _parse(chord)
    if root not in NOTE_ORDER:
        return chord
    idx = NOTE_ORDER.index(root)
    return NOTE_ORDER[(idx - semitones) % 12] + rest


def _playability_score(chords: list[str]) -> float:
    if not chords:
        return 0.0
    hits = sum(1 for c in chords if simplify(c) in OPEN_FRIENDLY)
    return hits / len(chords)


def suggest_capo(chord_names: list[str]) -> tuple[int, str]:
    """Return (fret, human_reason)."""
    if not chord_names:
        return 0, "No detectamos acordes claros."

    best_fret = 0
    best_score = _playability_score(chord_names)

    for fret in range(1, 8):
        transposed = [_transpose_down(c, fret) for c in chord_names]
        score = _playability_score(transposed)
        if score > best_score + 0.15:
            best_score = score
            best_fret = fret

    if best_fret == 0:
        return 0, "Los acordes ya son cómodos sin capo."
    transposed = [_transpose_down(c, best_fret) for c in chord_names]
    playable = " ".join(dict.fromkeys(simplify(c) for c in transposed))
    return best_fret, f"Con capo {best_fret} tocas: {playable}"
