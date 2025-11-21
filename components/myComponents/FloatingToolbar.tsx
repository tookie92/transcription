// components/FloatingToolbar.tsx - VERSION CORRIGÉE

"use client";

import { useState } from "react";
import { 
  Users, 
  Vote, 
  BarChart3, 
  Sparkles, 
  Download, 
  Upload, 
  Presentation,
  ActivityIcon,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeAnalysis, ConvexActivityLog } from "@/types";

interface FloatingToolbarProps {
  // Stats
  stats: {
    totalInsights: number;
    groupCount: number;
    completion: number;
  };
  
  // États
  workspaceMode: 'grouping' | 'voting';
  setWorkspaceMode: (mode: 'grouping' | 'voting') => void;
  activePanel: 'voting' | 'analytics' | null;
  setActivePanel: (panel: 'voting' | 'analytics' | null) => void;
  showThemeDiscovery: boolean;
  setShowThemeDiscovery: (show: boolean) => void;
  showExportPanel: boolean;
  setShowExportPanel: (show: boolean) => void;
  showImportModal: boolean;
  setShowImportModal: (show: boolean) => void;
  showActivityPanel: boolean;
  setShowActivityPanel: (show: boolean) => void;
  
  // Actions
  onEnterPresentation: () => void;
  onAnalyzeThemes: () => void;
  
  // Données
  themeAnalysis: ThemeAnalysis | null | undefined; // 🎯 CORRIGÉ : ACCEPTE NULL ET UNDEFINED
  isThemesAnalyzing: boolean;
  activities?: ConvexActivityLog[];
}

export function FloatingToolbar({
  stats,
  workspaceMode,
  setWorkspaceMode,
  activePanel,
  setActivePanel,
  showThemeDiscovery,
  setShowThemeDiscovery,
  showExportPanel,
  setShowExportPanel,
  showImportModal,
  setShowImportModal,
  showActivityPanel,
  setShowActivityPanel,
  onEnterPresentation,
  onAnalyzeThemes,
  themeAnalysis,
  isThemesAnalyzing,
  activities
}: FloatingToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <TooltipProvider>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        {/* BARRE PRINCIPALE */}
        <div className={`
          bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full shadow-xl
          transition-all duration-300 ease-in-out
          ${isExpanded ? 'px-6 py-3' : 'px-4 py-3'}
        `}>
          <div className="flex items-center gap-2">
            {/* MODES DE TRAVAIL */}
            <ToggleGroup 
              type="single" 
              value={workspaceMode}
              onValueChange={(value: string) => {
                if (value === 'grouping' || value === 'voting') {
                  setWorkspaceMode(value);
                }
              }}
              className="flex items-center"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem value="grouping" className="rounded-full w-10 h-10">
                    <Users size={18} />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Grouping Mode</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem value="voting" className="rounded-full w-10 h-10">
                    <Vote size={18} />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Dot Voting Mode</p>
                </TooltipContent>
              </Tooltip>
            </ToggleGroup>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            {/* OUTILS PRINCIPAUX */}
            <div className="flex items-center gap-1">
              {/* DOT VOTING */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={activePanel === 'voting' ? "default" : "ghost"}
                    size="icon"
                    className="rounded-full w-10 h-10"
                    onClick={() => setActivePanel(activePanel === 'voting' ? null : 'voting')}
                  >
                    <Vote size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Dot Voting</p>
                </TooltipContent>
              </Tooltip>

              {/* ANALYTICS */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={activePanel === 'analytics' ? "default" : "ghost"}
                    size="icon"
                    className="rounded-full w-10 h-10"
                    onClick={() => setActivePanel(activePanel === 'analytics' ? null : 'analytics')}
                  >
                    <BarChart3 size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Analytics</p>
                </TooltipContent>
              </Tooltip>

              {/* THEME DISCOVERY */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showThemeDiscovery ? "default" : "ghost"}
                    size="icon"
                    className="rounded-full w-10 h-10 relative"
                    onClick={() => {
                      if (showThemeDiscovery) {
                        setShowThemeDiscovery(false);
                      } else {
                        setShowThemeDiscovery(true);
                        onAnalyzeThemes();
                      }
                    }}
                    disabled={stats.groupCount < 2}
                  >
                    <Sparkles size={18} />
                    {themeAnalysis && !isThemesAnalyzing && (
                      <Badge 
                        variant="secondary" 
                        className="absolute -top-1 -right-1 w-4 h-4 p-0 text-xs bg-green-100 text-green-800"
                      >
                        {themeAnalysis.themes.length}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Theme Discovery {stats.groupCount < 2 && "(Need 2+ groups)"}</p>
                </TooltipContent>
              </Tooltip>

              {/* ACTIVITY */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showActivityPanel ? "default" : "ghost"}
                    size="icon"
                    className="rounded-full w-10 h-10 relative"
                    onClick={() => setShowActivityPanel(!showActivityPanel)}
                  >
                    <ActivityIcon size={18} />
                    {activities && activities.length > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="absolute -top-1 -right-1 w-4 h-4 p-0 text-xs bg-blue-100 text-blue-800"
                      >
                        {activities.length > 99 ? '99+' : activities.length}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Activity Feed</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* BOUTON EXPAND POUR PLUS D'OPTIONS */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-8 h-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <MoreHorizontal size={16} />
            </Button>

            {/* OPTIONS ÉTENDUES */}
            {isExpanded && (
              <>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                
                <div className="flex items-center gap-1">
                  {/* EXPORT */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={showExportPanel ? "default" : "ghost"}
                        size="icon"
                        className="rounded-full w-8 h-8"
                        onClick={() => setShowExportPanel(!showExportPanel)}
                      >
                        <Download size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Export</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* IMPORT */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full w-8 h-8"
                        onClick={() => setShowImportModal(true)}
                      >
                        <Upload size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Import</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* PRESENTATION */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full w-8 h-8"
                        onClick={onEnterPresentation}
                      >
                        <Presentation size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Presentation Mode</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </>
            )}
          </div>
        </div>

        {/* INDICATEURS DE STATS (EN DESSOUS) */}
        <div className="flex justify-center mt-2 gap-3">
          <Badge variant="secondary" className="text-xs">
            {stats.groupCount} groups
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {stats.totalInsights} insights
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {stats.completion}% complete
          </Badge>
        </div>
      </div>
    </TooltipProvider>
  );
}