// components/UngroupedInsightsPanel.tsx
"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Lightbulb, Users, Sparkles, Clock } from "lucide-react";
import { AffinityGroup, Insight } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UngroupedInsightsPanelProps {
  groups: AffinityGroup[];
  insights: Insight[];
  availableInsights: Insight[];
  onGroupCreate: (position: { x: number; y: number }) => void;
  onInsightDrop: (insightId: string, groupId: string) => void;
}

export function UngroupedInsightsPanel({
  groups,
  insights,
  availableInsights,
  onGroupCreate,
  onInsightDrop,
}: UngroupedInsightsPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  // 🎯 DÉTECTION INTELLIGENTE DES INSIGHTS DIFFICILES
  const { problematicInsights, stats } = useMemo(() => {
    const totalInsights = insights.length;
    const groupedInsights = groups.reduce((sum, group) => sum + group.insightIds.length, 0);
    
    // Insights disponibles mais "problématiques"
    const problematic = availableInsights.filter(insight => {
      // Critère 1: Insights très longs ou très courts
      const wordCount = insight.text.split(' ').length;
      const isAtypicalLength = wordCount > 50 || wordCount < 3;
      
      // Critère 2: Insights avec vocabulaire technique/spécifique
      const technicalTerms = ['API', 'backend', 'framework', 'database', 'integration'];
      const hasTechnicalTerms = technicalTerms.some(term => 
        insight.text.toLowerCase().includes(term.toLowerCase())
      );
      
      // Critère 3: Insights qui ont été déplacés plusieurs fois (à tracker plus tard)
      const hasBeenMoved = false; // À implémenter avec l'historique
      
      return isAtypicalLength || hasTechnicalTerms || hasBeenMoved;
    });

    return {
      problematicInsights: problematic.slice(0, 10), // Limiter à 10 pour éviter la surcharge
      stats: {
        total: totalInsights,
        grouped: groupedInsights,
        ungrouped: availableInsights.length,
        problematic: problematic.length,
        completionRate: totalInsights > 0 ? (groupedInsights / totalInsights) * 100 : 0
      }
    };
  }, [groups, insights, availableInsights]);

  // 🎯 CRÉATION RAPIDE D'UN GROUPE POUR INSIGHT DIFFICILE
  const handleCreateGroupForInsight = (insight: Insight) => {
    // Position aléatoire près du centre pour visibilité
    const position = {
      x: Math.random() * 200 + 100,
      y: Math.random() * 200 + 100
    };
    
    onGroupCreate(position);
    // Note: L'utilisateur devra ensuite drag & drop l'insight manuellement
    // On pourrait automatiser ça avec une mutation spéciale
  };

  // 🎯 SUGGESTION DE GROUPE EXISTANT (simplifiée)
  const findSuggestedGroup = (insight: Insight) => {
    return groups.find(group => 
      group.insightIds.some(insightId => {
        const existingInsight = insights.find(i => i.id === insightId);
        return existingInsight && 
               existingInsight.type === insight.type &&
               calculateSimilarity(existingInsight.text, insight.text) > 0.3;
      })
    );
  };

  // 🎯 CALCUL DE SIMILARITÉ SIMPLIFIÉ
  const calculateSimilarity = (text1: string, text2: string): number => {
    const words1 = new Set(text1.toLowerCase().split(/\W+/));
    const words2 = new Set(text2.toLowerCase().split(/\W+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  };

  if (availableInsights.length === 0) {
    return null; // Rien à afficher si tout est groupé
  }

  const hasProblematicInsights = problematicInsights.length > 0;

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* HEADER CLICKABLE */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              hasProblematicInsights ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
            }`}>
              {hasProblematicInsights ? <AlertTriangle size={16} /> : <Clock size={16} />}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                Ungrouped Insights
                <Badge variant={hasProblematicInsights ? "destructive" : "secondary"}>
                  {availableInsights.length}
                </Badge>
                {hasProblematicInsights && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    {problematicInsights.length} need attention
                  </Badge>
                )}
              </h3>
              <p className="text-sm text-gray-600">
                {stats.completionRate.toFixed(0)}% organized • {stats.ungrouped} remaining
              </p>
            </div>
          </div>
          <div className={`transform transition-transform ${showDetails ? 'rotate-180' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="m6 9 6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* CONTENU DÉTAILLÉ */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-gray-100 space-y-4 max-h-80 overflow-y-auto">
              
              {/* INSIGHTS PROBLÉMATIQUES */}
              {hasProblematicInsights && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-orange-500" />
                    <span className="text-sm font-medium text-orange-700">Need Attention</span>
                    <Badge variant="outline" className="text-xs">
                      {problematicInsights.length}
                    </Badge>
                  </div>
                  
                  {problematicInsights.map(insight => {
                    const suggestedGroup = findSuggestedGroup(insight);
                    
                    return (
                      <div
                        key={insight.id}
                        className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            insight.type === 'pain-point' ? 'bg-red-100 text-red-700' :
                            insight.type === 'quote' ? 'bg-blue-100 text-blue-700' :
                            insight.type === 'insight' ? 'bg-purple-100 text-purple-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {insight.type}
                          </span>
                          {suggestedGroup && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs bg-blue-50">
                                    <Sparkles size={10} className="mr-1" />
                                    Suggested
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Similar to{`"{suggestedGroup.title}"`}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        
                        <p className="text-gray-700 mb-3 leading-snug">
                          {insight.text}
                        </p>
                        
                        <div className="flex gap-2">
                          {suggestedGroup ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => onInsightDrop(insight.id, suggestedGroup.id)}
                            >
                              <Users size={12} className="mr-1" />
                              Add to {suggestedGroup.title}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => handleCreateGroupForInsight(insight)}
                            >
                              <Lightbulb size={12} className="mr-1" />
                              Create New Group
                            </Button>
                          )}
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    // À implémenter: Marquer comme "reviewed"
                                  }}
                                >
                                  Ignore
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Hide this insight for now</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TOUS LES INSIGHTS NON-GROUPÉS (liste compacte) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">All Ungrouped Insights</span>
                </div>
                
                {availableInsights.slice(0, 5).map(insight => (
                  <div
                    key={insight.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', insight.id);
                    }}
                    className="p-2 bg-gray-50 border border-gray-200 rounded text-sm cursor-move hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${
                        insight.type === 'pain-point' ? 'bg-red-100 text-red-700' :
                        insight.type === 'quote' ? 'bg-blue-100 text-blue-700' :
                        insight.type === 'insight' ? 'bg-purple-100 text-purple-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {insight.type.charAt(0)}
                      </span>
                      <p className="text-gray-700 flex-1 text-sm leading-snug line-clamp-2">
                        {insight.text}
                      </p>
                    </div>
                  </div>
                ))}
                
                {availableInsights.length > 5 && (
                  <div className="text-center py-2">
                    <span className="text-xs text-gray-500">
                      +{availableInsights.length - 5} more insights to organize
                    </span>
                  </div>
                )}
              </div>

              {/* RECOMMANDATIONS */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={14} className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Tips</span>
                </div>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Drag insights to existing groups</li>
                  <li>• Double-click canvas to create new groups</li>
                  <li>• Use {`'`}N{`'`} key for quick group creation</li>
                  {hasProblematicInsights && (
                    <li>• Review highlighted insights for patterns</li>
                  )}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}