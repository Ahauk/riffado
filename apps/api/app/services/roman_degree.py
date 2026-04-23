"""Compute the Roman-numeral degree of a chord inside a given key.

Scope: diatonic triads in major and natural/harmonic minor. Non-diatonic chords
return None so the UI can decide how to render them (e.g. no label, or "?" tag).

The convention used for display:
    Major key:   I   ii  iii  IV  V   vi  vii°
    Minor key:   i   ii° III  iv  v   VI  VII    (natural)
                                       with V  as major (harmonic) allowed.

We match on (semitone distance from tonic, chord quality). The chord quality
is simplified to "maj" / "min" / "dim" — sevenths and sus are stripped.
"""
from __future__ import annotations

import re
from typing import Literal

NOTE_ORDER = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
FLAT_TO_SHARP = {
    "Bb": "A#", "Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#",
    "Cb": "B", "Fb": "E",
}

CHORD_RE = re.compile(r"^([A-G][#b]?)(.*)$")

KeyMode = Literal["major", "minor"]

# semitone distance from tonic -> (quality, roman numeral in display case)
MAJOR_DEGREE_TABLE = {
    0: ("maj", "I"),
    2: ("min", "ii"),
    4: ("min", "iii"),
    5: ("maj", "IV"),
    7: ("maj", "V"),
    9: ("min", "vi"),
    11: ("dim", "vii°"),
}

MINOR_DEGREE_TABLE = {
    0: ("min", "i"),
    2: ("dim", "ii°"),
    3: ("maj", "III"),
    5: ("min", "iv"),
    7: ("min", "v"),        # natural minor
    7.5: ("maj", "V"),      # harmonic minor sentinel; handled below
    8: ("maj", "VI"),
    10: ("maj", "VII"),
}


def _normalise_root(root: str) -> str:
    root = FLAT_TO_SHARP.get(root, root)
    return root if root in NOTE_ORDER else root


def _parse(chord_name: str) -> tuple[str, str]:
    m = CHORD_RE.match(chord_name.strip())
    if not m:
        return chord_name, ""
    return _normalise_root(m.group(1)), m.group(2)


def _simplify_quality(rest: str) -> str:
    """Collapse extensions to 'maj'/'min'/'dim'."""
    rest = rest.split("/")[0]
    if rest == "":
        return "maj"
    if rest == "m":
        return "min"
    if rest.startswith("dim"):
        return "dim"
    if rest.startswith("m") and not rest.startswith("maj"):
        return "min"
    # maj7, 7, add9, sus, aug → treat as major triad for degree matching
    return "maj"


def degree_of(chord_name: str, key_root: str, key_mode: KeyMode) -> str | None:
    """Return the Roman numeral label, or None if the chord is non-diatonic."""
    key_root = _normalise_root(key_root)
    if key_root not in NOTE_ORDER:
        return None

    root, rest = _parse(chord_name)
    quality = _simplify_quality(rest)

    root_idx = NOTE_ORDER.index(root)
    key_idx = NOTE_ORDER.index(key_root)
    semi = (root_idx - key_idx) % 12

    if key_mode == "major":
        match = MAJOR_DEGREE_TABLE.get(semi)
        if match and match[0] == quality:
            return match[1]
        return None

    # minor
    # Handle harmonic V (major V in minor) at semitone 7.
    if semi == 7 and quality == "maj":
        return "V"
    match = MINOR_DEGREE_TABLE.get(semi)
    if match and match[0] == quality:
        return match[1]
    return None


def progression_label(
    chord_names: list[str],
    key_root: str,
    key_mode: KeyMode,
) -> str:
    """Return a compact "i – VII – iv – v" string over unique consecutive degrees.

    Non-diatonic chords are rendered as "?".
    """
    degrees: list[str] = []
    for name in chord_names:
        d = degree_of(name, key_root, key_mode) or "?"
        if not degrees or degrees[-1] != d:
            degrees.append(d)
    return " – ".join(degrees)
