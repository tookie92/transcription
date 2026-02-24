import { useState, useCallback, useRef, useEffect } from 'react';

interface WorkerChunk {
  text: string;
  timestamp: [number, number];
}

interface WorkerTranscript {
  text: string;
  chunks: WorkerChunk[];
}

interface WorkerSegment {
  start: number;
  end: number;
  id: number;
  label: string;
}

interface WorkerResult {
  transcript: WorkerTranscript;
  segments: WorkerSegment[];
}

interface CombinedSegment {
  start: number;
  end: number;
  text: string;
  speaker: string;
}

interface TranscriptionResult {
  text: string;
  segments: CombinedSegment[];
  speakers: string[];
}

export function useDiarization() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const loadAudioFromUrl = useCallback(async (url: string): Promise<{ data: Float32Array; sampleRate: number }> => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const inputSampleRate = audioBuffer.sampleRate;
    const inputData = audioBuffer.getChannelData(0);
    const length = inputData.length;
    
    // Resample to 16kHz (Whisper expects 16kHz)
    const targetSampleRate = 16000;
    const ratio = inputSampleRate / targetSampleRate;
    const newLength = Math.round(length / ratio);
    const resampledData = new Float32Array(newLength);
    
    for (let i = 0; i < newLength; i++) {
      const srcIdx = i * ratio;
      const idx = Math.floor(srcIdx);
      resampledData[i] = inputData[idx];
    }
    
    audioContext.close();
    
    return { data: resampledData, sampleRate: targetSampleRate };
  }, []);

  const processAudio = useCallback(async (audioUrl: string): Promise<TranscriptionResult> => {
    setIsProcessing(true);
    setStatus('Loading audio...');

    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('../workers/diarization.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      worker.onmessage = async (event) => {
        const { status: workerStatus, data, error } = event.data;

        if (workerStatus === 'loading' || workerStatus === 'ready' || workerStatus === 'processing') {
          setStatus(event.data.message || workerStatus);
        } else if (workerStatus === 'need_audio') {
          try {
            setStatus('Decoding audio...');
            const { data: channelData, sampleRate } = await loadAudioFromUrl(audioUrl);
            
            worker.postMessage({ 
              audioData: channelData.buffer,
              sampleRate
            }, [channelData.buffer]);
          } catch (err) {
            reject(err);
            worker.terminate();
          }
        } else if (workerStatus === 'complete') {
          setIsProcessing(false);
          
          // Xenova combination logic - iterate over speaker segments, collect words
          const { transcript, segments: speakerSegments } = data as WorkerResult;
          
          const combinedSegments: CombinedSegment[] = [];
          const words = transcript.chunks;
          
          let wordIndex = 0;
          
          for (const seg of speakerSegments) {
            const { start, end, label } = seg;
            
            if (label === 'NO_SPEAKER') continue;
            
            const segmentWords = [];
            
            // Collect all words that end before or at the segment end
            while (wordIndex < words.length) {
              const word = words[wordIndex];
              
              if (word.timestamp[1] <= end) {
                segmentWords.push(word);
                wordIndex++;
              } else {
                break;
              }
            }
            
            if (segmentWords.length > 0) {
              const text = segmentWords.map(w => w.text).join('').trim();
              combinedSegments.push({
                start,
                end,
                text,
                speaker: label,
              });
            }
          }
          
          const speakers = [...new Set(combinedSegments.map(s => s.speaker))];
          
          resolve({
            text: transcript.text,
            segments: combinedSegments,
            speakers,
          });
          worker.terminate();
        } else if (workerStatus === 'error') {
          setIsProcessing(false);
          reject(new Error(error));
          worker.terminate();
        }
      };

      worker.onerror = (error) => {
        setIsProcessing(false);
        reject(error);
        worker.terminate();
      };

      worker.postMessage({});
    });
  }, [loadAudioFromUrl]);

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsProcessing(false);
    setStatus('');
  }, []);

  return {
    processAudio,
    cancel,
    isProcessing,
    status,
  };
}
