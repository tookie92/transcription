"use client";

import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
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
  activities: any[] | undefined;
}

export function WorkspaceHeader({
  projectId,
  projectName,
  mapName,
  mapId,
  userId,
  showActivityPanel,
  setShowActivityPanel,
  activities,
}: WorkspaceHeaderProps) {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between p-4 bg-white border-b shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(`/project/${projectId}`)}
          className="px-3 py-2 border rounded-lg hover:bg-gray-50"
        >
          ← Back to Project
        </button>

        <div>
          <h1 className="text-xl font-bold">
            {mapName || "Affinity Map"}
          </h1>
          <p className="text-sm text-gray-600">{projectName}</p>
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
          onClick={() => setShowActivityPanel(!showActivityPanel)}
          className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${
            showActivityPanel
              ? "bg-blue-100 border-blue-400 text-blue-800"
              : "bg-gray-100 border-gray-300"
          }`}
        >
          <span>📋</span>
          Activity
          {activities && activities.length > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {activities.length}
            </span>
          )}
        </button>

        {/* Export */}
        <button className="px-3 py-2 border rounded-lg hover:bg-gray-50">
          Export
        </button>
      </div>
    </header>
  );
}
