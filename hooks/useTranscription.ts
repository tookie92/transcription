import { useTranscriptionStore, Interview, TranscriptionSegment } from '@/stores/transcriptionStore';

interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  duration: number;
  language: string;
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

  const transcribe = async (file: File, title?: string, topic?: string): Promise<Interview> => {
    setIsTranscribing(true);
    setTranscriptionError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Transcription failed');
      }

      const data: TranscriptionResult = await response.json();

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
        audioUrl: URL.createObjectURL(file),
      };

      // Set current transcript for display
      setCurrentTranscript(data.text);

      // Add to store
      addInterview(interview);

      return interview;
    } catch (err) {
      setTranscriptionError(err as string || 'Transcription failed.');
      throw err;
    } finally {
      setIsTranscribing(false);
    }
  };

  return {
    transcribe,
    isTranscribing,
    error: transcriptionError,
    transcript: currentTranscript,
    setTranscript: setCurrentTranscript,
  };
}