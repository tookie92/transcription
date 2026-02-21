"""
PyAnnote Speaker Diarization API - Optimized version
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

pipeline = None
HF_TOKEN = os.getenv("HF_TOKEN")
pipeline_loading = False

def get_pipeline():
    """Lazy load the pipeline"""
    global pipeline, pipeline_loading
    
    if pipeline is not None:
        return pipeline
    
    if pipeline_loading:
        return None
    
    pipeline_loading = True
    
    try:
        import torch
        from pyannote.audio import Pipeline
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-community-1",
            use_auth_token=HF_TOKEN
        )
        print("PyAnnote pipeline loaded successfully!")
        return pipeline
    except Exception as e:
        print(f"Error loading pipeline: {e}")
        import traceback
        traceback.print_exc()
        return None

def optimize_audio(input_path, output_path):
    """Convert audio to mono 16kHz for faster processing"""
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_file(input_path)
        audio = audio.set_channels(1).set_frame_rate(16000)
        audio.export(output_path, format="wav")
        return True
    except Exception as e:
        print(f"Audio optimization failed: {e}")
        return False

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
    p = get_pipeline()
    
    if p is None:
        if pipeline_loading:
            return JSONResponse(
                status_code=202,
                content={"status": "loading", "message": "Pipeline is loading, please retry"}
            )
        return JSONResponse(
            status_code=503,
            content={"status": "error", "message": "Pipeline failed to load. Check HF_TOKEN."}
        )
    
    try:
        audio_content = await audio.read()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_in:
            tmp_in.write(audio_content)
            tmp_in_path = tmp_in.name
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_out:
            tmp_out_path = tmp_out.name
        
        optimized = optimize_audio(tmp_in_path, tmp_out_path)
        
        if optimized:
            audio_path = tmp_out_path
        else:
            audio_path = tmp_in_path
        
        diarization = p(audio_path)
        duration = diarization.duration
        
        segments_data = json.loads(segments) if segments else []
        result = merge_diarization_with_transcription(diarization, segments_data, duration)
        
        os.unlink(tmp_in_path)
        if optimized:
            os.unlink(tmp_out_path)
        
        return JSONResponse(content={
            "segments": result,
            "duration": duration,
            "speakers": list(set(s["speaker"] for s in result))
        })
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

@app.get("/health")
async def health():
    return {"status": "ok", "pipeline_loaded": pipeline is not None}

@app.get("/test")
async def test():
    return {"message": "API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=10000)
