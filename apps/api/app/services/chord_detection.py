"""Baseline chord detector: librosa chroma + template matching.

Mirrors validation/run_validation.py so quality matches the 70% exact / 75%
root baseline we measured. When a stronger detector (Chordino, autochord, or
a CNN) becomes available, replace `detect_segments` keeping the same output
shape.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

import librosa
import numpy as np

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
FLAT_TO_SHARP = {
    "Bb": "A#", "Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#",
    "Cb": "B", "Fb": "E",
}
CHORD_RE = re.compile(r"^([A-G][#b]?)(.*)$")


def _build_templates() -> tuple[list[str], np.ndarray]:
    names: list[str] = []
    vectors: list[np.ndarray] = []
    for i, root in enumerate(NOTE_NAMES):
        maj = np.zeros(12)
        maj[i] = 1.0
        maj[(i + 4) % 12] = 1.0
        maj[(i + 7) % 12] = 1.0
        names.append(root)
        vectors.append(maj / np.linalg.norm(maj))

        minor = np.zeros(12)
        minor[i] = 1.0
        minor[(i + 3) % 12] = 1.0
        minor[(i + 7) % 12] = 1.0
        names.append(root + "m")
        vectors.append(minor / np.linalg.norm(minor))
    return names, np.stack(vectors)


_TEMPLATE_NAMES, _TEMPLATE_MATRIX = _build_templates()


@dataclass
class RawSegment:
    start_sec: float
    end_sec: float
    chord: str
    confidence: float


def _normalize_root(name: str) -> str:
    m = CHORD_RE.match(name)
    if not m:
        return name
    root, rest = m.group(1), m.group(2)
    return FLAT_TO_SHARP.get(root, root) + rest


def detect_segments(audio_path: str, win_sec: float = 1.0) -> list[RawSegment]:
    """Return chord segments covering the whole clip."""
    y, sr = librosa.load(audio_path, sr=22050, mono=True)
    if y.size == 0:
        return []
    y = librosa.util.normalize(y)

    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=2048)
    if chroma.shape[1] < 2:
        return []

    times = librosa.frames_to_time(
        np.arange(chroma.shape[1]), sr=sr, hop_length=2048
    )
    frame_dt = float(times[1] - times[0])
    frames_per_win = max(1, int(win_sec / frame_dt))

    out: list[RawSegment] = []
    for start in range(0, chroma.shape[1], frames_per_win):
        end = min(start + frames_per_win, chroma.shape[1])
        win = chroma[:, start:end].mean(axis=1)
        nrm = np.linalg.norm(win)
        if nrm == 0:
            continue
        win = win / nrm
        scores = _TEMPLATE_MATRIX @ win
        idx = int(np.argmax(scores))
        out.append(RawSegment(
            start_sec=float(times[start]),
            end_sec=float(times[end - 1]),
            chord=_TEMPLATE_NAMES[idx],
            confidence=float(scores[idx]),
        ))
    return out


def median_filter(segments: list[RawSegment], window: int = 3) -> list[RawSegment]:
    """Temporal smoothing: if a segment differs from both neighbours, adopt them.

    Example: [G, G, C, G, G] with window=3 collapses the stray C. Removes noise
    without blurring real chord changes (which span many consecutive frames).
    """
    if len(segments) < window:
        return segments
    out: list[RawSegment] = [segments[0]]
    for i in range(1, len(segments) - 1):
        prev, cur, nxt = segments[i - 1], segments[i], segments[i + 1]
        if cur.chord != prev.chord and cur.chord != nxt.chord and prev.chord == nxt.chord:
            # Replace the odd-one-out with the surrounding chord, low confidence.
            out.append(RawSegment(
                start_sec=cur.start_sec,
                end_sec=cur.end_sec,
                chord=prev.chord,
                confidence=min(prev.confidence, nxt.confidence) * 0.85,
            ))
        else:
            out.append(cur)
    out.append(segments[-1])
    return out


def merge_consecutive(segments: list[RawSegment]) -> list[RawSegment]:
    if not segments:
        return []
    out: list[RawSegment] = [segments[0]]
    for s in segments[1:]:
        last = out[-1]
        if s.chord == last.chord:
            out[-1] = RawSegment(
                start_sec=last.start_sec,
                end_sec=s.end_sec,
                chord=last.chord,
                confidence=max(last.confidence, s.confidence),
            )
        else:
            out.append(s)
    return out


def filter_short(segments: list[RawSegment], min_dur: float = 1.2) -> list[RawSegment]:
    """Absorb short-duration segments into their neighbour.

    Raises the floor so the UI shows chord changes that feel musical rather
    than reporting every window flicker.
    """
    if len(segments) < 2:
        return segments
    out: list[RawSegment] = []
    for s in segments:
        dur = s.end_sec - s.start_sec
        if dur < min_dur and out:
            prev = out[-1]
            out[-1] = RawSegment(
                start_sec=prev.start_sec,
                end_sec=s.end_sec,
                chord=prev.chord,
                confidence=max(prev.confidence, s.confidence),
            )
        else:
            out.append(s)
    return out
