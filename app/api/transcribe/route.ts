import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const language = formData.get('language') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY not configured' },
        { status: 500 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const formDataRequest = new FormData();
    formDataRequest.append('file', new Blob([buffer], { type: file.type || 'audio/wav' }), file.name || 'audio.wav');
    formDataRequest.append('model', 'whisper-large-v3');
    formDataRequest.append('response_format', 'verbose_json');
    if (language) {
      formDataRequest.append('language', language);
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: formDataRequest,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Groq API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    console.log('Groq response:', JSON.stringify(data).slice(0, 500));

    const segments = (data.segments || []).map((segment: any, index: number) => ({
      id: index,
      seek: segment.start || 0,
      start: segment.start || 0,
      end: segment.end || 0,
      text: segment.text || '',
      tokens: segment.tokens || [],
      temperature: 0,
      avg_logprob: segment.avg_logprob || 0,
      compression_ratio: segment.compression_ratio || 0,
      no_speech_prob: segment.no_speech_prob || 0,
    }));

    const duration = segments.length > 0 ? segments[segments.length - 1].end : 0;

    return NextResponse.json({
      text: data.text || '',
      segments: segments,
      duration: duration,
      language: data.language || 'en',
      speakerDiarization: false,
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