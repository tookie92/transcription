// components/ThemeDiscoveryPanel.tsx - VERSION CORRIGÉE
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Target, 
  Merge, 
  Split, 
  Users, 
  TrendingUp, 
  X,
  Lightbulb,
  ArrowRight
} from "lucide-react";
import { AffinityGroup, Insight, ThemeAnalysis, DetectedTheme, ThemeRecommendation } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface ThemeDiscoveryPanelProps {
  groups: AffinityGroup[];
  insights: Insight[];
  projectContext?: string;
  onThemeSelect?: (theme: DetectedTheme) => void;
  onApplyRecommendation?: (recommendation: ThemeRecommendation) => void;
  onGroupsMerge?: (groupIds: string[], newTitle: string) => void;
  onGroupSplit?: (groupId: string, newGroups: { title: string; insightIds: string[] }[]) => void;
  filteredRecommendations?: ThemeRecommendation[];
  themeAnalysis: ThemeAnalysis | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onClear: () => void;
}

export function ThemeDiscoveryPanel({
  groups,
  insights,
  projectContext,
  onThemeSelect,
  onApplyRecommendation,
  onGroupsMerge,
  onGroupSplit,
  filteredRecommendations,
  themeAnalysis,
  isAnalyzing,
  onAnalyze,
  onClear,
}: ThemeDiscoveryPanelProps) {
  const [selectedTheme, setSelectedTheme] = useState<DetectedTheme | null>(null);

  const recommendations = filteredRecommendations ?? themeAnalysis?.recommendations ?? [];

  const handleThemeSelect = (theme: DetectedTheme) => {
    setSelectedTheme(theme);
    onThemeSelect?.(theme);
  };



  const handleApplyRecommendation = (recommendation: ThemeRecommendation) => {
    onApplyRecommendation?.(recommendation);
  };

  const getThemeTypeIcon = (type: string) => {
    switch (type) {
      case 'hierarchical': return <TrendingUp size={14} />;
      case 'related': return <Users size={14} />;
      case 'contradictory': return <Split size={14} />;
      case 'complementary': return <Merge size={14} />;
      default: return <Lightbulb size={14} />;
    }
  };

  const getThemeTypeColor = (type: string) => {
    switch (type) {
      case 'hierarchical': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'related': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'contradictory': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'complementary': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatRecommendationType = (type: string | undefined): string => {
    if (!type) return 'reorganize';
    return type.replace(/_/g, ' ');
  };

  const getValidRecommendations = (recommendations: ThemeRecommendation[] = []): ThemeRecommendation[] => {
    return recommendations.map(rec => ({
      type: rec.type || 'reorganize',
      groups: rec.groups || [],
      reason: rec.reason || 'No reason provided',
      confidence: rec.confidence || 0.5,
      expectedImpact: rec.expectedImpact || 'medium'
    }));
  };


  return (
    <div className="w-80 bg-card border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Sparkles size={18} />
              Theme Discovery
            </h3>
            <p className="text-sm text-muted-foreground">AI-powered pattern detection</p>
          </div>
          
          {themeAnalysis && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="h-7 w-7 p-0"
              title="Clear themes"
            >
              <X size={14} />
            </Button>
          )}
        </div>

        {/* Bouton pour générer ou régénérer les thèmes */}
        <Button
          onClick={onAnalyze}
          disabled={isAnalyzing || groups.length === 0}
          className="w-full"
        >
          <Sparkles size={16} className="mr-2" />
          {isAnalyzing 
            ? 'Analyzing Patterns...' 
            : themeAnalysis 
              ? 'Regenerate Themes' 
              : 'Discover Themes'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!themeAnalysis ? (
          // État initial - Introduction
          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h4 className="font-bold text-lg mb-2">
                Discover Hidden Patterns
              </h4>
              <p className="text-muted-foreground mb-4">
                AI will analyze your {groups.length} groups to find emergent themes and relationships
              </p>
            </div>

            {/* Exemple concret */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Example Discovery:</h5>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <p>• {`"User Frustration"`} connects 3 groups about errors</p>
                <p>• {`"Onboarding Journey"`} links 4 sequential groups</p>
                <p>• {`"Feature Requests"`} spans across 5 different groups</p>
              </div>
            </div>
          </div>
        ) : (
          // État après analyse - Résultats
          <div className="p-4 space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Themes Found</span>
                  <Badge variant="secondary">
                    {themeAnalysis.themes?.length || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Coverage</span>
                  <Badge variant="secondary">
                    {themeAnalysis.summary?.coverage || 0}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Confidence</span>
                  <Badge variant="secondary">
                    {Math.round((themeAnalysis.summary?.avgConfidence || 0) * 100)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Detected Themes */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Detected Themes</h4>
              <div className="space-y-2">
                {(themeAnalysis.themes || []).map(theme => (
                  <motion.div
                    key={theme.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedTheme?.id === theme.id 
                        ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950' 
                        : 'border-border hover:border-input'
                    }`}
                    onClick={() => handleThemeSelect(theme)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-sm flex-1">
                        {theme.name || 'Unnamed Theme'}
                      </h5>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getThemeTypeColor(theme.type)}`}
                      >
                        {getThemeTypeIcon(theme.type)}
                        {theme.type || 'unknown'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {theme.description || 'No description available'}
                    </p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{(theme.insightsCount || 0)} insights</span>
                      <span>{Math.round((theme.confidence || 0) * 100)}% confidence</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {getValidRecommendations(recommendations).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Recommendations</h4>
                <div className="space-y-2">
                  {getValidRecommendations(recommendations).map((rec, index) => (
                    <Card key={index} className="border-orange-200 dark:border-orange-800">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2 mb-2">
                          {rec.type === 'merge' && <Merge size={14} className="text-orange-600 mt-0.5" />}
                          {rec.type === 'split' && <Split size={14} className="text-orange-600 mt-0.5" />}
                          {rec.type === 'reorganize' && <Users size={14} className="text-orange-600 mt-0.5" />}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm capitalize">
                                {formatRecommendationType(rec.type)}
                              </span>
                              <Badge variant="outline" className={
                                rec.expectedImpact === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                rec.expectedImpact === 'medium' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                                'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              }>
                                {rec.expectedImpact} impact
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{rec.reason}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2 text-xs"
                          onClick={() => handleApplyRecommendation(rec)}
                        >
                          Apply Recommendation
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}