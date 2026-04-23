# Riffado API

FastAPI backend for Riffado. Currently serves a mock `/v1/analyze` so the mobile
app can exercise the full request/response flow before the real detector lands.

## Setup

```bash
cd apps/api
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run locally

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then: <http://localhost:8000/docs>

## Endpoints

- `GET /v1/health` — liveness.
- `POST /v1/analyze` — accepts multipart `audio`, returns mock `AnalysisResult`
  with ~1.2 s artificial latency.

## Next steps

- Swap `MOCK_CHORDS` for the librosa baseline from `validation/`.
- Persist analyses in Supabase (Postgres + Storage).
- Deploy to Fly.io.
