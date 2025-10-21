import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Define proper types for Groq response
interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

interface VerboseTranscription {
  text: string;
  task: string;
  language: string;
  duration: number;
  segments: TranscriptionSegment[];
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

    // Groq accepts File objects directly
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: 'whisper-large-v3',
      language: 'en', // or 'fr' for French
      response_format: 'verbose_json', // Get timestamps
      temperature: 0.0, // More accurate
    }) as unknown as VerboseTranscription;

    return NextResponse.json({
      text: transcription.text,
      segments: transcription.segments,
      duration: transcription.duration,
      language: transcription.language,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: error || 'Transcription failed' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false, // Important for file uploads
  },
};