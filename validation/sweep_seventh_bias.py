"""Sweep SEVENTH_BIAS over a range of values and report how the detector's
appetite for 7th chords changes against the validation set.

NOTE on what this does (and doesn't) measure:
- The current ground truth is all triads, and the scoring in run_validation.py
  collapses Cmaj7/Cm7/C7 down to C/Cm/C for normalize_chord(). So exact and
  root match are largely insensitive to SEVENTH_BIAS — the bias mostly affects
  WHICH chord-quality the detector picks per window, not whether the root is
  right.
- What this sweep DOES surface is the share of segments that the detector
  classifies as 7ths at each bias. That's the signal you want to balance:
  - Too low → 7ths never picked even when present (Em7 in Yesterday gets read
    as Em).
  - Too high → 7ths picked everywhere, including triadic pop/rock clips. The
    user-facing chord names get noisier ("Cmaj7" labels littered through
    a clean C-G-Am-F verse).
- Use this to find the bias that keeps 7th-density LOW on triadic categories
  (pop_rock_open, latin_simple) while still leaving room for real 7ths to
  surface. Then validate on real audio with iPhone — see SEVENTH_BIAS_PROTOCOL.md.
"""
from pathlib import Path
import csv
import time

import numpy as np
import librosa
from tabulate import tabulate

CLIPS_DIR = Path(__file__).parent / "clips"
GROUND_TRUTH = Path(__file__).parent / "ground_truth.csv"
RESULTS_DIR = Path(__file__).parent / "results"
RESULTS_DIR.mkdir(exist_ok=True)

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
BIAS_GRID = [0.82, 0.85, 0.88, 0.90, 0.92, 0.95]


def build_templates(seventh_bias: float):
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

        for suffix, third, seventh in [
            ("maj7", 4, 11),
            ("7", 4, 10),
            ("m7", 3, 10),
        ]:
            tpl = np.zeros(12)
            tpl[i] = 1.0
            tpl[(i + third) % 12] = 1.0
            tpl[(i + 7) % 12] = 1.0
            tpl[(i + seventh) % 12] = 1.0
            templates[root + suffix] = tpl / np.linalg.norm(tpl)
            biases[root + suffix] = seventh_bias

    names = list(templates.keys())
    matrix = np.stack([templates[n] for n in names])
    bias_vec = np.array([biases[n] for n in names])
    return names, matrix, bias_vec


# Cache the chroma per clip so we don't redo librosa.load+CQT at every bias.
_CHROMA_CACHE: dict[str, np.ndarray] = {}


def chroma_for(audio_path: str, win_sec: float = 1.0):
    if audio_path in _CHROMA_CACHE:
        return _CHROMA_CACHE[audio_path]
    y, sr = librosa.load(audio_path, sr=22050, mono=True)
    y = librosa.util.normalize(y)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=2048)
    times = librosa.frames_to_time(np.arange(chroma.shape[1]), sr=sr, hop_length=2048)
    frames_per_win = max(1, int(win_sec / (times[1] - times[0]))) if len(times) > 1 else 1

    win_chromas = []
    for start in range(0, chroma.shape[1], frames_per_win):
        end = min(start + frames_per_win, chroma.shape[1])
        win = chroma[:, start:end].mean(axis=1)
        n = np.linalg.norm(win)
        if n == 0:
            continue
        win_chromas.append(win / n)
    arr = np.stack(win_chromas) if win_chromas else np.zeros((0, 12))
    _CHROMA_CACHE[audio_path] = arr
    return arr


def detect_segments(audio_path: str, names, matrix, bias_vec):
    chromas = chroma_for(audio_path)
    if chromas.shape[0] == 0:
        return []
    scores = (chromas @ matrix.T) * bias_vec
    idxs = np.argmax(scores, axis=1)
    return [names[i] for i in idxs]


def is_seventh(name: str) -> bool:
    return name.endswith("7") or "maj7" in name


