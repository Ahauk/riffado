import logging
import tempfile
import time
from pathlib import Path
from uuid import uuid4

import librosa
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.analysis import AnalysisResult
from app.services.capo_suggester import suggest_capo
from app.services.chord_detection import (
    detect_segments,
    filter_short,
    median_filter,
    merge_consecutive,
)
from app.services.chord_simplifier import (
    detected_parts,
    shape_id_for,
    simplify,
)
from app.services.key_estimation import estimate_key
from app.services.roman_degree import degree_of, progression_label

logger = logging.getLogger(__name__)
router = APIRouter(tags=["analyze"])


@router.post("/analyze", response_model=AnalysisResult)
async def analyze(audio: UploadFile = File(...)) -> AnalysisResult:
    t0 = time.time()

    suffix = Path(audio.filename or "clip.m4a").suffix or ".m4a"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp_path = Path(tmp.name)
        tmp.write(await audio.read())

    try:
        # Load once to pull duration + key from the same buffer as the detector.
        try:
            y, sr = librosa.load(str(tmp_path), sr=22050, mono=True)
        except Exception:
            logger.exception("Failed to load audio")
            raise HTTPException(status_code=415, detail="unreadable_audio")

        duration = float(len(y)) / sr if sr else 0.0
        if duration < 5.0:
            raise HTTPException(
                status_code=400,
                detail="too_short",
            )

        raw = detect_segments(str(tmp_path))
        smoothed = median_filter(raw)
        cleaned = filter_short(merge_consecutive(smoothed), min_dur=1.2)

        if not cleaned:
            raise HTTPException(
                status_code=422,
                detail="no_harmony",
            )

        key_root, key_mode, key_conf = estimate_key(y, sr)

        chord_names = [s.chord for s in cleaned]
        capo_fret, capo_reason = suggest_capo(chord_names)
        progression_roman = progression_label(chord_names, key_root, key_mode)

        segments_payload = []
        for idx, seg in enumerate(cleaned):
            name, root, quality = detected_parts(seg.chord)
            simp_name = simplify(seg.chord)
            segments_payload.append({
                "idx": idx,
                "start_sec": round(seg.start_sec, 2),
                "end_sec": round(seg.end_sec, 2),
                "detected": {"name": name, "root": root, "quality": quality},
                "simplified": {
                    "name": simp_name,
                    "shape_id": shape_id_for(simp_name),
                },
                "confidence": round(max(0.0, min(1.0, seg.confidence)), 2),
                "degree": degree_of(seg.chord, key_root, key_mode),
            })

        overall = (
            sum(s["confidence"] for s in segments_payload) / len(segments_payload)
        )

        return AnalysisResult.model_validate({
            "analysis_id": str(uuid4()),
            "status": "completed",
            "audio_duration_sec": round(duration, 2),
            "key": {"root": key_root, "mode": key_mode, "confidence": key_conf},
            "bpm": 0.0,  # BPM not wired yet; keep contract stable.
            "suggested_capo": {"fret": capo_fret, "reason": capo_reason},
            "overall_confidence": round(overall, 2),
            "progression_roman": progression_roman,
            "chords": segments_payload,
            "meta": {
                "engine": "librosa-templates@0.2",
                "processing_ms": int((time.time() - t0) * 1000),
            },
        })

    finally:
        try:
            tmp_path.unlink(missing_ok=True)
        except OSError:
            pass
