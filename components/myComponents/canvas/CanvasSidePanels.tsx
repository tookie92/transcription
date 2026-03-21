"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AffinityGroup as AffinityGroupType, ActivePanel, DetectedTheme, Insight, ThemeAnalysis, ThemeRecommendation } from "@/types";
import { ThemeDiscoveryPanel } from "../ThemeDiscoveryPanel";
import { AnalyticsDashboard } from "../AnalyticsDashboard";
import { PersonaGenerator } from "../PersonaGenerator";
import { ExportPanel } from "../ExportPanel";
import { Id } from "@/convex/_generated/dataModel";

interface CanvasSidePanelsProps {
  isPresentMode: boolean;
  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;

  groups: AffinityGroupType[];
  insights: Insight[];
  projectId: string;
  projectInfo?: { name: string; description?: string };
  mapId: string;
  userId?: string;
  userName?: string;

  selectedTheme: DetectedTheme | null;
  setSelectedTheme: (theme: DetectedTheme) => void;
  onApplyRecommendation: (recommendation: ThemeRecommendation) => void;
  onGroupsMerge: (groupIds: string[], newTitle: string) => void;
  filteredRecommendations?: ThemeRecommendation[];
  themeAnalysis: ThemeAnalysis | null;
  isThemesAnalyzing: boolean;
  onAnalyzeThemes: () => void;
  onClearThemes: () => void;
}

export function CanvasSidePanels({
  isPresentMode,
  activePanel,
  setActivePanel,
  groups,
  insights,
  projectId,
  projectInfo,
  mapId,
  selectedTheme,
  setSelectedTheme,
  onApplyRecommendation,
  onGroupsMerge,
  filteredRecommendations,
  themeAnalysis,
  isThemesAnalyzing,
  onAnalyzeThemes,
  onClearThemes,
}: CanvasSidePanelsProps) {
  if (isPresentMode) return null;

  return (
    <AnimatePresence>
      {activePanel === "themeDiscovery" && (
        <motion.div
          initial={{ x: 600, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 600, opacity: 0 }}
          className="w-80 bg-card border-l border-border flex flex-col shrink-0 z-30 h-full"
        >
          <ThemeDiscoveryPanel
            groups={groups}
            insights={insights}
            projectContext={
              projectInfo ? `PROJECT: ${projectInfo.name}` : undefined
            }
            onThemeSelect={setSelectedTheme}
            onApplyRecommendation={onApplyRecommendation}
            onGroupsMerge={onGroupsMerge}
            filteredRecommendations={filteredRecommendations}
            themeAnalysis={themeAnalysis}
            isAnalyzing={isThemesAnalyzing}
            onAnalyze={onAnalyzeThemes}
            onClear={onClearThemes}
          />
        </motion.div>
      )}

      {activePanel === "analytics" && (
        <motion.div
          initial={{ x: 600, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 600, opacity: 0 }}
          className="w-[600px] bg-card border-l border-border flex flex-col shrink-0 z-30 h-full"
        >
          <AnalyticsDashboard
            groups={groups}
            insights={insights}
            projectName={`Project: ${projectInfo?.name}`}
            onClose={() => setActivePanel(null)}
          />
        </motion.div>
      )}

      {activePanel === "persona" && (
        <motion.div
          initial={{ x: 600, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 600, opacity: 0 }}
          className="w-[800px] bg-card border-l border-border flex flex-col shrink-0 z-30 h-full"
        >
          <PersonaGenerator
            projectId={projectId}
            mapId={mapId}
            groups={groups}
            insights={insights}
            projectContext={
              projectInfo ? `PROJECT: ${projectInfo.name}` : undefined
            }
          />
        </motion.div>
      )}

      {activePanel === "export" && (
        <motion.div
          initial={{ x: 600, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 600, opacity: 0 }}
          className="w-80 bg-card border-l border-border flex flex-col shrink-0 z-30 h-full"
        >
          <ExportPanel
            mapId={mapId}
            projectId={projectId}
            onClose={() => setActivePanel(null)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
