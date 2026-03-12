import { NextRequest, NextResponse } from 'next/server';

const MOSI_API_URL = 'https://studio.mosi.cn/api/v1/audio/transcriptions';
const MOSI_API_KEY = process.env.MOSI_API_KEY;

interface MOSISegment {
  start_s: string;
  end_s: string;
  speaker: string;
  text: string;
}

interface MOSIResponse {
  asr_transcription_result: {
    segments: MOSISegment[];
    full_text: string;
  };
  meta_info?: {
    id: string;
    prompt_tokens: number;
    completion_tokens: number;
    e2e_latency: number;
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    credit_cost: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    if (!MOSI_API_KEY) {
      return NextResponse.json(
        { error: 'MOSI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const formDataRequest = new FormData();
    formDataRequest.append('file', new Blob([buffer], { type: file.type || 'audio/wav' }), file.name || 'audio.wav');
    formDataRequest.append('model', 'moss-transcribe-diarize');
    formDataRequest.append('meta_info', 'true');

    const response = await fetch(MOSI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOSI_API_KEY}`,
      },
      body: formDataRequest,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MOSI API error:', response.status, errorText);
      return NextResponse.json(
        { error: `MOSI API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data: MOSIResponse = await response.json();

    const segments = data.asr_transcription_result.segments.map((segment, index) => {
      const speakerNum = segment.speaker?.replace(/\D/g, '') || '1';
      return {
        id: index,
        seek: parseFloat(segment.start_s) || 0,
        start: parseFloat(segment.start_s) || 0,
        end: parseFloat(segment.end_s) || 0,
        text: segment.text || '',
        speaker: `Speaker ${speakerNum}`,
        tokens: [],
        temperature: 0,
        avg_logprob: 0,
        compression_ratio: 0,
        no_speech_prob: 0,
      };
    });

    const duration = segments.length > 0 ? segments[segments.length - 1].end : 0;

    return NextResponse.json({
      text: data.asr_transcription_result.full_text,
      segments: segments,
      duration: duration,
      language: 'multi',
      speakerDiarization: true,
      meta: data.meta_info || {},
      usage: data.usage,
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
