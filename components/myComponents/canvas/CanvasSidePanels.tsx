"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AffinityGroup as AffinityGroupType, ActivePanel, DetectedTheme, Insight, ThemeAnalysis, ThemeRecommendation } from "@/types";
import { ThemeDiscoveryPanel } from "../ThemeDiscoveryPanel";
import { AnalyticsDashboard } from "../AnalyticsDashboard";
import { PersonaGenerator } from "../PersonaGenerator";
import { ExportPanel } from "../ExportPanel";
import { AIPanel } from "../figjam/AIPanel";
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

  onCreateGroup?: (insightIds: string[], title: string) => void;
  onAddToGroup?: (insightIds: string[], groupId: string) => void;
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
  onCreateGroup,
  onAddToGroup,
}: CanvasSidePanelsProps) {
  if (isPresentMode) return null;

  return (
    <AnimatePresence>
      {activePanel === "aiAssistant" && onCreateGroup && onAddToGroup && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute top-0 right-0 w-72 h-full bg-card border-l border-border flex flex-col shadow-2xl z-40"
        >
          <AIPanel
            groups={groups}
            insights={insights}
            projectContext={projectInfo ? `PROJECT: ${projectInfo.name}` : undefined}
            onCreateGroup={onCreateGroup}
            onAddToGroup={onAddToGroup}
            onClose={() => setActivePanel(null)}
          />
        </motion.div>
      )}

      {activePanel === "themeDiscovery" && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute top-0 right-0 w-80 h-full bg-card border-l border-border flex flex-col shadow-2xl z-40"
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
          initial={{ x: 620, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 620, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute top-0 right-0 w-[600px] h-full bg-card border-l border-border flex flex-col shadow-2xl z-40"
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
          initial={{ x: 820, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 820, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute top-0 right-0 w-[800px] h-full bg-card border-l border-border flex flex-col shadow-2xl z-40"
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
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute top-0 right-0 w-80 h-full bg-card border-l border-border flex flex-col shadow-2xl z-40"
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
