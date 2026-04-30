"""Run a baseline chord detector (librosa chroma + template matching) on 20 clips
and score against ground_truth.csv.

This is a minimal DSP baseline. If it gives useful signal, more sophisticated
detectors (autochord / Chordino / CNN) would only improve on it. If even this
gives no signal, we need to rethink the approach.
"""
from pathlib import Path
import re
import time
import csv

import numpy as np
import librosa
import pandas as pd
from tabulate import tabulate

CLIPS_DIR = Path(__file__).parent / "clips"
GROUND_TRUTH = Path(__file__).parent / "ground_truth.csv"
RESULTS_DIR = Path(__file__).parent / "results"
RESULTS_DIR.mkdir(exist_ok=True)

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
CHORD_RE = re.compile(r"^([A-G][#b]?)(.*)$")


# Keep in sync with apps/api/app/services/chord_detection.py — same 60
# templates + bias. Lowering the 7th bias favours triads; raising it
# surfaces more 7ths. Tuned against this same validation set.
SEVENTH_BIAS = 0.85


def build_templates():
    """60 chord templates: 12 maj + 12 min + 12 maj7 + 12 dom7 + 12 min7."""
    templates = {}
    biases = {}
    for i, root in enumerate(NOTE_NAMES):
        maj = np.zeros(12)
        maj[i] = 1.0
        maj[(i + 4) % 12] = 1.0
        maj[(i + 7) % 12] = 1.0
        templates[root] = maj / np.linalg.norm(maj)
        biases[root] = 1.0

        minor = np.zeros(12)
        minor[i] = 1.0
        minor[(i + 3) % 12] = 1.0
        minor[(i + 7) % 12] = 1.0
        templates[root + "m"] = minor / np.linalg.norm(minor)
        biases[root + "m"] = 1.0

        maj7 = np.zeros(12)
        maj7[i] = 1.0
        maj7[(i + 4) % 12] = 1.0
        maj7[(i + 7) % 12] = 1.0
        maj7[(i + 11) % 12] = 1.0
        templates[root + "maj7"] = maj7 / np.linalg.norm(maj7)
        biases[root + "maj7"] = SEVENTH_BIAS

        dom7 = np.zeros(12)
        dom7[i] = 1.0
        dom7[(i + 4) % 12] = 1.0
        dom7[(i + 7) % 12] = 1.0
        dom7[(i + 10) % 12] = 1.0
        templates[root + "7"] = dom7 / np.linalg.norm(dom7)
        biases[root + "7"] = SEVENTH_BIAS

        min7 = np.zeros(12)
        min7[i] = 1.0
        min7[(i + 3) % 12] = 1.0
        min7[(i + 7) % 12] = 1.0
        min7[(i + 10) % 12] = 1.0
        templates[root + "m7"] = min7 / np.linalg.norm(min7)
        biases[root + "m7"] = SEVENTH_BIAS

    return templates, biases


TEMPLATES, TEMPLATE_BIASES = build_templates()
TEMPLATE_NAMES = list(TEMPLATES.keys())
TEMPLATE_MATRIX = np.stack([TEMPLATES[n] for n in TEMPLATE_NAMES])  # (60, 12)
BIAS_VECTOR = np.array([TEMPLATE_BIASES[n] for n in TEMPLATE_NAMES])  # (60,)


def detect_chords(audio_path: str, win_sec: float = 1.0):
    """Return a sequence of (start, end, chord) over the clip."""
    y, sr = librosa.load(audio_path, sr=22050, mono=True)
    y = librosa.util.normalize(y)

    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=2048)
    times = librosa.frames_to_time(np.arange(chroma.shape[1]), sr=sr, hop_length=2048)

    frames_per_win = max(1, int(win_sec / (times[1] - times[0]))) if len(times) > 1 else 1

    segments = []
    for start in range(0, chroma.shape[1], frames_per_win):
        end = min(start + frames_per_win, chroma.shape[1])
        win_chroma = chroma[:, start:end].mean(axis=1)
        if np.linalg.norm(win_chroma) == 0:
            continue
        win_chroma = win_chroma / np.linalg.norm(win_chroma)
        scores = (TEMPLATE_MATRIX @ win_chroma) * BIAS_VECTOR
        idx = int(np.argmax(scores))
        segments.append((float(times[start]),
                         float(times[end - 1]),
                         TEMPLATE_NAMES[idx],
                         float(scores[idx])))
    return segments


