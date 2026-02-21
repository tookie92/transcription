import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { VerboseTranscription } from '@/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const PYANNOTE_API_URL = process.env.PYANNOTE_API_URL;

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 180000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Step 1: Transcribe with Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: 'whisper-large-v3',
      language: 'en',
      response_format: 'verbose_json',
      temperature: 0.0,
    }) as unknown as VerboseTranscription;

    // Step 2: Speaker Diarization with PyAnnote (if available)
    let diarizedSegments = transcription.segments;
    
    if (PYANNOTE_API_URL) {
      let retries = 3;
      let lastError = null;
      
      while (retries > 0) {
        try {
          // Create FormData for PyAnnote API
          const diarizeFormData = new FormData();
          diarizeFormData.append('audio', file);
          diarizeFormData.append('segments', JSON.stringify(
            transcription.segments.map((s: { start: number; end: number; text: string }) => ({
              start: s.start,
              end: s.end,
              text: s.text,
            }))
          ));

          const diarizeResponse = await fetchWithTimeout(
            `${PYANNOTE_API_URL}/diarize`,
            {
              method: 'POST',
              body: diarizeFormData,
            },
            300000 // 5 minutes timeout
          );

          if (diarizeResponse.status === 202) {
            // Pipeline is still loading, wait and retry
            console.log('PyAnnote loading, waiting...');
            await new Promise(resolve => setTimeout(resolve, 30000));
            retries--;
            continue;
          }

          if (diarizeResponse.ok) {
            const diarizeData = await diarizeResponse.json();
            diarizedSegments = diarizeData.segments;
            console.log('Diarization successful!');
          }
          break;
        } catch (diarizeError) {
          lastError = diarizeError;
          console.error(`Diarization attempt failed (${retries} retries left):`, diarizeError);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        }
      }
      
      if (retries === 0) {
        console.error('Diarization failed after all retries:', lastError);
      }
    }

    return NextResponse.json({
      text: transcription.text,
      segments: diarizedSegments,
      duration: transcription.duration,
      language: transcription.language,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Transcription failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
