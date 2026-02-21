"""
PyAnnote Speaker Diarization API
Deploy on Render.com for free
"""

import os
import io
import base64
import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import torch
from pyannote.audio import Pipeline

app = FastAPI(title="PyAnnote Diarization API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize pipeline globally (reuse for efficiency)
pipeline = None
HF_TOKEN = os.getenv("HF_TOKEN")

@app.on_event("startup")
async def load_pipeline():
    global pipeline
    if HF_TOKEN:
        try:
            pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-community-1",
                use_auth_token=HF_TOKEN
            )
            print("PyAnnote pipeline loaded successfully!")
        except Exception as e:
            print(f"Error loading pipeline: {e}")
            pipeline = None
    else:
        print("HF_TOKEN not set - Diarization will not work")

def merge_diarization_with_transcription(diarization, segments, duration):
    """
    Merge speaker diarization with Whisper segments
    Returns segments with speaker labels
    """
    result = []
    
    for segment in segments:
        start = segment.get("start", 0)
        end = segment.get("end", duration)
        text = segment.get("text", "")
        
        # Find speakers in this time range
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
    segments: str = None  # JSON string of Whisper segments
):
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Pipeline not loaded. Set HF_TOKEN.")
    
    try:
        # Read audio file
        audio_content = await audio.read()
        
        # Save to temporary file (PyAnnote needs file path or Audio object)
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_content)
            tmp_path = tmp.name
        
        # Run diarization
        diarization = pipeline(tmp_path)
        
        # Get duration
        duration = diarization.duration
        
        # Parse segments if provided
        import json
        segments_data = json.loads(segments) if segments else []
        
        # Merge with transcription
        result = merge_diarization_with_transcription(diarization, segments_data, duration)
        
        # Clean up
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
    return {"status": "ok", "pipeline_loaded": pipeline is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
