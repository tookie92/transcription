// components/GroupNameAssistant.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Edit3, Zap } from "lucide-react";
import { AffinityGroup, Insight } from "@/types";
import { toast } from "sonner";

// 🎯 TYPE STRICT POUR LES CATÉGORIES
type SuggestionCategory = 'descriptive' | 'actionable' | 'thematic' | 'problem-focused';

interface NameSuggestion {
  title: string;
  reason: string;
  confidence: number;
  category: SuggestionCategory; // 🎯 TYPE STRICT
}

interface GroupNameAssistantProps {
  group: AffinityGroup;
  insights: Insight[];
  currentTitle: string;
  onTitleUpdate: (title: string) => void;
  projectContext?: string;
}

export function GroupNameAssistant({
  group,
  insights,
  currentTitle,
  onTitleUpdate,
  projectContext
}: GroupNameAssistantProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<NameSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const groupInsights = insights.filter(insight => 
    group.insightIds.includes(insight.id)
  );

  

  // 🎯 VALIDATION DU TYPE CATEGORY
  const isValidCategory = (category: string): category is SuggestionCategory => {
    return ['descriptive', 'actionable', 'thematic', 'problem-focused'].includes(category);
  };

  // 🎯 GÉNÉRER LES SUGGESTIONS DE NOMS
  const generateNameSuggestions = async () => {
    if (groupInsights.length === 0) {
      toast.info('No insights in this group to analyze');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/suggest-group-names', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          insights: groupInsights.map(insight => ({
            text: insight.text,
            type: insight.type,
          })),
          currentTitle: currentTitle,
          projectContext: projectContext,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate suggestions');

      const data = await response.json();
      
      // 🎯 VALIDER ET FILTRER LES SUGGESTIONS
      const validSuggestions: NameSuggestion[] = (data.suggestions || [])
        .filter((suggestion: { category: string }) => isValidCategory(suggestion.category))
        .map((suggestion: { title: string; reason: string; confidence: number; category: string }) => ({
          ...suggestion,
          category: suggestion.category as SuggestionCategory // 🎯 CAST SÉCURISÉ
        }));

      setSuggestions(validSuggestions);
      
      if (validSuggestions.length > 0) {
        const bestSuggestion = validSuggestions.reduce((best: NameSuggestion, current: NameSuggestion) => 
          current.confidence > best.confidence ? current : best
        );
        setSelectedSuggestion(bestSuggestion.title);
      }

    } catch (error) {
      console.error('Error generating name suggestions:', error);
      toast.error('Failed to generate name suggestions');
      
      const fallbackSuggestions = generateFallbackSuggestions();
      setSuggestions(fallbackSuggestions);
      if (fallbackSuggestions.length > 0) {
        setSelectedSuggestion(fallbackSuggestions[0].title);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // 🎯 SUGGESTIONS DE SECOURS AVEC TYPES STRICTS
  const generateFallbackSuggestions = (): NameSuggestion[] => {
    const insightTexts = groupInsights.map(i => i.text.toLowerCase());
    
    const themes: Record<string, {keywords: string[], category: SuggestionCategory}> = {
      'performance': {
        keywords: ['slow', 'fast', 'loading', 'speed', 'performance'],
        category: 'problem-focused'
      },
      'usability': {
        keywords: ['difficult', 'easy', 'confusing', 'intuitive', 'complicated'],
        category: 'descriptive'
      },
      'features': {
        keywords: ['missing', 'want', 'need', 'feature', 'functionality'],
        category: 'actionable'
      },
      'design': {
        keywords: ['ugly', 'beautiful', 'design', 'interface', 'layout'],
        category: 'thematic'
      }
    };

    const detectedThemes = Object.entries(themes)
      .filter(([_, { keywords }]) => 
        keywords.some(keyword => 
          insightTexts.some(text => text.includes(keyword))
        )
      )
      .map(([theme, config]) => ({
        title: `${theme.charAt(0).toUpperCase() + theme.slice(1)} Insights`,
        reason: `Based on ${theme}-related content in insights`,
        confidence: 0.7,
        category: config.category
      }));

    return detectedThemes.slice(0, 4);
  };

  // 🎯 APPLIQUER UNE SUGGESTION
  const applySuggestion = (suggestion: NameSuggestion) => {
    onTitleUpdate(suggestion.title);
    setOpen(false);
    toast.success(`Group renamed to "${suggestion.title}"`);
  };

  useEffect(() => {
    if (open && suggestions.length === 0) {
      generateNameSuggestions();
    }
  }, [open]);

  const getCategoryColor = (category: SuggestionCategory) => {
    switch (category) {
      case 'descriptive': return 'bg-blue-100 text-blue-800';
      case 'actionable': return 'bg-green-100 text-green-800';
      case 'thematic': return 'bg-purple-100 text-purple-800';
      case 'problem-focused': return 'bg-orange-100 text-orange-800';
    }
  };

    // 🎯 SI PAS D'INSIGHTS, NE RIEN RENDRE

  const getCategoryIcon = (category: SuggestionCategory) => {
    switch (category) {
      case 'actionable': return <Zap size={12} />;
      default: return <Sparkles size={12} />;
    }
  };

 if (groupInsights.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-gray-100 ml-1"
          title="Get AI name suggestions"
        >
          <Sparkles size={14} />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <div className="flex items-center px-3 py-2 border-b">
            <Sparkles size={16} className="text-purple-600 mr-2" />
            <span className="font-medium text-sm">AI Name Suggestions</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {groupInsights.length} insights
            </Badge>
          </div>

          <CommandInput 
            placeholder="Search suggestions..." 
            ref={inputRef}
          />
          
          <CommandList>
            {isGenerating ? (
              <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                <div className="animate-spin mr-2">
                  <Sparkles size={16} />
                </div>
                Analyzing insights for name suggestions...
              </div>
            ) : suggestions.length > 0 ? (
              <CommandGroup heading="Suggested Names">
                {suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={index}
                    value={suggestion.title}
                    onSelect={() => applySuggestion(suggestion)}
                    className="flex flex-col items-start py-3 px-3 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-medium text-sm flex-1">
                        {suggestion.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getCategoryColor(suggestion.category)}`}
                        >
                          {getCategoryIcon(suggestion.category)}
                          {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                        {selectedSuggestion === suggestion.title && (
                          <Check size={14} className="text-green-600" />
                        )}
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-600 text-left leading-snug">
                      {suggestion.reason}
                    </p>
                    
                    <div className="flex gap-1 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {suggestion.category}
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-sm text-gray-500">
                <Sparkles size={24} className="mb-2 text-gray-300" />
                <p>No suggestions available</p>
                <p className="text-xs">Try adding more insights to the group</p>
              </div>
            )}

            <CommandGroup heading="Actions">
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                }}
                className="flex items-center gap-2"
              >
                <Edit3 size={14} />
                <span>Edit manually</span>
              </CommandItem>
              
              <CommandItem
                onSelect={generateNameSuggestions}
                className="flex items-center gap-2"
              >
                <Sparkles size={14} />
                <span>Regenerate suggestions</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}