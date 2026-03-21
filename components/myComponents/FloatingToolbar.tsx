"use client";

import { useState } from "react";
import { 
  Users, 
  Vote, 
  BarChart3, 
  Sparkles, 
  Download, 
  Presentation,
  MoreHorizontal,
  User,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeAnalysis, ActivePanel, WorkspaceMode } from "@/types";
import { motion } from "framer-motion";

interface FloatingToolbarProps {
  stats: {
    totalInsights: number;
    groupCount: number;
    completion: number;
  };
  
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;
  
  onEnterPresentation: () => void;
  onAnalyzeThemes: () => void;
  
  themeAnalysis: ThemeAnalysis | null | undefined;
  isThemesAnalyzing: boolean;

  hasActiveVotingSession?: boolean;
  isVotingPhase?: boolean;
}

export function FloatingToolbar({
  stats,
  workspaceMode,
  setWorkspaceMode,
  activePanel,
  setActivePanel,
  onEnterPresentation,
  onAnalyzeThemes,
  themeAnalysis,
  isThemesAnalyzing,
  hasActiveVotingSession = false,
  isVotingPhase = false,
}: FloatingToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40"
      >
        {/* BARRE PRINCIPALE */}
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-xl px-4 py-3">
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
                  <ToggleGroupItem 
                    value="voting" 
                    className="rounded-full w-10 h-10"
                    disabled={!hasActiveVotingSession || !isVotingPhase}
                  >
                    <Vote size={18} />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{!hasActiveVotingSession ? "No voting session" : !isVotingPhase ? "Voting ended" : "Dot Voting"}</p>
                </TooltipContent>
              </Tooltip>
            </ToggleGroup>

            <div className="w-px h-6 bg-border mx-1" />

            {/* OUTILS PRINCIPAUX */}
            <div className="flex items-center gap-1">
              {/* THEME DISCOVERY */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={activePanel === 'themeDiscovery' ? "default" : "ghost"}
                    size="icon"
                    className="rounded-full w-10 h-10"
                    onClick={() => {
                      if (activePanel === 'themeDiscovery') {
                        setActivePanel(null);
                      } else {
                        setActivePanel('themeDiscovery');
                        onAnalyzeThemes();
                      }  
                    }}
                    disabled={stats.groupCount < 2}
                  >
                    <Sparkles size={18} />
                    {themeAnalysis && !isThemesAnalyzing && (
                      <Badge 
                        variant="secondary" 
                        className="absolute -top-1 -right-1 w-4 h-4 p-0 text-xs"
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

              {/* PERSONA */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={activePanel === 'persona' ? "default" : "ghost"}
                    size="icon"
                    className="rounded-full w-10 h-10"
                    onClick={() => setActivePanel(activePanel === 'persona' ? null : 'persona')}
                  >
                    <User size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Persona Generator</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* BOUTON EXPAND */}
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
                <div className="w-px h-6 bg-border mx-1" />
                
                <div className="flex items-center gap-1">
                  {/* EXPORT */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activePanel === 'export' ? "default" : "ghost"}
                        size="icon"
                        className="rounded-full w-10 h-10"
                        onClick={() => setActivePanel(activePanel === 'export' ? null : 'export')}
                      >
                        <Download size={18} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Export</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* PRESENTATION */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full w-10 h-10"
                        onClick={onEnterPresentation}
                      >
                        <Presentation size={18} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Present</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </>
            )}
          </div>
        </div>

        {/* INDICATEURS DE STATS */}
        <div className="flex justify-center mt-2 gap-3">
          <Badge variant="secondary" className="text-xs">
            {stats.groupCount} clusters
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {stats.totalInsights} insights
          </Badge>
        </div>
      </motion.div>
    </TooltipProvider>
  );
}