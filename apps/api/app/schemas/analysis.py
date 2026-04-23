from typing import Literal

from pydantic import BaseModel, Field

ChordQuality = Literal[
    "maj", "min", "7", "maj7", "m7", "dim", "aug", "sus4", "sus2"
]


class DetectedChord(BaseModel):
    name: str
    root: str
    quality: ChordQuality


class SimplifiedChord(BaseModel):
    name: str
    shape_id: str


class ChordSegment(BaseModel):
    idx: int
    start_sec: float
    end_sec: float
    detected: DetectedChord
    simplified: SimplifiedChord
    confidence: float = Field(ge=0.0, le=1.0)
    degree: str | None = None  # "I", "V", "vi", "VII", etc. None if non-diatonic.


class KeyInfo(BaseModel):
    root: str
    mode: Literal["major", "minor"]
    confidence: float = Field(ge=0.0, le=1.0)


class CapoSuggestion(BaseModel):
    fret: int = Field(ge=0, le=12)
    reason: str


class EngineMeta(BaseModel):
    engine: str
    processing_ms: int


class AnalysisResult(BaseModel):
    analysis_id: str
    status: Literal["processing", "completed", "failed"]
    audio_duration_sec: float
    key: KeyInfo
    bpm: float
    suggested_capo: CapoSuggestion
    overall_confidence: float = Field(ge=0.0, le=1.0)
    progression_roman: str | None = None  # e.g. "i – VII – iv – v"
    chords: list[ChordSegment]
    meta: EngineMeta
