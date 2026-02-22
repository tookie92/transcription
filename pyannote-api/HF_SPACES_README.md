# PyAnnote Speaker Diarization API
# Déployer sur HuggingFace Spaces (gratuit)

## Configuration

1. Créer un compte sur https://huggingface.co
2. Aller dans Spaces > Create new Space
3. Sélectionner:
   - **Owner**: Your account
   - **Space name**: pyannote-diarization
   - **SDK**: Docker
   - **Hardware**: CPU (free)
4. Clone la Space et ajoute ces fichiers

## Fichiers nécessaires:

### Dockerfile
```dockerfile
FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y ffmpeg

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 7860

CMD ["python", "main.py"]
```

### requirements.txt
```
fastapi>=0.109.0
uvicorn>=0.27.0
pyannote.audio>=3.1.0
torch>=2.0.0
huggingface-hub>=0.20.0
python-multipart>=0.0.6
pydub>=0.25.1
```

### main.py
```python
import os
import json
import tempfile
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

HF_TOKEN = os.getenv("HF_TOKEN")
pipeline = None

def get_pipeline():
    global pipeline
    if pipeline is None:
        from pyannote.audio import Pipeline
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=HF_TOKEN
        )
    return pipeline

def merge_diarization(diarization, segments, duration):
    result = []
    for segment in segments:
        start = segment.get("start", 0)
        end = segment.get("end", duration)
        text = segment.get("text", "")
        
        speakers = set()
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            if turn.start < end and turn.end > start:
                speakers.add(speaker)
        
        speaker_label = list(speakers)[0] if speakers else "SPEAKER_1"
        
        result.append({
            "start": start,
            "end": end,
            "text": text,
            "speaker": speaker_label
        })
    
    return result

@app.post("/diarize")
async def diarize(audio: UploadFile = File(...), segments: str = None):
    try:
        p = get_pipeline()
        
        audio_content = await audio.read()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_content)
            tmp_path = tmp.name
        
        diarization = p(tmp_path)
        duration = diarization.duration
        
        segments_data = json.loads(segments) if segments else []
        result = merge_diarization(diarization, segments_data, duration)
        
        os.unlink(tmp_path)
        
        return JSONResponse(content={
            "segments": result,
            "duration": duration,
            "speakers": list(set(s["speaker"] for s in result))
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
```

## Variables d'environnement

Dans les Settings de la Space, ajouter:
- `HF_TOKEN`: Ton token HF (créer dans Settings > Access Tokens)

## À faire sur HF

1. Accept les conditions:
   - https://huggingface.co/pyannote/speaker-diarization-3.1
   - https://huggingface.co/pyannote/segmentation-3.0

2. Déploie et utilise l'URL: `https://ton-nom-pyannote-diarization.hf.space/diarize`
