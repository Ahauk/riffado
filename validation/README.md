# Validación de autochord

Objetivo: medir si `autochord` detecta acordes lo bastante bien como para ser la base del motor de Riffado.

## Prerequisitos (instalados por el setup)

- Python 3.11 (`brew install python@3.11`)
- ffmpeg (`brew install ffmpeg`)
- yt-dlp (`brew install yt-dlp`)

## Uso

```bash
cd validation
bash download_clips.sh              # descarga 20 clips de 15s desde YouTube
python3.11 -m venv .venv            # una sola vez
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python run_validation.py
```

Resultados: tabla en terminal + `results/detections.csv`.

## Interpretar

- `exact` >= 0.70 promedio → autochord sirve, arrancamos MVP.
- 0.50 a 0.70 → sirve pero la UX de edición debe ser parte del flujo principal.
- < 0.50 → replantear motor (chord-extractor o librosa + templates).

## Si autochord no instala

tensorflow en Apple Silicon puede dar problemas. Plan B: baseline con librosa + template matching, sin tensorflow.
