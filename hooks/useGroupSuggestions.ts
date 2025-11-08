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

  const generateSuggestions = useCallback(async (
    insights: Insight[], // 🆕 TYPE Insight IMPORTÉ
    existingGroups: AffinityGroup[], // 🆕 TYPE AffinityGroup IMPORTÉ
    projectContext?: string
  ) => {
    if (insights.length === 0) {
      toast.info('No insights to analyze');
      return;
    }

    setIsLoading(true);
    setSuggestions([]);

    try {
      console.log('🚀 Sending request to AI...', {
        insights: insights.length,
        groups: existingGroups.length
      });

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
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ AI Response:', data);

      if (data.suggestions && Array.isArray(data.suggestions)) {
        const validSuggestions = data.suggestions.filter((s: GroupSuggestion) => 
          s.insightIds && 
          s.insightIds.length > 0 &&
          s.confidence > 0.3
        );
        
        setSuggestions(validSuggestions);
        
        if (validSuggestions.length > 0) {
          toast.success(`Found ${validSuggestions.length} grouping suggestions`);
        } else {
          toast.info('No strong grouping patterns found');
        }
      } else {
        console.warn('⚠️ No suggestions in response:', data);
        toast.info('AI could not find clear grouping patterns');
      }

    } catch (error) {
      console.error('💥 Error generating suggestions:', error);
      toast.error('Failed to generate AI suggestions');
      setSuggestions([]);
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