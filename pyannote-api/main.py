"""
PyAnnote Speaker Diarization API
Deploy on Render.com for free
"""

import os
import json
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="PyAnnote Diarization API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pipeline loaded lazily
pipeline = None
HF_TOKEN = os.getenv("HF_TOKEN")

def get_pipeline():
    """Lazy load pipeline on first request"""
    global pipeline
    if pipeline is None:
        if not HF_TOKEN:
            raise HTTPException(status_code=503, detail="HF_TOKEN not set")
        
        from pyannote.audio import Pipeline
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-community-1",
            use_auth_token=HF_TOKEN
        )
        print("PyAnnote pipeline loaded successfully!")
    return pipeline

def merge_diarization_with_transcription(diarization, segments, duration):
    """Merge speaker diarization with Whisper segments"""
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
async def diarize_audio(
    audio: UploadFile = File(...),
    segments: str = None
):
    try:
        pipeline = get_pipeline()
        
        audio_content = await audio.read()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_content)
            tmp_path = tmp.name
        
        diarization = pipeline(tmp_path)
        duration = diarization.duration
        
        segments_data = json.loads(segments) if segments else []
        result = merge_diarization_with_transcription(diarization, segments_data, duration)
        
        os.unlink(tmp_path)
        
        return JSONResponse(content={
            "segments": result,
            "duration": duration,
            "speakers": list(set(s["speaker"] for s in result))
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok", "pipeline_ready": pipeline is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
