import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { VerboseTranscription } from '@/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const PYANNOTE_API_URL = process.env.PYANNOTE_API_URL;

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

        const diarizeResponse = await fetch(`${PYANNOTE_API_URL}/diarize`, {
          method: 'POST',
          body: diarizeFormData,
        });

        if (diarizeResponse.ok) {
          const diarizeData = await diarizeResponse.json();
          diarizedSegments = diarizeData.segments;
        }
      } catch (diarizeError) {
        console.error('Diarization failed, using raw transcription:', diarizeError);
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
