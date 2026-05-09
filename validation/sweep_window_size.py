"""Sweep `win_sec` (analysis window length) over a grid and report how the
detector's accuracy shifts.

Why this exists:
- Strumming songs put all chord tones inside every short window, so 1s works.
- Arpeggios spread chord tones across time — a 1s window may catch only the
  root + 5th, miss the 3rd, and pick the wrong chord. Larger windows aggregate
  more notes so the chroma is a more complete picture of the chord.
- BUT a larger window risks blending two consecutive chords in fast strumming
  songs. We need to measure the trade-off, not guess.

What this sweep DOES measure:
- exact / root match against ground_truth.csv per clip, per win_sec.
- Aggregates by category so we can see if `pop_rock_open` (mostly strumming)
  regresses while `tonalidades_raras` (Yesterday is here, the only clearly
  arpeggiated clip in the set) improves.

What it DOESN'T measure:
- Fingerpicking quality at scale. The current dataset only has 1 clearly
  arpeggiated clip (17_yesterday.wav). Anything we read for arpeggios here is
  anecdotal (n=1). Real-world validation has to happen on iPhone with backing
  tracks (Dust in the Wind, Blackbird, etc.) — see the doc this generates.

Use this to find a win_sec that EITHER improves Yesterday + leaves global ≤2pp
worse, OR shows there's no free lunch. If the latter, we punt to plan B
(weighting bass octaves) in a separate session.
"""
from pathlib import Path
import csv
import re
import time

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
SEVENTH_BIAS = 0.85
WIN_GRID = [1.0, 1.5, 2.0, 2.5, 3.0]


def build_templates():
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

        for suffix, third, seventh in [("maj7", 4, 11), ("7", 4, 10), ("m7", 3, 10)]:
            tpl = np.zeros(12)
            tpl[i] = 1.0
            tpl[(i + third) % 12] = 1.0
            tpl[(i + 7) % 12] = 1.0
            tpl[(i + seventh) % 12] = 1.0
            templates[root + suffix] = tpl / np.linalg.norm(tpl)
            biases[root + suffix] = SEVENTH_BIAS

    names = list(templates.keys())
    matrix = np.stack([templates[n] for n in names])
    bias_vec = np.array([biases[n] for n in names])
    return names, matrix, bias_vec


TEMPLATE_NAMES, TEMPLATE_MATRIX, BIAS_VECTOR = build_templates()


# Cache the *raw* chroma per clip (independent of win_sec) so we don't redo
# librosa.load + CQT for every window size.
_CHROMA_RAW_CACHE: dict[str, tuple[np.ndarray, np.ndarray]] = {}


def chroma_raw(audio_path: str) -> tuple[np.ndarray, np.ndarray]:
    if audio_path in _CHROMA_RAW_CACHE:
        return _CHROMA_RAW_CACHE[audio_path]
    y, sr = librosa.load(audio_path, sr=22050, mono=True)
    y = librosa.util.normalize(y)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=2048)
    times = librosa.frames_to_time(np.arange(chroma.shape[1]), sr=sr, hop_length=2048)
    _CHROMA_RAW_CACHE[audio_path] = (chroma, times)
    return chroma, times


def detect_chord_labels(audio_path: str, win_sec: float) -> list[str]:
    chroma, times = chroma_raw(audio_path)
    if chroma.shape[1] < 2:
        return []
    frame_dt = float(times[1] - times[0])
    frames_per_win = max(1, int(win_sec / frame_dt))

    labels: list[str] = []
    for start in range(0, chroma.shape[1], frames_per_win):
        end = min(start + frames_per_win, chroma.shape[1])
        win = chroma[:, start:end].mean(axis=1)
        n = np.linalg.norm(win)
        if n == 0:
            continue
        win = win / n
        scores = (TEMPLATE_MATRIX @ win) * BIAS_VECTOR
        labels.append(TEMPLATE_NAMES[int(np.argmax(scores))])
    return labels


FLAT_TO_SHARP = {"Bb": "A#", "Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#",
                 "Cb": "B", "Fb": "E"}


def normalize_chord(name: str) -> str:
    name = name.strip().replace(" ", "").split("/")[0]
    name = name.replace(":maj", "").replace(":min", "m")
    m = CHORD_RE.match(name)
    if not m:
        return name
    root, rest = m.group(1), m.group(2)
    root = FLAT_TO_SHARP.get(root, root)
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


