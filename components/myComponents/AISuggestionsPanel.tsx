// components/AISuggestionsPanel.tsx
"use client";

import { motion } from "framer-motion";
import { Sparkles, Users, Lightbulb, Merge, Target, Zap } from "lucide-react";
import { GroupSuggestion } from "@/hooks/useGroupSuggestions"; // ← Utiliser le hook
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AISuggestionsPanelProps {
  suggestions: GroupSuggestion[];
  isLoading: boolean;
  onApplySuggestion: (suggestion: GroupSuggestion) => void;
  onDismissSuggestion: (suggestion: GroupSuggestion) => void;
}

export function AISuggestionsPanel({
  suggestions,
  isLoading,
  onApplySuggestion,
  onDismissSuggestion,
}: AISuggestionsPanelProps) {
  if (isLoading) {
    return (
      <div className="p-4 border-b border-gray-200 bg-blue-50">
        <div className="flex items-center gap-3">
          <div className="animate-spin">
            <Sparkles size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900">Analyzing insights...</p>
            <p className="text-xs text-blue-700">Looking for grouping patterns</p>
          </div>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  const getActionIcon = (action: GroupSuggestion['action']) => {
    switch (action) {
      case 'add_to_existing':
        return <Users size={14} />;
      case 'create_new':
        return <Lightbulb size={14} />;
      case 'merge_groups':
        return <Merge size={14} />;
      default:
        return <Zap size={14} />;
    }
  };

  const getActionColor = (action: GroupSuggestion['action']) => {
    switch (action) {
      case 'add_to_existing':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'create_new':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'merge_groups':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="border-b border-gray-200 bg-linear-to-r from-blue-50 to-indigo-50">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            {suggestions.length}
          </Badge>
        </div>

        <div className="space-y-3">
          {suggestions.slice(0, 3).map((suggestion, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-lg border ${getActionColor(suggestion.action)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getActionIcon(suggestion.action)}
                  <span className="text-sm font-medium capitalize">
                    {suggestion.action.replace(/_/g, ' ')}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(suggestion.confidence * 100)}% confidence
                  </Badge>
                </div>
                <span className="text-xs text-gray-500">
                  {suggestion.insightIds.length} insight{suggestion.insightIds.length !== 1 ? 's' : ''}
                </span>
              </div>

              <p className="text-sm mb-3 leading-snug">
                {suggestion.reason}
              </p>

              {suggestion.newGroupTitle && (
                <div className="flex items-center gap-2 mb-2">
                  <Target size={12} className="text-gray-500" />
                  <span className="text-xs font-medium">New group:</span>
                  <span className="text-xs bg-white px-2 py-1 rounded border">
                    {`"${suggestion.newGroupTitle}"`}
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="text-xs h-7 flex-1"
                  onClick={() => onApplySuggestion(suggestion)}
                >
                  Apply
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => onDismissSuggestion(suggestion)}
                      >
                        Ignore
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Dismiss this suggestion</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </motion.div>
          ))}
        </div>

        {suggestions.length > 3 && (
          <div className="text-center mt-3">
            <span className="text-xs text-gray-500">
              +{suggestions.length - 3} more suggestions available
            </span>
          </div>
        )}
      </div>
    </div>
  );
}