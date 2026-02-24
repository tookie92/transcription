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

    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: 'whisper-large-v3',
      language: 'en',
      response_format: 'verbose_json',
      temperature: 0.0,
    }) as unknown as VerboseTranscription;

    const segments = transcription.segments?.map((segment, index) => ({
      id: index,
      seek: segment.seek || 0,
      start: segment.start || 0,
      end: segment.end || 0,
      text: segment.text || '',
      tokens: segment.tokens || [],
      temperature: segment.temperature || 0,
      avg_logprob: segment.avg_logprob || 0,
      compression_ratio: segment.compression_ratio || 0,
      no_speech_prob: segment.no_speech_prob || 0,
    })) || [];

    return NextResponse.json({
      text: transcription.text,
      segments: segments,
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
