import logging
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import analyze, health
from app.services.chord_detection import detect_segments

logger = logging.getLogger("riffado")
logging.basicConfig(level=logging.INFO)


def _warmup() -> None:
    """Run the detector on a silent buffer so numba JIT pays its cost at boot,
    not on the user's first request."""
    import tempfile
    from pathlib import Path

    import soundfile as sf

    try:
        y = np.zeros(22050, dtype=np.float32)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            path = Path(tmp.name)
        sf.write(str(path), y, 22050)
        detect_segments(str(path))
        path.unlink(missing_ok=True)
        logger.info("Detector warmup complete")
    except Exception:
        logger.exception("Detector warmup failed (non-fatal)")


@asynccontextmanager
async def lifespan(_: FastAPI):
    _warmup()
    yield


app = FastAPI(title="Riffado API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/v1")
app.include_router(analyze.router, prefix="/v1")


@app.get("/")
def root() -> dict:
    return {"service": "riffado-api", "docs": "/docs"}
