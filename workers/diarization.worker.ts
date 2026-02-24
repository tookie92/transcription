/* eslint-disable no-restricted-globals */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { pipeline, AutoProcessor, AutoModelForAudioFrameClassification, env } from '@xenova/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let whisperModel: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let segmentationModel: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let segmentationProcessor: any = null;

const WHISPER_MODEL = 'onnx-community/whisper-base_timestamped';
const SEGMENTATION_MODEL = 'onnx-community/pyannote-segmentation-3.0';

async function getModels() {
  if (whisperModel && segmentationModel && segmentationProcessor) {
    return { whisperModel, segmentationModel, segmentationProcessor };
  }

  self.postMessage({ status: 'loading', message: 'Loading Whisper...' });
  whisperModel = await pipeline('automatic-speech-recognition', WHISPER_MODEL, {
    device: 'wasm',
    dtype: 'q8',
  });

  self.postMessage({ status: 'loading', message: 'Loading speaker model...' });
  segmentationProcessor = await AutoProcessor.from_pretrained(SEGMENTATION_MODEL);
  segmentationModel = await AutoModelForAudioFrameClassification.from_pretrained(SEGMENTATION_MODEL, {
    device: 'wasm',
    dtype: 'fp32',
  });

  return { whisperModel, segmentationModel, segmentationProcessor };
}

async function segment(processor: any, model: any, audio: Float32Array) {
  const inputs = await processor(audio);
  const { logits } = await model(inputs);
  const segments = processor.post_process_speaker_diarization(logits, audio.length)[0];

  for (const seg of segments) {
    seg.label = model.config.id2label[seg.id];
  }

  return segments;
}

self.onmessage = async (event) => {
  const { audioData, sampleRate } = event.data;

  try {
    if (!audioData || !sampleRate) {
      self.postMessage({ status: 'need_audio' });
      return;
    }

    const float32Array = new Float32Array(audioData);
    console.log('Audio length:', float32Array.length, 'Sample rate:', sampleRate);

    const { whisperModel, segmentationModel, segmentationProcessor } = await getModels();

    self.postMessage({ status: 'processing', message: 'Transcribing & detecting speakers...' });

    // Run transcription and segmentation in parallel like Xenova
    const [transcript, speakerSegments] = await Promise.all([
      whisperModel(float32Array, {
        language: 'english',
        return_timestamps: 'word',
        chunk_length_s: 30,
      }),
      segment(segmentationProcessor, segmentationModel, float32Array)
    ]);

    // Return raw data like Xenova - combine in React
    self.postMessage({
      status: 'complete',
      data: {
        transcript,
        segments: speakerSegments,
      }
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    self.postMessage({
      status: 'error',
      error: errorMessage
    });
  }
};
