import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

// components/ActivityPanel.tsx
export function ActivityPanel({ mapId }: { mapId: string }) {
  const logs = useQuery(api.activityLog.getByMap, { mapId });
  if (!logs) return null;

  return (
    <div className="p-4 space-y-2 text-sm">
      {logs.map((log: ActivityLog) => (
        <div key={log._id} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span>{log.action}</span>
          <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
        </div>
      ))}
    </div>
  );
}