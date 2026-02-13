// hooks/useThemeDetection.ts - VERSION AVEC CACHE
import { useState, useCallback, useRef } from 'react';
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

// 🆕 CACHE GLOBAL POUR TOUTE L'APPLICATION
const globalThemeCache = new Map<string, {
  analysis: ThemeAnalysis;
  timestamp: number;
  groupsHash: string;
}>();

// 🆕 GÉNÉRER UN HASH POUR LES GROUPS
const generateGroupsHash = (groups: AffinityGroup[]): string => {
  return groups
    .map(g => `${g.id}-${g.insightIds.length}`)
    .sort()
    .join('|');
};

// 🆕 VÉRIFIER SI L'ANALYSE EST TOUJOURS FRAÎCHE (5 minutes)
const isAnalysisFresh = (timestamp: number): boolean => {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  return timestamp > fiveMinutesAgo;
};

// hooks/useThemeDetection.ts - S'ASSURER QUE themeAnalysis SE MET À JOUR
export const useThemeDetection = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [themeAnalysis, setThemeAnalysis] = useState<ThemeAnalysis | null>(null);
  const cacheRef = useRef<{ key: string; analysis: ThemeAnalysis; timestamp: number } | null>(null);

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

    // 🆕 VÉRIFIER LE CACHE LOCAL
    const groupsHash = generateGroupsHash(groups);
    const cacheKey = `${projectContext || 'default'}_${groupsHash}`;
    
    if (cacheRef.current && 
        cacheRef.current.key === cacheKey && 
        cacheRef.current.analysis && 
        isAnalysisFresh(cacheRef.current.timestamp)) {
      console.log('💨 Using cached theme analysis');
      setThemeAnalysis(cacheRef.current.analysis);
      return cacheRef.current.analysis;
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
      
      // 🆕 METTRE EN CACHE
      cacheRef.current = {
        key: cacheKey,
        analysis,
        timestamp: Date.now()
      };
      
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
    cacheRef.current = null;
  }, []);

  return {
    isAnalyzing,
    themeAnalysis, // 🆕 CECI DOIT CONTENIR LES THÈMES
    detectThemes,
    clearThemes
  };
};