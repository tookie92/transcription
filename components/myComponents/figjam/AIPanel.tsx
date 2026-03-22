"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Layers,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Lightbulb,
  Group,
  Plus,
  ArrowRight
} from "lucide-react";
import { AffinityGroup, Insight } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface GroupingSuggestion {
  id: string;
  title: string;
  insightIds: string[];
  reason: string;
  confidence: number;
}

interface AIPanelProps {
  groups: AffinityGroup[];
  insights: Insight[];
  projectContext?: string;
  onCreateGroup: (insightIds: string[], title: string) => void;
  onAddToGroup: (insightIds: string[], groupId: string) => void;
  onClose: () => void;
}

export function AIPanel({
  groups,
  insights,
  projectContext,
  onCreateGroup,
  onAddToGroup,
  onClose,
}: AIPanelProps) {
  const [groupingSuggestions, setGroupingSuggestions] = useState<GroupingSuggestion[]>([]);
  const [isGeneratingGroupings, setIsGeneratingGroupings] = useState(false);

  const ungroupedInsights = useMemo(() => 
    insights.filter(i => !groups.some(g => g.insightIds.includes(i.id))),
    [insights, groups]
  );

  const generateGroupingSuggestions = async () => {
    if (ungroupedInsights.length === 0) {
      toast.info("No ungrouped insights to analyze");
      return;
    }

    setIsGeneratingGroupings(true);
    try {
      const response = await fetch('/api/suggest-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insights: ungroupedInsights.map(i => ({ id: i.id, text: i.text, type: i.type })),
          existingGroups: groups.map(g => ({ id: g.id, title: g.title, insightIds: g.insightIds })),
          projectContext,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate');

      const data = await response.json();
      setGroupingSuggestions(data.suggestions || []);
      
      if (!data.suggestions?.length) {
        generateFallbackGroupings();
      }
    } catch {
      generateFallbackGroupings();
    } finally {
      setIsGeneratingGroupings(false);
    }
  };

  const generateFallbackGroupings = () => {
    if (ungroupedInsights.length < 2) {
      setGroupingSuggestions([]);
      return;
    }

    const typeGroups = new Map<string, Insight[]>();
    ungroupedInsights.forEach(i => {
      const type = i.type || 'custom';
      if (!typeGroups.has(type)) typeGroups.set(type, []);
      typeGroups.get(type)!.push(i);
    });

    const suggestions: GroupingSuggestion[] = [];
    typeGroups.forEach((items, type) => {
      if (items.length >= 2) {
        suggestions.push({
          id: `fallback-${type}`,
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Themes`,
          insightIds: items.map(i => i.id),
          reason: `Grouped ${items.length} ${type} items together`,
          confidence: 0.6,
        });
      }
    });

    setGroupingSuggestions(suggestions.slice(0, 3));
  };

  useEffect(() => {
    if (ungroupedInsights.length >= 3) {
      generateGroupingSuggestions();
    }
  }, []);

  const handleApplyGrouping = (suggestion: GroupingSuggestion) => {
    onCreateGroup(suggestion.insightIds, suggestion.title);
    toast.success(`Created group "${suggestion.title}"`);
  };

  return (
    <div className="w-72 bg-card border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-violet-500" />
            <h3 className="font-semibold text-sm text-foreground">AI Suggestions</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {ungroupedInsights.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lightbulb size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium text-foreground">All grouped!</p>
            <p className="text-xs text-muted-foreground mt-1">
              All {insights.length} insights are organized
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Ungrouped Summary */}
            <div className="bg-violet-50 dark:bg-violet-950/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/50 rounded-full flex items-center justify-center">
                  <Layers size={14} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{ungroupedInsights.length} ungrouped</p>
                  <p className="text-xs text-muted-foreground">Need organization</p>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={generateGroupingSuggestions} 
              disabled={isGeneratingGroupings}
              className="w-full"
              size="sm"
            >
              {isGeneratingGroupings ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles size={14} className="mr-2" />
                  Get AI Suggestions
                </>
              )}
            </Button>

            {/* Suggestions */}
            {groupingSuggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Suggested Groups
                </p>
                {groupingSuggestions.map((suggestion, index) => (
                  <Card key={`${suggestion.id}-${index}`} className="border-violet-100 dark:border-violet-900/50 hover:border-violet-300 dark:hover:border-violet-700 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {suggestion.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {suggestion.insightIds.length} insights
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {suggestion.reason}
                      </p>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="flex-1 text-xs h-8"
                          onClick={() => handleApplyGrouping(suggestion)}
                        >
                          <Plus size={12} className="mr-1" />
                          Create
                        </Button>
                        {groups.length > 0 && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs h-8"
                            onClick={() => {
                              const bestMatch = groups[0];
                              onAddToGroup(suggestion.insightIds, bestMatch.id);
                              toast.success(`Added to "${bestMatch.title}"`);
                            }}
                          >
                            <ArrowRight size={12} className="mr-1" />
                            Existing
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Preview */}
            {groupingSuggestions.length === 0 && !isGeneratingGroupings && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Preview
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {ungroupedInsights.slice(0, 6).map((insight, index) => (
                    <div 
                      key={`ungrouped-${insight.id}-${index}`}
                      className="p-2 bg-muted/50 dark:bg-muted/20 rounded text-xs text-muted-foreground truncate"
                    >
                      {insight.text}
                    </div>
                  ))}
                  {ungroupedInsights.length > 6 && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      +{ungroupedInsights.length - 6} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
