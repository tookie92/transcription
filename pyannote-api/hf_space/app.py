"""
PyAnnote Speaker Diarization API
Deploy on HuggingFace Spaces (free)
"""

import os
import json
import tempfile
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

app = FastAPI(title="PyAnnote Diarization API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

HF_TOKEN = os.getenv("HF_TOKEN")
PORT = int(os.getenv("PORT", "7860"))
pipeline = None
pipeline_loading = False
pipeline_error = None

def get_pipeline():
    global pipeline, pipeline_loading, pipeline_error
    
    if pipeline is not None:
        return pipeline
    
    if pipeline_loading:
        return None
    
    pipeline_loading = True
    
    try:
        from pyannote.audio import Pipeline
        
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-community-1",
        )
        print("Pipeline loaded successfully!")
        return pipeline
    except Exception as e:
        pipeline_error = str(e)
        print(f"Error loading pipeline: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        pipeline_loading = False

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
    global pipeline_error
    
    try:
        p = get_pipeline()
        
        if p is None:
            if pipeline_error:
                return JSONResponse(
                    status_code=503,
                    content={
                        "error": "Pipeline failed to load",
                        "details": pipeline_error
                    }
                )
            return JSONResponse(
                status_code=202,
                content={"status": "loading", "message": "Pipeline is loading, please retry"}
            )
        
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

@app.get("/")
async def root():
    return RedirectResponse(url="/docs")

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "pipeline_loaded": pipeline is not None,
        "pipeline_error": pipeline_error
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