def score(detected: list[str], expected: list[str]) -> tuple[float, float]:
    if not expected:
        return 0.0, 0.0
    det_set = set(detected)
    det_roots = {root_of(c) for c in detected}
    exp_norm = [normalize_chord(c) for c in expected]
    exact = sum(1 for c in exp_norm if c in det_set) / len(exp_norm)
    rt = sum(1 for c in exp_norm if root_of(c) in det_roots) / len(exp_norm)
    return exact, rt


def load_ground_truth():
    with open(GROUND_TRUTH, newline="") as f:
        return {row["filename"]: row for row in csv.DictReader(f)}


def main():
    gt = load_ground_truth()
    clips = [p for p in sorted(CLIPS_DIR.glob("*"))
             if p.suffix.lower() in {".wav", ".mp3", ".m4a", ".flac"}
             and p.name in gt]

    if not clips:
        print(f"No hay clips en {CLIPS_DIR}.")
        return

    print(f"Pre-cargando chroma de {len(clips)} clips...")
    t0 = time.time()
    for c in clips:
        chroma_raw(str(c))
    print(f"  listo en {time.time() - t0:.1f}s\n")

    per_clip_rows = []
    summary_rows = []

    for win_sec in WIN_GRID:
        clip_results = []
        for clip in clips:
            meta = gt[clip.name]
            expected = [c.strip() for c in meta["expected_chords"].split(",") if c.strip()]
            labels = detect_chord_labels(str(clip), win_sec)
            collapsed = collapse_consecutive(labels)
            ex, rt = score(collapsed, expected)
            clip_results.append({
                "win_sec": win_sec,
                "file": clip.name,
                "category": meta["category"],
                "exact": round(ex, 2),
                "root": round(rt, 2),
                "n_seg": len(collapsed),
                "detected": " ".join(collapsed[:12]),
            })
        per_clip_rows.extend(clip_results)

        df = pd.DataFrame(clip_results)
        by_cat = df.groupby("category").agg(
            n=("file", "count"),
            exact=("exact", "mean"),
            root=("root", "mean"),
        ).round(2)

        summary = {
            "win_sec": win_sec,
            "exact_global": round(df["exact"].mean(), 2),
            "root_global": round(df["root"].mean(), 2),
        }
        for cat in sorted(by_cat.index):
            summary[f"{cat}_exact"] = by_cat.loc[cat, "exact"]
            summary[f"{cat}_root"] = by_cat.loc[cat, "root"]
        # Yesterday (the one clearly arpeggiated clip) deserves its own column
        # since this whole sweep is motivated by arpeggios. n=1 → anecdotal.
        ye_row = next((r for r in clip_results if r["file"] == "17_yesterday.wav"), None)
        if ye_row:
            summary["yesterday_exact"] = ye_row["exact"]
            summary["yesterday_root"] = ye_row["root"]
        summary_rows.append(summary)

    print("=== Resumen por win_sec ===\n")
    print(tabulate(summary_rows, headers="keys", tablefmt="github"))
    print()

    # Per-clip detail: each row = clip, each column = win_sec exact match
    by_file: dict[str, dict] = {}
    for row in per_clip_rows:
        f = row["file"]
        if f not in by_file:
            by_file[f] = {"file": f, "category": row["category"]}
        by_file[f][f"w{row['win_sec']}_exact"] = f"{int(row['exact'] * 100)}%"
        by_file[f][f"w{row['win_sec']}_root"] = f"{int(row['root'] * 100)}%"

    detail_rows = list(by_file.values())
    print("=== Detalle por clip (exact/root por win_sec) ===\n")
    print(tabulate(detail_rows, headers="keys", tablefmt="github"))

    out_csv = RESULTS_DIR / "window_size_sweep.csv"
    with open(out_csv, "w", newline="") as f:
        if per_clip_rows:
            w = csv.DictWriter(f, fieldnames=list(per_clip_rows[0].keys()))
            w.writeheader()
            w.writerows(per_clip_rows)
    print(f"\nDetalle escrito a {out_csv.relative_to(Path(__file__).parent)}")


if __name__ == "__main__":
    main()
