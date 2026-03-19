import { useState } from 'react';
import { useTranscriptionStore, Interview, TranscriptionSegment } from '@/stores/transcriptionStore';
import { videoConverter } from '@/lib/videoConverter';

interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  duration: number;
  language: string;
}

interface ConversionProgress {
  stage: 'loading' | 'converting' | 'transcribing';
  progress: number;
  message: string;
}

export function useTranscription() {
  const {
    isTranscribing,
    setIsTranscribing,
    transcriptionError,
    setTranscriptionError,
    addInterview,
    currentTranscript,
    setCurrentTranscript,
  } = useTranscriptionStore();

  const [conversionProgress, setConversionProgress] = useState<ConversionProgress | null>(null);

  const transcribe = async (
    file: File, 
    title?: string, 
    topic?: string,
    onProgress?: (progress: ConversionProgress) => void
  ): Promise<Interview> => {
    setIsTranscribing(true);
    setTranscriptionError(null);
    setConversionProgress(null);

    let processedFile = file;
    let wasVideo = false;

    try {
      // Step 1: Check if video and convert if needed
      const isVideo = videoConverter.isVideoFile(file) || videoConverter.isVideoExtension(file.name);

      if (isVideo) {
        wasVideo = true;
        
        // Stage 1: Loading FFmpeg
        setConversionProgress({ stage: 'loading', progress: 0, message: 'Loading video converter...' });
        onProgress?.({ stage: 'loading', progress: 0, message: 'Loading video converter...' });

        const loaded = await videoConverter.load((progress) => {
          const msg = `Loading converter... ${Math.round(progress.progress)}%`;
          setConversionProgress({ stage: 'loading', progress: progress.progress, message: msg });
          onProgress?.({ stage: 'loading', progress: progress.progress, message: msg });
        });

        if (!loaded) {
          throw new Error('Failed to load video converter. Please try again.');
        }

        // Stage 2: Converting video to audio
        setConversionProgress({ stage: 'converting', progress: 0, message: 'Converting video to audio...' });
        onProgress?.({ stage: 'converting', progress: 0, message: 'Converting video to audio...' });

        const conversionResult = await videoConverter.convertToAudio(file, (progress) => {
          const msg = `Converting... ${Math.round(progress.progress)}%`;
          setConversionProgress({ stage: 'converting', progress: progress.progress, message: msg });
          onProgress?.({ stage: 'converting', progress: progress.progress, message: msg });
        });

        if (!conversionResult.success || !conversionResult.audioBlob) {
          throw new Error(conversionResult.error || 'Video conversion failed');
        }

        // Use the converted audio
        processedFile = new File(
          [conversionResult.audioBlob],
          file.name.replace(/\.[^.]+$/, '.mp3'),
          { type: 'audio/mp3' }
        );

        console.log(`[VideoConverter] Converted: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`);
      }

      // Step 2: Send audio to transcription
      setConversionProgress({ 
        stage: 'transcribing', 
        progress: 0, 
        message: wasVideo ? 'Transcribing audio...' : 'Transcribing...' 
      });
      onProgress?.({ 
        stage: 'transcribing', 
        progress: 0, 
        message: wasVideo ? 'Transcribing audio...' : 'Transcribing...' 
      });

      const formData = new FormData();
      formData.append('file', processedFile);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Transcription failed');
      }

      const data: TranscriptionResult = await response.json();

      console.log('[useTranscription] Transcription complete with speaker labels');

      // Create interview object
      const interview: Interview = {
        id: crypto.randomUUID(),
        title: title || `Interview ${new Date().toLocaleDateString()}`,
        topic: topic,
        transcription: data.text,
        segments: data.segments,
        duration: data.duration,
        insights: [],
        isAnalyzing: false,
        createdAt: new Date().toISOString(),
        audioUrl: URL.createObjectURL(processedFile),
      };

      // Set current transcript for display
      setCurrentTranscript(data.text);

      // Add to store
      addInterview(interview);

      // Cleanup conversion blob URL if needed
      if (wasVideo && interview.audioUrl) {
        videoConverter.cleanup(interview.audioUrl);
      }

      return interview;
    } catch (err) {
      setTranscriptionError(err as string || 'Transcription failed.');
      throw err;
    } finally {
      setIsTranscribing(false);
      setConversionProgress(null);
    }
  };

  return {
    transcribe,
    isTranscribing,
    error: transcriptionError,
    transcript: currentTranscript,
    setTranscript: setCurrentTranscript,
    conversionProgress,
  };
}
