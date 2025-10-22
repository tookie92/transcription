import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { VerboseTranscription } from '@/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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
    const errorMessage = error instanceof Error ? error.message : 'Transcription failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false, // Important for file uploads
  },
};