"""Krumhansl-Schmuckler key profile matching over chroma."""
from __future__ import annotations

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
    # Confidence as margin over the runner-up, clamped to [0, 1].
    margin = max(0.0, min(1.0, (top_score - runner_up) * 5.0))
    return root, mode, round(0.5 + 0.5 * margin, 2)
