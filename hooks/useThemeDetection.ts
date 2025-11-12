// hooks/useThemeDetection.ts - VERSION SANS ANY
import { useState, useCallback } from 'react';
import { AffinityGroup, Insight, ThemeAnalysis } from '@/types';
import { toast } from 'sonner';

interface AnalysisGroupData {
  id: string;
  title: string;
  insights: string[];
  insightCount: number;
}

interface ThemeDetectionRequestBody {
  groups: AnalysisGroupData[];
  projectContext?: string;
  totalGroups: number;
  totalInsights: number;
}


// hooks/useThemeDetection.ts - S'ASSURER QUE themeAnalysis SE MET À JOUR
export const useThemeDetection = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [themeAnalysis, setThemeAnalysis] = useState<ThemeAnalysis | null>(null);

  const detectThemes = useCallback(async (
    groups: AffinityGroup[], 
    insights: Insight[],
    projectContext?: string
  ): Promise<ThemeAnalysis | null> => {
    if (groups.length === 0) {
      console.log('❌ No groups to analyze');
      toast.error('No groups to analyze');
      return null;
    }

    console.log('🚀 Calling detectThemes with:', {
      groups: groups.length,
      insights: insights.length,
      projectContext: projectContext ? 'yes' : 'no'
    });

    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/detect-themes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groups: groups.map(group => ({
            id: group.id,
            title: group.title,
            insights: insights
              .filter(insight => group.insightIds.includes(insight.id))
              .map(insight => insight.text),
            insightCount: group.insightIds.length
          })),
          projectContext,
          totalGroups: groups.length,
          totalInsights: insights.length
        }),
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Theme detection failed: ${response.statusText}`);
      }

      const analysis: ThemeAnalysis = await response.json();
      console.log('📦 Analysis data received:', {
        themes: analysis.themes?.length,
        recommendations: analysis.recommendations?.length
      });
      
      // 🆕 BIEN METTRE À JOUR themeAnalysis
      setThemeAnalysis(analysis);
      console.log('✅ themeAnalysis updated in hook');
      
      toast.success(`Found ${analysis.themes.length} themes with ${analysis.summary.coverage}% coverage`);
      return analysis;
    } catch (error) {
      console.error('💥 Theme detection error:', error);
      toast.error('Failed to detect themes');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearThemes = useCallback(() => {
    setThemeAnalysis(null);
  }, []);

  return {
    isAnalyzing,
    themeAnalysis, // 🆕 CECI DOIT CONTENIR LES THÈMES
    detectThemes,
    clearThemes
  };
};