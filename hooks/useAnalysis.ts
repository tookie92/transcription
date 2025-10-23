import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Insight, SimpleSegment } from "@/types";

export function useAnalysis() {
  const createInsights = useMutation(api.insights.createInsights);

  const analyzeInterview = async (
    interviewId: string,
    projectId: string,
    transcription: string,
    topic?: string,
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
        // Supprimer createdAt, id, et autres champs non attendus
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

  return {
    analyzeInterview,
  };
}