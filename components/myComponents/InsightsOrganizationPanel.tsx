// components/InsightsOrganizationPanel.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, CheckCircle, AlertTriangle, Lightbulb, Users, Sparkles, Plus, Trash } from "lucide-react";
import { AffinityGroup, ConvexProject, Insight, Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GroupSuggestion, useGroupSuggestions } from "@/hooks/useGroupSuggestions";
import { toast } from "sonner";
import { AISuggestionsPanel } from "./AISuggestionsPanel";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";

interface ProjectInfo {
  name: string;
  description?: string;
}

// Dans InsightsOrganizationPanel.tsx - METTRE À JOUR L'INTERFACE PENDING
interface PendingInsights {
  groupTitle: string;
  insightIds: string[];
  tempGroupId: string;
  createdAt: number;
}

interface InsightsOrganizationPanelProps {
  groups: AffinityGroup[];
  insights: Insight[];
  projectInfo?: ProjectInfo,
  onGroupCreate: (position: { x: number; y: number }) => void;
  onInsightDrop: (insightId: string, groupId: string) => void;
  onManualInsightCreate: (text: string, type: Insight['type']) => void;
  onGroupTitleUpdate?: (groupId: string, title: string) => void; // 🆕 OPTIONNEL
 
}



// 🆕 INTERFACE PENDING INSIGHTS
interface PendingInsights {
  groupTitle: string;
  insightIds: string[];
}