def collapse_consecutive(labels):
    out = []
    for c in labels:
        if not out or out[-1] != c:
            out.append(c)
    return out


def load_ground_truth():
    with open(GROUND_TRUTH, newline="") as f:
        return {row["filename"]: row for row in csv.DictReader(f)}


def main():
    gt = load_ground_truth()
    clips = [p for p in sorted(CLIPS_DIR.glob("*"))
             if p.suffix.lower() in {".wav", ".mp3", ".m4a", ".flac"}
             and p.name in gt]

    if not clips:
        print(f"No hay clips en {CLIPS_DIR}. Ejecuta download_clips.sh primero.")
        return

    print(f"Cargando chroma de {len(clips)} clips (una sola vez)...")
    t0 = time.time()
    for clip in clips:
        chroma_for(str(clip))
    print(f"  listo en {time.time() - t0:.1f}s\n")

    summary_rows = []
    per_clip_rows = []

    for bias in BIAS_GRID:
        names, matrix, bias_vec = build_templates(bias)

        total_segments = 0
        seventh_segments = 0
        clips_with_any_seventh = 0
        per_category: dict[str, dict] = {}

        for clip in clips:
            meta = gt[clip.name]
            cat = meta["category"]
            segs = detect_segments(str(clip), names, matrix, bias_vec)
            n_total = len(segs)
            n_7th = sum(1 for s in segs if is_seventh(s))
            total_segments += n_total
            seventh_segments += n_7th
            if n_7th > 0:
                clips_with_any_seventh += 1

            cat_acc = per_category.setdefault(cat, {"n_clips": 0, "n_seg": 0, "n_7th": 0})
            cat_acc["n_clips"] += 1
            cat_acc["n_seg"] += n_total
            cat_acc["n_7th"] += n_7th

            collapsed = collapse_consecutive(segs)
            per_clip_rows.append({
                "bias": bias,
                "file": clip.name,
                "category": cat,
                "n_seg": n_total,
                "pct_7th": round(100 * n_7th / max(1, n_total), 1),
                "detected": " ".join(collapsed[:14]),
            })

        summary_rows.append({
            "bias": bias,
            "n_clips": len(clips),
            "pct_seg_7th": round(100 * seventh_segments / max(1, total_segments), 1),
            "clips_with_7th": f"{clips_with_any_seventh}/{len(clips)}",
            **{
                f"{cat}_pct_7th": round(100 * acc["n_7th"] / max(1, acc["n_seg"]), 1)
                for cat, acc in sorted(per_category.items())
            },
        })

    print("=== Resumen por bias (% de segments clasificados como 7ma) ===\n")
    print(tabulate(summary_rows, headers="keys", tablefmt="github"))
    print()

    print("=== Detalle por clip y bias (pct_7th = % de ventanas que el detector marcó como 7ma) ===\n")
    by_file: dict[str, list] = {}
    for row in per_clip_rows:
        by_file.setdefault(row["file"], []).append(row)

    detail_rows = []
    for fname in sorted(by_file.keys()):
        rows = sorted(by_file[fname], key=lambda r: r["bias"])
        cat = rows[0]["category"]
        entry = {"file": fname, "category": cat, "n_seg": rows[0]["n_seg"]}
        for r in rows:
            entry[f"b{r['bias']}"] = f"{r['pct_7th']}%"
        detail_rows.append(entry)
    print(tabulate(detail_rows, headers="keys", tablefmt="github"))

    out_csv = RESULTS_DIR / "seventh_bias_sweep.csv"
    with open(out_csv, "w", newline="") as f:
        if per_clip_rows:
            w = csv.DictWriter(f, fieldnames=list(per_clip_rows[0].keys()))
            w.writeheader()
            w.writerows(per_clip_rows)
    print(f"\nDetalle escrito a {out_csv.relative_to(Path(__file__).parent)}")


if __name__ == "__main__":
    main()
