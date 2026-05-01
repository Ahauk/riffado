"""Generate 12 WAV samples (one per chromatic note, C4 - B4) using
additive synthesis with per-partial exponential decay — the simplest
recipe that captures what makes a piano sound like a piano (and not
like a baseball-stadium organ): higher harmonics die faster than the
fundamental, and the whole note decays naturally instead of holding
flat at a sustain level.

Output goes to apps/mobile/assets/samples/notes/. Run from repo root
with the validation venv (numpy + soundfile):

    validation/.venv/bin/python apps/mobile/scripts/gen_chord_samples.py
"""
from pathlib import Path
import numpy as np
import soundfile as sf

OUT_DIR = Path(__file__).resolve().parents[1] / "assets" / "samples" / "notes"
OUT_DIR.mkdir(parents=True, exist_ok=True)

SAMPLE_RATE = 22050
DURATION_SEC = 1.5

# Each entry: (freq_multiplier, amplitude, decay_rate_per_sec). Higher
# partials decay faster, which is the single biggest difference between
# "piano" and "organ" timbres. Slight detuning on partials 5+ adds the
# subtle inharmonicity real piano strings have. Decay rates were tuned
# so the residual tail of one arpeggio note doesn't muddy the next.
HARMONICS = [
    (1.000, 1.00, 1.7),
    (2.000, 0.42, 2.9),
    (3.000, 0.20, 4.2),
    (4.005, 0.11, 5.6),
    (5.012, 0.06, 7.2),
    (6.020, 0.03, 8.6),
]

ATTACK_SEC = 0.006

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
# C4 is the canonical "middle C". Each subsequent semitone is freq * 2**(1/12).
C4 = 261.6255653005986
FILE_NAMES = {
    "C": "C", "C#": "Csharp", "D": "D", "D#": "Dsharp", "E": "E",
    "F": "F", "F#": "Fsharp", "G": "G", "G#": "Gsharp", "A": "A",
    "A#": "Asharp", "B": "B",
}


def synth_note(freq: float, duration_sec: float, sample_rate: int) -> np.ndarray:
    n = int(sample_rate * duration_sec)
    t = np.linspace(0.0, duration_sec, n, endpoint=False, dtype=np.float32)

    wave = np.zeros(n, dtype=np.float32)
    for mult, amp, decay_rate in HARMONICS:
        partial = amp * np.sin(2.0 * np.pi * freq * mult * t).astype(np.float32)
        partial *= np.exp(-decay_rate * t).astype(np.float32)
        wave += partial

    # Soft attack ramp so the very first sample doesn't click.
    attack = max(1, int(ATTACK_SEC * sample_rate))
    wave[:attack] *= np.linspace(0.0, 1.0, attack, dtype=np.float32)

    return wave.astype(np.float32)


def normalize(samples: np.ndarray, target_peak: float = 0.85) -> np.ndarray:
    peak = float(np.max(np.abs(samples)))
    if peak < 1e-6:
        return samples
    return (samples * (target_peak / peak)).astype(np.float32)


def main() -> None:
    print(f"Writing samples to {OUT_DIR.relative_to(Path.cwd())}")
    for i, name in enumerate(NOTE_NAMES):
        freq = C4 * (2 ** (i / 12))
        raw = synth_note(freq, DURATION_SEC, SAMPLE_RATE)
        final = normalize(raw)

        out_path = OUT_DIR / f"note_{FILE_NAMES[name]}.wav"
        sf.write(out_path, final, SAMPLE_RATE, subtype="PCM_16")
        print(
            f"  {name:<3}  {freq:7.2f} Hz  ->  {out_path.name}"
            f"  ({out_path.stat().st_size // 1024} KB)"
        )


if __name__ == "__main__":
    main()
