// hooks/useGroupSuggestions.ts
import { useState, useCallback } from 'react';
import { Insight, AffinityGroup } from '@/types'; // 🆕 IMPORT DES TYPES
import { toast } from 'sonner';

// 🆕 INTERFACE EXPORTÉE POUR LES COMPOSANTS
export interface GroupSuggestion {
  action: 'add_to_existing' | 'create_new' | 'merge_groups';
  confidence: number;
  reason: string;
  insightIds: string[];
  targetGroupId?: string;
  newGroupTitle?: string;
  newGroupDescription?: string;
}

export function useGroupSuggestions() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GroupSuggestion[]>([]);

// hooks/useGroupSuggestions.ts - AJOUTER UNE VALIDATION
const generateSuggestions = useCallback(async (
  insights: Insight[],
  existingGroups: AffinityGroup[],
  projectContext?: string
) => {
  if (insights.length === 0) {
    toast.info('No insights to analyze');
    return;
  }

  setIsLoading(true);
  setSuggestions([]);

  try {
    console.log('🚀 Sending real insight IDs:', insights.map(i => i.id));

    const response = await fetch('/api/suggest-groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        insights: insights.map(insight => ({
          id: insight.id, // 🎯 ENVOYER LES VRAIS IDs
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
    console.log('✅ AI Response with IDs:', data);

    if (data.suggestions && Array.isArray(data.suggestions)) {
      // 🎯 VALIDER QUE LES IDs EXISTENT RÉELLEMENT
      const validSuggestions = data.suggestions.filter((s: GroupSuggestion) => {
        const hasValidIds = s.insightIds && 
          s.insightIds.length > 0 &&
          s.insightIds.every((id: string) => 
            insights.some(realInsight => realInsight.id === id)
          );
        
        if (!hasValidIds) {
          console.warn('❌ Suggestion with invalid IDs:', s.insightIds);
        }
        
        return hasValidIds && s.confidence > 0.3;
      });
      
      setSuggestions(validSuggestions);
      
      if (validSuggestions.length > 0) {
        toast.success(`Found ${validSuggestions.length} valid suggestions`);
      } else {
        toast.info('No valid grouping patterns found');
      }
    }

  } catch (error) {
    console.error('💥 Error generating suggestions:', error);
    toast.error('Failed to generate AI suggestions');
  } finally {
    setIsLoading(false);
  }
}, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isLoading,
    generateSuggestions,
    clearSuggestions,
  };
}