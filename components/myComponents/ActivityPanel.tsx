// components/ActivityPanel.tsx - VERSION AVEC TYPES STRICTS

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Activity, Users, Move, Edit, MessageSquare, Plus, Trash2, Lightbulb, AtSign } from "lucide-react";
import { ActivityLog, ActivityAction } from "@/types";

interface ActivityPanelProps {
  mapId: Id<"affinityMaps">;
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityPanel({ mapId, isOpen, onClose }: ActivityPanelProps) {
  const activities = useQuery(api.activityLog.getActivityForMap, { 
    mapId, 
    limit: 100 
  });

  const getActivityIcon = (action: ActivityAction) => {
    switch (action) {
      case "group_created": 
        return <Plus size={16} className="text-green-500" />;
      case "group_moved": 
        return <Move size={16} className="text-blue-500" />;
      case "group_renamed": 
        return <Edit size={16} className="text-orange-500" />;
      case "group_deleted": 
        return <Trash2 size={16} className="text-red-500" />;
      case "insight_added": 
      case "insight_removed": 
      case "insight_moved": 
        return <Lightbulb size={16} className="text-purple-500" />;
      case "comment_added": 
        return <MessageSquare size={16} className="text-indigo-500" />;
      case "user_mentioned": 
        return <AtSign size={16} className="text-pink-500" />;
      default: 
        return <Activity size={16} className="text-gray-500" />;
    }
  };

  const getActivityMessage = (activity: ActivityLog): string => {
    const userName = activity.userName || "Someone";
    
    switch (activity.action) {
      case "group_created":
        return `${userName} created group "${activity.targetName}"`;
      case "group_moved":
        return `${userName} moved group "${activity.targetName}"`;
      case "group_renamed":
        return `${userName} renamed group to "${activity.targetName}"`;
      case "group_deleted":
        return `${userName} deleted group "${activity.targetName}"`;
      case "insight_added":
        return `${userName} added an insight to "${activity.targetName}"`;
      case "insight_removed":
        return `${userName} removed an insight from "${activity.targetName}"`;
      case "insight_moved":
        return `${userName} moved an insight to "${activity.targetName}"`;
      case "comment_added":
        return `${userName} commented on "${activity.targetName}"`;
      case "user_mentioned":
        return `${userName} mentioned someone in "${activity.targetName}"`;
      default:
        return `${userName} performed an action`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity size={20} />
            Activity Feed
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Recent changes to this map
        </p>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto p-4">
        {!activities && (
          <div className="text-center text-gray-500 py-8">
            Loading activities...
          </div>
        )}

        {activities && activities.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Activity size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No activity yet</p>
            <p className="text-sm">Changes will appear here</p>
          </div>
        )}

        {activities && activities.length > 0 && (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity._id}
                className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.action)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">
                    {getActivityMessage(activity as ActivityLog)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(activity.timestamp, { 
                      addSuffix: true,
                      locale: fr 
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}