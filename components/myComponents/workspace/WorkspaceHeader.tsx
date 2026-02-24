"use client";

import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { ActivePanel } from "@/types";
import { NotificationBell } from "../NotificationBell";
import { SilentSortingCommand } from "../SilentSortingCommand";

interface WorkspaceHeaderProps {
  projectId: Id<"projects">;
  projectName: string;
  mapName: string | undefined;
  mapId: Id<"affinityMaps"> | undefined;
  userId: string | null | undefined;
  showActivityPanel: boolean;
  setShowActivityPanel: (show: boolean) => void;
  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;
  activities: unknown[] | undefined;
}

export function WorkspaceHeader({
  projectId,
  projectName,
  mapName,
  mapId,
  userId,
  showActivityPanel,
  setShowActivityPanel,
  activePanel,
  setActivePanel,
  activities,
}: WorkspaceHeaderProps) {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between p-4 bg-card border-b shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(`/project/${projectId}`)}
          className="px-3 py-2 border rounded-lg hover:bg-accent text-foreground"
        >
          ← Back to Project
        </button>

        <div>
          <h1 className="text-xl font-bold text-foreground">
            {mapName || "Affinity Map"}
          </h1>
          <p className="text-sm text-muted-foreground">{projectName}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        {/* Bell Notifications */}
        <NotificationBell />

        {/* Silent Sorting */}
        {mapId && userId && (
          <SilentSortingCommand
            mapId={mapId}
            currentUserId={userId}
          />
        )}

        {/* Activity Button */}
        <button
          onClick={() => setActivePanel(activePanel === 'activity' ? null : 'activity')}
          className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${
            activePanel === 'activity'
              ? "bg-primary/20 border-primary text-primary"
              : "bg-muted border-border text-foreground hover:bg-accent"
          }`}
        >
          <span>📋</span>
          Activity
          {activities && activities.length > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
              {activities.length}
            </span>
          )}
        </button>

        {/* Export */}
        <button 
          onClick={() => setActivePanel(activePanel === 'export' ? null : 'export')}
          className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${
            activePanel === 'export'
              ? "bg-primary/20 border-primary text-primary"
              : "bg-muted border-border text-foreground hover:bg-accent"
          }`}
        >
          Export
        </button>
      </div>
    </header>
  );
}
