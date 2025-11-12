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
import { useThemeDetection } from "@/hooks/useThemeDetection";
import { toast } from "sonner";

interface ThemeDiscoveryPanelProps {
  groups: AffinityGroup[];
  insights: Insight[];
  projectContext?: string;
  onThemeSelect?: (theme: DetectedTheme) => void;
  onApplyRecommendation?: (recommendation: ThemeRecommendation) => void;
  onGroupsMerge?: (groupIds: string[], newTitle: string) => void;
  onGroupSplit?: (groupId: string, newGroups: { title: string; insightIds: string[] }[]) => void;
}

export function ThemeDiscoveryPanel({
  groups,
  insights,
  projectContext,
  onThemeSelect,
  onApplyRecommendation,
  onGroupsMerge,
  onGroupSplit
}: ThemeDiscoveryPanelProps) {
  const { isAnalyzing, themeAnalysis, detectThemes, clearThemes } = useThemeDetection();
  const [selectedTheme, setSelectedTheme] = useState<DetectedTheme | null>(null);

  const handleAnalyze = async () => {
    const analysis = await detectThemes(groups, insights, projectContext);
    if (analysis && analysis.themes.length > 0) {
      setSelectedTheme(analysis.themes[0]);
    }
  };

  const handleThemeSelect = (theme: DetectedTheme) => {
    setSelectedTheme(theme);
    onThemeSelect?.(theme);
  };



  const handleApplyRecommendation = (recommendation: ThemeRecommendation) => {
    onApplyRecommendation?.(recommendation);
    
    // Actions automatiques basées sur le type de recommendation
    switch (recommendation.type) {
      case 'merge':
        if (onGroupsMerge) {
          const newTitle = recommendation.reason.includes('suggested name') 
            ? recommendation.reason.split('suggested name: ')[1]?.split('.')[0] 
            : `Merged Theme`;
          onGroupsMerge(recommendation.groups, newTitle);
        }
        break;
      case 'split':
        toast.info('Please manually split the group based on the recommendation');
        break;
      case 'create_parent':
        toast.info('Consider creating a parent group for these related themes');
        break;
      case 'reorganize':
        toast.info('Consider reorganizing these groups for better thematic clarity');
        break;
    }
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
      case 'hierarchical': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'related': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'contradictory': return 'bg-red-100 text-red-800 border-red-200';
      case 'complementary': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles size={18} />
              Theme Discovery
            </h3>
            <p className="text-sm text-gray-600">AI-powered pattern detection</p>
          </div>
          
          {themeAnalysis && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearThemes}
              className="h-7 w-7 p-0"
            >
              <X size={14} />
            </Button>
          )}
        </div>

        {/* 🆕 BOUTON UNIQUE DANS LE HEADER */}
        {!themeAnalysis && (
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || groups.length === 0}
            className="w-full"
          >
            <Sparkles size={16} className="mr-2" />
            {isAnalyzing ? 'Analyzing Patterns...' : 'Discover Themes'}
          </Button>
        )}
      </div>

      {/* Content - 🆕 STRUCTURE CORRIGÉE */}
      <div className="flex-1 overflow-y-auto">
        {!themeAnalysis ? (
          // 🆕 ÉTAT INITIAL - INTRODUCTION
          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h4 className="font-bold text-gray-900 text-lg mb-2">
                Discover Hidden Patterns
              </h4>
              <p className="text-gray-600 mb-4">
                AI will analyze your {groups.length} groups to find emergent themes and relationships
              </p>
            </div>

            {/* Exemple concret */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-semibold text-blue-900 mb-2">Example Discovery:</h5>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• {`"User Frustration"`} connects 3 groups about errors</p>
                <p>• {`"Onboarding Journey"`} links 4 sequential groups</p>
                <p>• {`"Feature Requests"`} spans across 5 different groups</p>
              </div>
            </div>

            {/* Bouton d'action principal */}
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || groups.length === 0}
              className="w-full bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              size="lg"
            >
              <Sparkles size={18} className="mr-2" />
              {isAnalyzing ? '🔍 Analyzing...' : '🚀 Discover Themes'}
            </Button>
          </div>
        ) : (
          // 🆕 ÉTAT APRÈS ANALYSE - RÉSULTATS
          <div className="p-4 space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Themes Found</span>
                  <Badge variant="secondary">
                    {themeAnalysis.themes?.length || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Coverage</span>
                  <Badge variant="secondary">
                    {themeAnalysis.summary?.coverage || 0}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Confidence</span>
                  <Badge variant="secondary">
                    {Math.round((themeAnalysis.summary?.avgConfidence || 0) * 100)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Detected Themes */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-900">Detected Themes</h4>
              <div className="space-y-2">
                {(themeAnalysis.themes || []).map(theme => (
                  <motion.div
                    key={theme.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedTheme?.id === theme.id 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleThemeSelect(theme)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-sm text-gray-900 flex-1">
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
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {theme.description || 'No description available'}
                    </p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{(theme.insightsCount || 0)} insights</span>
                      <span>{Math.round((theme.confidence || 0) * 100)}% confidence</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {getValidRecommendations(themeAnalysis.recommendations).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-900">Recommendations</h4>
                <div className="space-y-2">
                  {getValidRecommendations(themeAnalysis.recommendations).map((rec, index) => (
                    <Card key={index} className="border-orange-200">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2 mb-2">
                          {rec.type === 'merge' && <Merge size={14} className="text-orange-600 mt-0.5" />}
                          {rec.type === 'split' && <Split size={14} className="text-orange-600 mt-0.5" />}
                          {rec.type === 'create_parent' && <TrendingUp size={14} className="text-orange-600 mt-0.5" />}
                          {rec.type === 'reorganize' && <Users size={14} className="text-orange-600 mt-0.5" />}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm text-gray-900 capitalize">
                                {formatRecommendationType(rec.type)}
                              </span>
                              <Badge variant="outline" className={
                                rec.expectedImpact === 'high' ? 'bg-red-100 text-red-700' :
                                rec.expectedImpact === 'medium' ? 'bg-orange-100 text-orange-700' :
                                'bg-blue-100 text-blue-700'
                              }>
                                {rec.expectedImpact} impact
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600">{rec.reason}</p>
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