export function InsightsOrganizationPanel({
  groups,
  insights,
  onGroupCreate,
  onInsightDrop,
  onManualInsightCreate,
  onGroupTitleUpdate,
  projectInfo
}: InsightsOrganizationPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<'all' | 'ready' | 'problematic'>('all');
  const [showAddInsight, setShowAddInsight] = useState(false);
  const [newInsightText, setNewInsightText] = useState("");
  const [newInsightType, setNewInsightType] = useState<Insight['type']>('insight');

    const pendingInsightsRef = useRef<PendingInsights | null>(null);

 // 🆕 AJOUTER LES SUGGESTIONS IA
  const { suggestions, isLoading, generateSuggestions, clearSuggestions } = useGroupSuggestions();


    // 🆕 BOUTON POUR GÉNÉRER LES SUGGESTIONS
  const handleGenerateSuggestions = () => {
    const availableInsights = insights.filter(insight => {
      const usedInsightIds = new Set(groups.flatMap(group => group.insightIds));
      return !usedInsightIds.has(insight.id);
    });
    
    if (availableInsights.length === 0) {
      toast.info('No ungrouped insights to analyze');
      return;
    }

    // 🎯 CONTEXTE AVEC projectInfo
    const projectContext = projectInfo ? `
PROJECT NAME: ${projectInfo.name}
PROJECT DESCRIPTION: ${projectInfo.description || 'No description available'}
    `.trim() : 'General user research project';

    console.log('📋 Project context for AI:', projectContext);

    generateSuggestions(availableInsights, groups, projectContext);
  };

 // Dans InsightsOrganizationPanel.tsx - REMPLACER handleApplySuggestion
const handleApplySuggestion = (suggestion: GroupSuggestion) => {
  if (suggestion.action === 'create_new' && suggestion.newGroupTitle) {
    
    // 🎯 VÉRIFIER QUE LES INSIGHT IDS SONT VALIDES
    const validInsightIds = suggestion.insightIds.filter(id => {
      if (!id || typeof id !== 'string') {
        console.warn('❌ Invalid insight ID:', id);
        return false;
      }
      return true;
    });
    
    if (validInsightIds.length === 0) {
      toast.error('No valid insights to add to group');
      return;
    }
    
    console.log('✅ Valid insight IDs:', validInsightIds);
    
    const position = {
      x: Math.random() * 400 + 100,
      y: Math.random() * 400 + 100
    };
    
    pendingInsightsRef.current = {
      groupTitle: suggestion.newGroupTitle,
      insightIds: validInsightIds, // 🎯 UTILISER SEULEMENT LES VALIDES
      tempGroupId: `temp-${Date.now()}`,
      createdAt: Date.now()
    };
    
    onGroupCreate(position);
    toast.info(`Creating group "${suggestion.newGroupTitle}"...`);
  }
  
  clearSuggestions();
};

  // 🎯 CALCUL DES CATÉGORIES
  const { readyInsights, problematicInsights, stats } = useMemo(() => {
    const availableInsights = insights.filter(insight => {
      const usedInsightIds = new Set(groups.flatMap(group => group.insightIds));
      return !usedInsightIds.has(insight.id);
    });

    // Filtrage par recherche
    const filtered = availableInsights.filter(insight =>
      insight.text.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Catégorisation intelligente
    const ready = [];
    const problematic = [];

    for (const insight of filtered) {
      const wordCount = insight.text.split(' ').length;
      const isAtypicalLength = wordCount > 50 || wordCount < 3;
      
      const technicalTerms = ['API', 'backend', 'framework', 'database', 'integration', 'component', 'module'];
      const hasTechnicalTerms = technicalTerms.some(term => 
        insight.text.toLowerCase().includes(term.toLowerCase())
      );

      const isComplex = insight.text.includes('?') || insight.text.includes(' but ') || insight.text.includes(' however ');

      if (isAtypicalLength || hasTechnicalTerms || isComplex) {
        problematic.push(insight);
      } else {
        ready.push(insight);
      }
    }

    return {
      readyInsights: ready,
      problematicInsights: problematic,
      stats: {
        total: availableInsights.length,
        ready: ready.length,
        problematic: problematic.length,
        completionRate: insights.length > 0 ? 
          ((insights.length - availableInsights.length) / insights.length) * 100 : 0
      }
    };
  }, [groups, insights, searchTerm]);


  // Dans InsightsOrganizationPanel.tsx - AJOUTER APRÈS LES useMemo
// 🎯 VERSION SYNCHRONE SANS ANY
// Dans InsightsOrganizationPanel.tsx - METTRE À JOUR LE useEffect
useEffect(() => {
  const processPendingInsights = async () => {
    if (pendingInsightsRef.current && groups.length > 0) {
      const pending = pendingInsightsRef.current;
      
      const newGroup = groups.find(group => 
        group.title === "New Theme" || 
        group.title === "New Group"
      );
      
      if (newGroup) {
        console.log("🎯 Adding insights to group:", newGroup.id);
        
        try {
          // 🎯 AJOUTER CHAQUE INSIGHT AVEC GESTION D'ERREUR
          let successCount = 0;
          
          for (const insightId of pending.insightIds) {
            try {
              await new Promise(resolve => setTimeout(resolve, 50));
              onInsightDrop(insightId, newGroup.id);
              successCount++;
            } catch (error) {
              console.error(`❌ Failed to add insight ${insightId}:`, error);
            }
          }
          
          // 🎯 RENOMMER LE GROUPE
          if (onGroupTitleUpdate) {
            onGroupTitleUpdate(newGroup.id, pending.groupTitle);
          }
          
          if (successCount > 0) {
            toast.success(`Created "${pending.groupTitle}" with ${successCount} insights`);
          } else {
            toast.error('Failed to add any insights to the group');
          }
          
          pendingInsightsRef.current = null;
          
        } catch (error) {
          console.error('❌ Failed to process insights:', error);
          toast.error('Failed to add insights to new group');
          pendingInsightsRef.current = null;
        }
        
      } else if (Date.now() - pending.createdAt > 10000) {
        console.warn('⏰ Timeout waiting for group creation');
        toast.error('Group creation timeout');
        pendingInsightsRef.current = null;
      }
    }
  };

  processPendingInsights();
}, [groups, onInsightDrop, onGroupTitleUpdate]);



  // 🎯 TROUVER UN GROUPE SUGGÉRÉ
  const findSuggestedGroup = (insight: Insight) => {
    return groups.find(group => 
      group.insightIds.some(insightId => {
        const existingInsight = insights.find(i => i.id === insightId);
        return existingInsight && 
               existingInsight.type === insight.type &&
               calculateSimilarity(existingInsight.text, insight.text) > 0.2;
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

  // 🎯 CRÉATION RAPIDE DE GROUPE
  const handleCreateGroupForInsight = (insight: Insight) => {
    const position = {
      x: Math.random() * 300 + 100,
      y: Math.random() * 300 + 100
    };
    onGroupCreate(position);
  };

  // 🎯 COMPOSANT CARTE D'INSIGHT
  const InsightCard = ({ insight, isProblematic = false , onDelete }: { insight: Insight; isProblematic?: boolean; onDelete?: () => void }) => {
    const suggestedGroup = findSuggestedGroup(insight);

    return (
      <motion.div
        layout
        draggable
        onDragStart={(e) => {
        const data = e as unknown as React.DragEvent;
        data.dataTransfer.effectAllowed = 'move';
        data.dataTransfer.setData('text/plain', insight.id);
        //   e.dataTransfer.effectAllowed = 'move';
        //   e.dataTransfer.setData('text/plain', insight.id);
        }}
        className={`p-3 rounded-lg border cursor-move transition-all group relative ${
          isProblematic 
            ? 'bg-orange-50 border-orange-200 hover:border-orange-300' 
            : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
        }`}
      >
        {/* EN-TÊTE */}
        <div className="flex items-start justify-between mb-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            insight.type === 'pain-point' ? 'bg-red-100 text-red-700' :
            insight.type === 'quote' ? 'bg-blue-100 text-blue-700' :
            insight.type === 'insight' ? 'bg-purple-100 text-purple-700' :
            'bg-green-100 text-green-700'
          }`}>
            {insight.type}
          </span>
          
          <div className="flex items-center gap-1">
            {suggestedGroup && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs bg-blue-50">
                      <Sparkles size={10} className="mr-1" />
                      Match
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Similar to {`"${suggestedGroup.title}"`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {insight.source === 'manual' && (
              <div className="flex gap-2 items-center">
                <span className="text-xs text-gray-400">Manual</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-4 h-4 ml-1"
                  onClick={onDelete}
                >
                  <Trash size={14} />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* TEXTE */}
        <p className="text-sm text-gray-700 leading-snug mb-3">
          {insight.text}
        </p>

        {/* ACTIONS */}
        {isProblematic && (
          <div className="flex gap-2">
            {suggestedGroup ? (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 flex-1"
                onClick={() => onInsightDrop(insight.id, suggestedGroup.id)}
              >
                <Users size={12} className="mr-1" />
                Add to {suggestedGroup.title.length > 12 ? 
                  suggestedGroup.title.substring(0, 12) + '...' : suggestedGroup.title}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 flex-1"
                onClick={() => handleCreateGroupForInsight(insight)}
              >
                <Lightbulb size={12} className="mr-1" />
                Create Group
              </Button>
            )}
          </div>
        )}

        {!isProblematic && (
          <p className="text-xs text-gray-400 mt-1">Drag to group</p>
        )}
      </motion.div>
    );
  };

    const deleteInsight = useMutation(api.insights.deleteInsight);
  
const handleDeleteInsight = async (insightId: string) => {
  if (!insightId) return;
  
  try {
    await deleteInsight({ insightId: insightId as Id<"insights"> });
    toast.success("Insight deleted");
  } catch (error) {
    console.error("Failed to delete insight:", error);
    toast.error("Failed to delete insight");
  }
};
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* HEADER UNIFIÉ */}
      <div className="p-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">Insights to Organize</h3>
            <p className="text-sm text-gray-600">Drag insights to create groups</p>
          </div>
          <div className="flex gap-1">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {stats.total}
            </Badge>
            {stats.problematic > 0 && (
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                {stats.problematic}
              </Badge>
            )}

              {/* 🆕 BOUTON IA */}
                <TooltipProvider>
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                        onClick={handleGenerateSuggestions}
                        disabled={stats.total === 0 || isLoading}
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        >
                        <Sparkles size={14} className={isLoading ? "animate-spin" : ""} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Get AI grouping suggestions</p>
                    </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
          </div>
        </div>

        {/* BARRE DE RECHERCHE */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search insights..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* FILTRES RAPIDES ET BOUTON ADD */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex gap-1 flex-1">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('all')}
              className="text-xs h-7 flex-1"
            >
              All
            </Button>
            <Button
              variant={activeFilter === 'ready' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('ready')}
              className="text-xs h-7 flex-1"
            >
              <CheckCircle size={12} className="mr-1" />
              Ready
            </Button>
            {stats.problematic > 0 && (
              <Button
                variant={activeFilter === 'problematic' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('problematic')}
                className="text-xs h-7 flex-1"
              >
                <AlertTriangle size={12} className="mr-1" />
                Review
              </Button>
            )}
          </div>
          
          <Button
            onClick={() => setShowAddInsight(!showAddInsight)}
            size="sm"
            className="h-7 w-7 p-0"
          >
            <Plus size={14} />
          </Button>
        </div>

        {/* PROGRESS BAR */}
        <div className="mb-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{stats.completionRate.toFixed(0)}% organized</span>
            <span>{stats.total} remaining</span>
          </div>
        </div>

        {/* FORMULAIRE AJOUT D'INSIGHT */}
        {showAddInsight && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <div className="grid grid-cols-3 gap-1">
              {[
                { value: 'pain-point', label: 'Pain', color: 'bg-red-100 text-red-700' },
                { value: 'quote', label: 'Quote', color: 'bg-blue-100 text-blue-700' },
                { value: 'insight', label: 'Insight', color: 'bg-purple-100 text-purple-700' },
                { value: 'follow-up', label: 'Follow-up', color: 'bg-green-100 text-green-700' },
                { value: 'custom', label: 'Custom', color: 'bg-gray-100 text-gray-700' },
              ].map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setNewInsightType(value as Insight['type'])}
                  className={`p-2 rounded text-xs font-medium transition-colors ${
                    newInsightType === value
                      ? `${color} border-2 border-current`
                      : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            
            <textarea
              value={newInsightText}
              onChange={(e) => setNewInsightText(e.target.value)}
              placeholder="Type your insight..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (newInsightText.trim()) {
                    onManualInsightCreate(newInsightText.trim(), newInsightType);
                    setNewInsightText("");
                    setNewInsightType('insight');
                    setShowAddInsight(false);
                  }
                }}
                disabled={!newInsightText.trim()}
                className="flex-1 bg-green-500 text-white py-1.5 px-3 rounded text-sm font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Add Insight
              </button>
              <button
                onClick={() => {
                  setShowAddInsight(false);
                  setNewInsightText("");
                }}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LISTE UNIFIÉE DES INSIGHTS */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-4">
          {/* 🆕 SUGGESTIONS IA */}
            <AISuggestionsPanel
                suggestions={suggestions}
                isLoading={isLoading}
                onApplySuggestion={handleApplySuggestion}
                onDismissSuggestion={clearSuggestions}
            />
          
          {/* SECTION "PRÊTS À GROUPER" */}
          {(activeFilter === 'all' || activeFilter === 'ready') && readyInsights.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                <CheckCircle size={16} />
                <span>Ready to group</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {readyInsights.length}
                </Badge>
              </div>
              {readyInsights.map(insight => (
                <InsightCard key={insight.id} insight={insight} onDelete={()=>handleDeleteInsight(insight.id)} />
              ))}
            </div>
          )}

          {/* SECTION "BESOIN D'ATTENTION" */}
          {(activeFilter === 'all' || activeFilter === 'problematic') && problematicInsights.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-orange-700">
                <AlertTriangle size={16} />
                <span>Need attention</span>
                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                  {problematicInsights.length}
                </Badge>
              </div>
              {problematicInsights.map(insight => (
                <InsightCard key={insight.id} insight={insight} isProblematic={true} />
              ))}
            </div>
          )}

          {/* ÉTAT VIDE */}
          {stats.total === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-3xl mb-2">🎉</div>
              <p className="font-medium">All insights organized!</p>
              <p className="text-sm mt-1">Great job on your affinity mapping</p>
            </div>
          )}

          {/* AUCUN RÉSULTAT DE RECHERCHE */}
          {stats.total > 0 && readyInsights.length === 0 && problematicInsights.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Search size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="font-medium">No insights found</p>
              <p className="text-sm mt-1">Try changing your search terms</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}