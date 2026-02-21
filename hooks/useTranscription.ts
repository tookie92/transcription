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
      // Step 1: Upload audio file first
      console.log('[useTranscription] Uploading audio file...');
      const uploadFormData = new FormData();
      uploadFormData.append('audio', file);

      const uploadResponse = await fetch('/api/upload-audio', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload audio');
      }

      const { audioUrl } = await uploadResponse.json();
      console.log('[useTranscription] Audio uploaded:', audioUrl);

      // Step 2: Transcribe with Whisper
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

      console.log('[useTranscription] Transcription complete, triggering Inngest diarization...');

      // Step 3: Trigger Inngest for diarization with audio URL
      await fetch('/api/trigger-diarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId: crypto.randomUUID(),
          audioUrl,
          segments: data.segments,
        }),
      });

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