"""Guitar-friendly chord simplification + diagram shape id mapping."""
from __future__ import annotations

import re

SHARP_TO_FLAT = {"A#": "Bb", "C#": "Db", "D#": "Eb", "F#": "F#", "G#": "Ab"}

# Known shape ids we map to. These mirror the seed we'll load into chord_shapes.
OPEN_SHAPES = {
    "C": "c_open", "D": "d_open", "E": "e_open", "F": "f_barre_1",
    "G": "g_open", "A": "a_open", "B": "b_barre_2",
    "Am": "am_open", "Bm": "bm_barre_2", "Cm": "cm_barre_3",
    "Dm": "dm_open", "Em": "em_open", "Fm": "fm_barre_1",
    "Gm": "gm_barre_3",
    "C#": "c_sharp_barre_1", "D#": "d_sharp_barre_6", "F#": "f_sharp_barre_2",
    "G#": "g_sharp_barre_4", "A#": "a_sharp_barre_1",
    "C#m": "c_sharp_m_barre_4", "D#m": "d_sharp_m_barre_6",
    "F#m": "f_sharp_m_barre_2", "G#m": "g_sharp_m_barre_4",
    "A#m": "a_sharp_m_barre_1",
}

CHORD_RE = re.compile(r"^([A-G][#b]?)(.*)$")


def _parse(chord_name: str) -> tuple[str, str]:
    m = CHORD_RE.match(chord_name.strip())
    if not m:
        return chord_name, ""
    return m.group(1), m.group(2)


def simplify(chord_name: str) -> str:
    """Return a simpler chord name suitable for an intermediate guitarist.

    Rules:
    - Drop slash-bass ("G/B" -> "G").
    - Reduce 7/maj7/m7/add9/sus/dim/aug to their underlying triad.
    - Keep major/minor as-is.
    """
    root, rest = _parse(chord_name)
    # Drop inversions first.
    rest = rest.split("/")[0]

    if rest == "" or rest == "m":
        return root + rest

    if rest.startswith("m") and not rest.startswith("maj"):
        return root + "m"

    # Everything else (maj7, 7, sus4, sus2, add9, dim, aug, 6, 9, ...) collapses
    # to the natural major triad for playability.
    return root


def shape_id_for(simplified_name: str) -> str:
    return OPEN_SHAPES.get(simplified_name, "unknown")


def detected_parts(chord_name: str) -> tuple[str, str, str]:
    """Return (name, root, quality) for the AnalysisResult payload."""
    root, rest = _parse(chord_name)
    rest = rest.split("/")[0]
    if rest == "":
        quality = "maj"
    elif rest == "m":
        quality = "min"
    elif rest in ("7", "maj7", "m7", "dim", "aug", "sus4", "sus2"):
        quality = rest
    else:
        # Fallback to closest known quality.
        if rest.startswith("m") and not rest.startswith("maj"):
            quality = "min"
        else:
            quality = "maj"
    return chord_name, root, quality