FLAT_TO_SHARP = {"Bb": "A#", "Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#",
                 "Cb": "B", "Fb": "E"}


def normalize_chord(name: str) -> str:
    name = name.strip().replace(" ", "")
    name = name.replace(":maj", "").replace(":min", "m")
    name = name.split("/")[0]
    m = CHORD_RE.match(name)
    if not m:
        return name
    root, rest = m.group(1), m.group(2)
    root = FLAT_TO_SHARP.get(root, root)  # Ab -> G#, etc.
    if rest.startswith("m") and not rest.startswith("maj"):
        return root + "m"
    return root


def root_of(name: str) -> str:
    m = CHORD_RE.match(normalize_chord(name))
    return m.group(1) if m else name


def collapse_consecutive(labels):
    out = []
    for c in labels:
        norm = normalize_chord(c)
        if not out or out[-1] != norm:
            out.append(norm)
    return out


def score(detected, expected):
    if not expected:
        return 0.0, 0.0
    det_set = set(detected)
    det_roots = {root_of(c) for c in detected}
    exp_norm = [normalize_chord(c) for c in expected]
    exact = sum(1 for c in exp_norm if c in det_set) / len(exp_norm)
    r = sum(1 for c in exp_norm if root_of(c) in det_roots) / len(exp_norm)
    return exact, r


def load_ground_truth():
    with open(GROUND_TRUTH, newline="") as f:
        return {row["filename"]: row for row in csv.DictReader(f)}


def main():
    gt = load_ground_truth()
    rows = []

    clips = [p for p in sorted(CLIPS_DIR.glob("*"))
             if p.suffix.lower() in {".wav", ".mp3", ".m4a", ".flac"}]

    if not clips:
        print(f"No hay clips en {CLIPS_DIR}. Ejecuta download_clips.sh primero.")
        return

    for clip in clips:
        if clip.name not in gt:
            print(f"[skip] {clip.name}: sin ground truth")
            continue

        meta = gt[clip.name]
        expected = [c.strip() for c in meta["expected_chords"].split(",") if c.strip()]

        t0 = time.time()
        try:
            segs = detect_chords(str(clip))
            detected = collapse_consecutive([s[2] for s in segs])
            err = ""
        except Exception as e:
            detected = []
            err = str(e)[:60]

        dt = time.time() - t0
        ex, rt = score(detected, expected)
        rows.append({
            "file": clip.name,
            "category": meta["category"],
            "expected": " ".join(expected),
            "detected": " ".join(detected[:12]) if detected else f"ERR: {err}",
            "exact": round(ex, 2),
            "root": round(rt, 2),
            "time_s": round(dt, 2),
        })

    df = pd.DataFrame(rows)
    df.to_csv(RESULTS_DIR / "detections.csv", index=False)

    print(tabulate(df, headers="keys", tablefmt="github", showindex=False))
    print()
    print(f"Clips procesados:     {len(df)}")
    print(f"Exact match promedio: {df['exact'].mean():.0%}")
    print(f"Root match promedio:  {df['root'].mean():.0%}")
    print(f"Latencia promedio:    {df['time_s'].mean():.2f}s")
    print()
    print("Por categoría:")
    by_cat = df.groupby("category").agg(
        n=("file", "count"),
        exact=("exact", "mean"),
        root=("root", "mean"),
        t=("time_s", "mean"),
    ).round(2)
    print(tabulate(by_cat, headers="keys", tablefmt="github"))


if __name__ == "__main__":
    main()
