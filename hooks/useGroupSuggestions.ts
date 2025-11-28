// hooks/useGroupSuggestions.ts - VERSION CORRIGÉE
import { useState, useCallback, useRef } from 'react';
import { Insight, AffinityGroup } from '@/types';
import { toast } from 'sonner';

export interface GroupSuggestion {
  action: 'add_to_existing' | 'create_new' | 'merge_groups';
  confidence: number;
  reason: string;
  insightIds: string[];
  targetGroupId?: string;
  newGroupTitle?: string;
  newGroupDescription?: string;
  generatedAt?: number;
}

// 🆕 CACHE GLOBAL POUR TOUTE L'APPLICATION
const globalSuggestionsCache = new Map<string, {
  suggestions: GroupSuggestion[];
  timestamp: number;
  insightsHash: string;
}>();

export function useGroupSuggestions() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [suggestions, setSuggestions] = useState<GroupSuggestion[]>([]);
  
  // 🆕 RÉFÉRENCE POUR LE CACHE LOCAL (par composant)
  const localCacheRef = useRef<{
    insightsHash: string;
    suggestions: GroupSuggestion[];
  } | null>(null);

  // 🆕 GÉNÉRER UN HASH POUR LES INSIGHTS (pour détection de changements)
  const generateInsightsHash = useCallback((insights: Insight[]): string => {
    return insights
      .map(insight => `${insight.id}-${insight.text.length}`)
      .sort()
      .join('|');
  }, []);

  // 🆕 VÉRIFIER SI LES SUGGESTIONS SONT TOUJOURS FRAÎCHES (5 minutes)
  const areSuggestionsFresh = useCallback((suggestions: GroupSuggestion[]): boolean => {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return suggestions.some(s => 
      s.generatedAt && s.generatedAt > fiveMinutesAgo
    );
  }, []);

  // 🆕 FONCTION PRINCIPALE POUR GÉNÉRER LES SUGGESTIONS
 const generateSuggestions = useCallback(async (
    insights: Insight[],
    existingGroups: AffinityGroup[],
    projectContext?: string,
    isRefresh = false // 🆕 PARAMÈTRE POUR DIFFÉRENCIER
  ) => {
    if (insights.length === 0) {
      toast.info('No insights to analyze');
      return;
    }

    // 🆕 UTILISER LE BON ÉTAT DE CHARGEMENT
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      console.log('🚀 Generating new AI suggestions...', { isRefresh });

      const response = await fetch('/api/suggest-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          insights: insights.map(insight => ({
            id: insight.id,
            text: insight.text.substring(0, 500),
            type: insight.type,
          })),
          existingGroups: existingGroups.map(group => ({
            id: group.id,
            title: group.title,
            insightIds: group.insightIds,
          })),
          projectContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.suggestions && Array.isArray(data.suggestions)) {
        const suggestionsWithTimestamp = data.suggestions
          .filter((s: GroupSuggestion) => {
            const hasValidIds = s.insightIds && 
              s.insightIds.length > 0 &&
              s.insightIds.every((id: string) => 
                insights.some(realInsight => realInsight.id === id)
              );
            return hasValidIds && s.confidence > 0.3;
          })
          .map((s: GroupSuggestion) => ({
            ...s,
            generatedAt: Date.now()
          }));

        setSuggestions(suggestionsWithTimestamp);
        
        const insightsHash = generateInsightsHash(insights);
        const cacheKey = `${projectContext}-${insightsHash}`;
        
        localCacheRef.current = {
          insightsHash,
          suggestions: suggestionsWithTimestamp
        };
        
        globalSuggestionsCache.set(cacheKey, {
          suggestions: suggestionsWithTimestamp,
          timestamp: Date.now(),
          insightsHash
        });

        if (suggestionsWithTimestamp.length > 0) {
          toast.success(`Found ${suggestionsWithTimestamp.length} suggestions`);
        } else {
          toast.info('No valid grouping patterns found');
        }
      }

    } catch (error) {
      console.error('💥 Error generating suggestions:', error);
      toast.error('Failed to generate AI suggestions');
    } finally {
      // 🆕 ARRÊTER LE BON ÉTAT DE CHARGEMENT
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [generateInsightsHash, areSuggestionsFresh]);


  // 🆕 FONCTION POUR RAFRAÎCHIR LES SUGGESTIONS (forcer nouvelle requête)
  const refreshSuggestions = useCallback(async (
    insights: Insight[],
    existingGroups: AffinityGroup[],
    projectContext?: string
  ) => {
    const insightsHash = generateInsightsHash(insights);
    const cacheKey = `${projectContext}-${insightsHash}`;
    globalSuggestionsCache.delete(cacheKey);
    localCacheRef.current = null;
    
    // 🆕 PASSER isRefresh = true
    await generateSuggestions(insights, existingGroups, projectContext, true);
  }, [generateSuggestions, generateInsightsHash]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    localCacheRef.current = null;
  }, []);

  // 🆕 FONCTION POUR SAUVEGARDER LES SUGGESTIONS (après application)
  const markSuggestionApplied = useCallback((appliedSuggestion: GroupSuggestion) => {
    setSuggestions(prev => 
      prev.filter(s => 
        !(s.newGroupTitle === appliedSuggestion.newGroupTitle && 
          s.insightIds.length === appliedSuggestion.insightIds.length)
      )
    );
    
    // 🆕 METTRE À JOUR LE CACHE LOCAL AUSSI
    if (localCacheRef.current) {
      localCacheRef.current.suggestions = localCacheRef.current.suggestions.filter(s => 
        !(s.newGroupTitle === appliedSuggestion.newGroupTitle && 
          s.insightIds.length === appliedSuggestion.insightIds.length)
      );
    }
  }, []);

  return {
    suggestions,
    isLoading,
    isRefreshing,
    generateSuggestions,
    refreshSuggestions, // 🆕 NOUVELLE FONCTION
    clearSuggestions,
    markSuggestionApplied, // 🆕 NOUVELLE FONCTION
  };
}