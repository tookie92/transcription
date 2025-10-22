import { useTranscriptionStore, TranscriptionSegment } from '@/store/transcriptionStore';
import { AnalysisResponse } from '@/types';

export function useAnalysis() {
  const { updateInterview } = useTranscriptionStore();

  const analyzeInterview = async (
    interviewId: string,
    transcription: string,
    topic?: string,
    segments?: TranscriptionSegment[]
  ) => {
    // Set analyzing state
    updateInterview(interviewId, { isAnalyzing: true });

    try {
      console.log('🔍 Starting analysis...', { interviewId, topic });
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription,
          topic,
          segments,
        }),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Not JSON response:', text);
        throw new Error(`Expected JSON but got ${contentType}. Check if /api/analyze route exists.`);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data: AnalysisResponse = await response.json();
      console.log('✅ Analysis complete:', data);

      // Update interview with insights
      updateInterview(interviewId, {
        insights: data.insights,
        isAnalyzing: false,
      });

      return data.insights;
    } catch (error) {
      console.error('💥 Analysis error:', error);
      updateInterview(interviewId, { isAnalyzing: false });
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Analysis failed');
    }
  };

  return {
    analyzeInterview,
  };
}