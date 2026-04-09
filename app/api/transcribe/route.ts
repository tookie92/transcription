import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max pour gros fichiers

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(request: NextRequest) {
  console.log('Transcription request started');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const language = formData.get('language') as string | null;

    console.log('File:', file?.name, 'Size:', file?.size);

    if (!file) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    const fileSize = file.size;
    const maxSize = 25 * 1024 * 1024; // 25MB
    
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: `File too large (${Math.round(fileSize / 1024 / 1024)}MB). Maximum is 25MB.` },
        { status: 413 }
      );
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY not configured' },
        { status: 500 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    // Use Uint8Array instead of Buffer for serverless compatibility
    const uint8Array = new Uint8Array(arrayBuffer);
    const blob = new Blob([uint8Array], { type: file.type || 'audio/wav' });

    const formDataRequest = new FormData();
    formDataRequest.append('file', blob, file.name || 'audio.wav');
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

    console.log('Groq response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText.substring(0, 200));
      
      // Check for common issues
      if (response.status === 413) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 25MB.' },
          { status: 413 }
        );
      }
      
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { error: 'API key invalid or missing.' },
          { status: response.status }
        );
      }
      
      return NextResponse.json(
        { error: `Groq API error: ${response.status} - ${errorText.substring(0, 100)}` },
        { status: response.status }
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      const text = await response.text();
      console.error('Failed to parse Groq response:', text.substring(0, 200));
      return NextResponse.json(
        { error: 'Invalid response from transcription service.' },
        { status: 500 }
      );
    }

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