"""Key estimation — Krumhansl-Schmuckler + chord-aware scoring.

`estimate_key` uses chroma profile matching on the raw audio (K-S).
`estimate_key_from_chords` scores each candidate key by how many of the
*detected chord names* are diatonic to it — more robust than K-S when the
audio has overtones / distortion but few unique chords, because chord roots
are already a cleaned-up signal. K-S breaks ties between relative major/minor
(which share the same diatonic set).
"""
from __future__ import annotations

import re

import librosa
import numpy as np

# Krumhansl-Kessler probe tone profiles (major & minor).
MAJOR_PROFILE = np.array([
    6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
])
MINOR_PROFILE = np.array([
    6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
])

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
FLAT_TO_SHARP = {
    "Bb": "A#", "Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#",
    "Cb": "B", "Fb": "E",
}
CHORD_RE = re.compile(r"^([A-G][#b]?)(.*)$")

# (semitone_from_tonic, quality) pairs that are diatonic in each mode.
MAJOR_DIATONIC: set[tuple[int, str]] = {
    (0, "maj"), (2, "min"), (4, "min"), (5, "maj"),
    (7, "maj"), (9, "min"), (11, "dim"),
}
MINOR_DIATONIC: set[tuple[int, str]] = {
    (0, "min"), (2, "dim"), (3, "maj"), (5, "min"),
    (7, "min"), (8, "maj"), (10, "maj"),
}
# Harmonic-minor V (major V in a minor key) is also counted as a match.
HARMONIC_V = (7, "maj")


def _parse_chord(name: str) -> tuple[str, str] | None:
    m = CHORD_RE.match(name.strip())
    if not m:
        return None
    root = FLAT_TO_SHARP.get(m.group(1), m.group(1))
    if root not in NOTE_NAMES:
        return None
    return root, m.group(2)


def _triad_quality(rest: str) -> str:
    rest = rest.split("/")[0]
    if rest == "":
        return "maj"
    if rest == "m":
        return "min"
    if rest.startswith("dim"):
        return "dim"
    if rest.startswith("m") and not rest.startswith("maj"):
        return "min"
    return "maj"


def estimate_key(y: np.ndarray, sr: int) -> tuple[str, str, float]:
    """Return (root, mode, confidence) where confidence in [0,1]."""
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    mean = chroma.mean(axis=1)
    if np.linalg.norm(mean) == 0:
        return "C", "major", 0.0
    mean = mean / np.linalg.norm(mean)

    maj_n = MAJOR_PROFILE / np.linalg.norm(MAJOR_PROFILE)
    min_n = MINOR_PROFILE / np.linalg.norm(MINOR_PROFILE)

    scores: list[tuple[float, str, str]] = []
    for i in range(12):
        scores.append((float(np.dot(np.roll(maj_n, i), mean)), NOTE_NAMES[i], "major"))
        scores.append((float(np.dot(np.roll(min_n, i), mean)), NOTE_NAMES[i], "minor"))

    scores.sort(reverse=True)
    top_score, root, mode = scores[0]
    runner_up = scores[1][0]
    margin = max(0.0, min(1.0, (top_score - runner_up) * 5.0))
    return root, mode, round(0.5 + 0.5 * margin, 2)


def _chroma_score(y: np.ndarray, sr: int, tonic_idx: int, mode: str) -> float:
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    mean = chroma.mean(axis=1)
    norm = np.linalg.norm(mean)
    if norm == 0:
        return 0.0
    mean = mean / norm
    profile = MAJOR_PROFILE if mode == "major" else MINOR_PROFILE
    profile = profile / np.linalg.norm(profile)
    return float(np.dot(np.roll(profile, tonic_idx), mean))


def estimate_key_from_chords(
    chord_names: list[str],
    y: np.ndarray,
    sr: int,
) -> tuple[str, str, float]:
    """Pick the key whose diatonic set best matches the detected chords.

    Falls back to pure chroma K-S when there is too little chord variety to
    discriminate (0 or 1 unique chord — any key "matches" trivially).
    Ties between candidates with the same diatonic hit count are broken by
    chroma K-S against the audio (handles relative major vs minor).
    """
    parsed: list[tuple[int, str]] = []
    for name in chord_names:
        pc = _parse_chord(name)
        if pc is None:
            continue
        root, rest = pc
        parsed.append((NOTE_NAMES.index(root), _triad_quality(rest)))

    unique = set(parsed)
    if len(unique) < 2:
        return estimate_key(y, sr)

    # Score every candidate key by diatonic-hit count over unique chords.
    scored: list[tuple[int, int, str]] = []
    for tonic in range(12):
        maj_hits = sum(
            1 for (r, q) in unique
            if ((r - tonic) % 12, q) in MAJOR_DIATONIC
        )
        min_hits = sum(
            1 for (r, q) in unique
            if ((r - tonic) % 12, q) in MINOR_DIATONIC
            or ((r - tonic) % 12, q) == HARMONIC_V
        )
        scored.append((maj_hits, tonic, "major"))
        scored.append((min_hits, tonic, "minor"))

    scored.sort(key=lambda s: s[0], reverse=True)
    top_hits = scored[0][0]
    tied = [s for s in scored if s[0] == top_hits]

    if len(tied) == 1:
        _, tonic, mode = tied[0]
    else:
        # Ties (incl. relative major/minor which share the diatonic set) get
        # layered tiebreakers:
        #   1) tonic is the first chord's root — pop/rock often start on tonic
        #   2) tonic appears anywhere in the progression
        #   3) chroma K-S against the audio
        roots_in_progression = {r for (r, _q) in unique}
        first_root = parsed[0][0] if parsed else None

        def tiebreak_key(cand: tuple[int, int, str]) -> tuple[int, int, float]:
            _, tonic_idx, mode_ = cand
            tonic_is_first = 1 if tonic_idx == first_root else 0
            tonic_in_prog = 1 if tonic_idx in roots_in_progression else 0
            chroma = _chroma_score(y, sr, tonic_idx, mode_)
            return (tonic_is_first, tonic_in_prog, chroma)

        best = max(tied, key=tiebreak_key)
        _, tonic, mode = best

    confidence = round(0.5 + 0.5 * (top_hits / len(unique)), 2)
    return NOTE_NAMES[tonic], mode, confidence
