// hooks/useAnalysis.ts
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Insight, SimpleSegment } from "@/types";

export function useAnalysis() {
  const createInsights = useMutation(api.insights.createInsights);
  const updateSummary = useMutation(api.interviews.updateSummary);

  const analyzeInterview = async (
    interviewId: string,
    projectId: string,
    transcription: string,
    topic?: string,
    language?: string,
    segments?: SimpleSegment[]
  ) => {
    try {
      console.log('🔍 Starting analysis...', { interviewId, projectId, topic });
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription,
          topic,
          language,
          segments,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      console.log('✅ Analysis complete:', data);

      // Filtrer les insights pour garder seulement les champs attendus par Convex
      const filteredInsights = data.insights.map((insight: Insight) => ({
        type: insight.type,
        text: insight.text,
        timestamp: insight.timestamp,
      }));

      // Stocker les insights dans Convex
      if (filteredInsights && filteredInsights.length > 0) {
        await createInsights({
          interviewId: interviewId as Id<"interviews">,
          projectId: projectId as Id<"projects">,
          insights: filteredInsights,
        });
      }

      return data.insights;
    } catch (error) {
      console.error('💥 Analysis error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Analysis failed');
    }
  };

  const generateInterviewSummary = async (
    interviewId: string,
    projectId: string,
    transcription: string,
    topic?: string,
    language?: string,
    insights?: Insight[]
  ) => {
    try {
      console.log('📝 Starting summary generation...', { interviewId, projectId });
      
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription,
          topic,
          language,
          insights: insights || [],
          projectContext: `Project ID: ${projectId}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Summary generation failed');
      }

      const data = await response.json();
      console.log('✅ Summary generation complete');

      // Stocker le résumé dans Convex
      await updateSummary({
        interviewId: interviewId as Id<"interviews">,
        summary: data.summary,
      });

      return data.summary;
    } catch (error) {
      console.error('💥 Summary generation error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Summary generation failed');
    }
  };

  return {
    analyzeInterview,
    generateInterviewSummary,
  };
}