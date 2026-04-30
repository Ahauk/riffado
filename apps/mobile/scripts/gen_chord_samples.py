"""Generate 12 WAV samples (one per chromatic note, C3 - B3) using
Karplus-Strong synthesis — the classic algorithm for plucked-string
sounds. The output goes to apps/mobile/assets/samples/notes/.

Run from repo root with the validation venv (has numpy + soundfile):

    validation/.venv/bin/python apps/mobile/scripts/gen_chord_samples.py

Files are committed so the mobile bundle can `require()` them. Re-run
this script to tweak timbre — the WAVs are reproducible from this code.
"""
from pathlib import Path
import numpy as np
import soundfile as sf

OUT_DIR = Path(__file__).resolve().parents[1] / "assets" / "samples" / "notes"
OUT_DIR.mkdir(parents=True, exist_ok=True)

SAMPLE_RATE = 22050
DURATION_SEC = 1.6
DECAY = 0.998  # how fast the string dies; lower = duller pluck

# C3 reference frequency. Each subsequent semitone is freq * 2**(1/12).
NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
C3 = 130.8127826502993
FILE_NAMES = {
    "C": "C", "C#": "Csharp", "D": "D", "D#": "Dsharp", "E": "E",
    "F": "F", "F#": "Fsharp", "G": "G", "G#": "Gsharp", "A": "A",
    "A#": "Asharp", "B": "B",
}


def karplus_strong(freq: float, duration_sec: float, sample_rate: int, decay: float) -> np.ndarray:
    """Single plucked-string note via Karplus-Strong.

    The core idea: fill a circular buffer with random noise (the "pluck"),
    then on each output sample, emit buffer[i] and replace it with the
    average of itself and the next slot, scaled by `decay`. The averaging
    is a low-pass filter, so high frequencies die faster than low ones —
    exactly how a real string behaves.
    """
    period = int(round(sample_rate / freq))
    if period < 2:
        period = 2

    # Initial pluck: white noise softened by a tiny smoothing pass so the
    # attack doesn't sound too clicky.
    buffer = np.random.uniform(-0.5, 0.5, period).astype(np.float32)
    buffer = 0.5 * (buffer + np.roll(buffer, 1))

    n_samples = int(sample_rate * duration_sec)
    out = np.zeros(n_samples, dtype=np.float32)

    for i in range(n_samples):
        out[i] = buffer[i % period]
        next_idx = (i + 1) % period
        buffer[i % period] = decay * 0.5 * (buffer[i % period] + buffer[next_idx])

    return out


def shape_envelope(samples: np.ndarray, sample_rate: int) -> np.ndarray:
    """Apply a small attack ramp (5 ms) to remove the click at sample 0."""
    n_attack = max(1, int(0.005 * sample_rate))
    ramp = np.linspace(0.0, 1.0, n_attack, dtype=np.float32)
    out = samples.copy()
    out[:n_attack] *= ramp
    return out


def normalize(samples: np.ndarray, target_peak: float = 0.85) -> np.ndarray:
    peak = float(np.max(np.abs(samples)))
    if peak < 1e-6:
        return samples
    return (samples * (target_peak / peak)).astype(np.float32)


def main() -> None:
    print(f"Writing samples to {OUT_DIR.relative_to(Path.cwd())}")
    for i, name in enumerate(NOTE_NAMES):
        freq = C3 * (2 ** (i / 12))
        raw = karplus_strong(freq, DURATION_SEC, SAMPLE_RATE, DECAY)
        shaped = shape_envelope(raw, SAMPLE_RATE)
        final = normalize(shaped)

        out_path = OUT_DIR / f"note_{FILE_NAMES[name]}.wav"
        sf.write(out_path, final, SAMPLE_RATE, subtype="PCM_16")
        print(f"  {name:<3}  {freq:7.2f} Hz  ->  {out_path.name}  ({out_path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
