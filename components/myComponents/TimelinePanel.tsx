"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Activity, 
  Clock, 
  User, 
  Filter, 
  Search,
  Plus, 
  Move, 
  Edit, 
  MessageSquare, 
  Trash2, 
  Lightbulb, 
  AtSign, 
  StickyNote, 
  Folder, 
  Copy, 
  Maximize2,
  Zap,
  Eye,
  X,
  Undo2,
  Redo2,
} from "lucide-react";
import { ActivityLog, ActivityAction } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Actions that are easily undoable via the board's undo system
const UNDOABLE_ACTIONS: ActivityAction[] = [
  "sticky_created",
  "sticky_moved",
  "sticky_resized",
  "sticky_updated",
  "sticky_deleted",
  "sticky_duplicated",
  "section_created",
  "section_moved",
  "section_resized",
  "section_renamed",
  "section_deleted",
  "group_created",
  "group_moved",
  "group_renamed",
  "group_deleted",
  "insight_added",
  "insight_removed",
  "insight_moved",
  "comment_added",
];

// Actions that may have limited undo support
const LIMITED_UNDO_ACTIONS: ActivityAction[] = [
  "elements_grouped",
  "ai_cluster_created",
  "ai_suggestions_generated",
  "ai_rename_applied",
  "user_mentioned",
];

function isActionUndoable(action: ActivityAction): boolean {
  return UNDOABLE_ACTIONS.includes(action);
}

function isActionLimitedUndo(action: ActivityAction): boolean {
  return LIMITED_UNDO_ACTIONS.includes(action);
}
import { toast } from "sonner";

interface TimelinePanelProps {
  mapId: Id<"affinityMaps">;
  isOpen: boolean;
  onClose: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const ACTION_CATEGORIES = {
  create: ["group_created", "sticky_created", "section_created", "insight_added"],
  edit: ["sticky_updated", "section_renamed", "group_renamed"],
  move: ["sticky_moved", "section_moved", "group_moved", "insight_moved"],
  delete: ["sticky_deleted", "section_deleted", "group_deleted", "insight_removed"],
  collaborate: ["comment_added", "user_mentioned", "elements_grouped"],
  ai: ["ai_cluster_created", "ai_suggestions_generated", "ai_rename_applied"],
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-primary",
  edit: "bg-amber-500",
  move: "bg-blue-500",
  delete: "bg-red-500",
  collaborate: "bg-violet-500",
  ai: "bg-[var(--warm-terracotta)]",
};

const ACTION_BG_COLORS: Record<string, string> = {
  create: "bg-primary/10 text-primary",
  edit: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  move: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  delete: "bg-red-500/10 text-red-600 dark:text-red-400",
  collaborate: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  ai: "bg-[var(--warm-terracotta)]/10 text-[var(--warm-terracotta)]",
};

const ACTION_ICONS: Record<ActivityAction, React.ReactNode> = {
  group_created: <Plus size={14} />,
  group_moved: <Move size={14} />,
  group_renamed: <Edit size={14} />,
  group_deleted: <Trash2 size={14} />,
  insight_added: <Lightbulb size={14} />,
  insight_removed: <Trash2 size={14} />,
  insight_moved: <Move size={14} />,
  comment_added: <MessageSquare size={14} />,
  user_mentioned: <AtSign size={14} />,
  sticky_created: <StickyNote size={14} />,
  sticky_moved: <Move size={14} />,
  sticky_resized: <Zap size={14} />,
  sticky_updated: <Edit size={14} />,
  sticky_deleted: <Trash2 size={14} />,
  sticky_duplicated: <Copy size={14} />,
  section_created: <Folder size={14} />,
  section_moved: <Move size={14} />,
  section_resized: <Zap size={14} />,
  section_renamed: <Edit size={14} />,
  section_deleted: <Trash2 size={14} />,
  elements_grouped: <Maximize2 size={14} />,
  ai_cluster_created: <Zap size={14} />,
  ai_suggestions_generated: <Lightbulb size={14} />,
  ai_rename_applied: <Edit size={14} />,
};

const ACTION_LABELS: Record<ActivityAction, string> = {
  group_created: "Created group",
  group_moved: "Moved group",
  group_renamed: "Renamed group",
  group_deleted: "Deleted group",
  insight_added: "Added insight",
  insight_removed: "Removed insight",
  insight_moved: "Moved insight",
  comment_added: "Commented",
  user_mentioned: "Mentioned user",
  sticky_created: "Added sticky",
  sticky_moved: "Moved sticky",
  sticky_resized: "Resized sticky",
  sticky_updated: "Edited sticky",
  sticky_deleted: "Deleted sticky",
  sticky_duplicated: "Duplicated sticky",
  section_created: "Created section",
  section_moved: "Moved section",
  section_resized: "Resized section",
  section_renamed: "Renamed section",
  section_deleted: "Deleted section",
  elements_grouped: "Grouped elements",
  ai_cluster_created: "AI created cluster",
  ai_suggestions_generated: "AI generated suggestions",
  ai_rename_applied: "AI renamed cluster",
};

function getActionCategory(action: ActivityAction): string {
  for (const [category, actions] of Object.entries(ACTION_CATEGORIES)) {
    if (actions.includes(action)) return category;
  }
  return "edit";
}

function getUserColor(userId: string): string {
  const colors = [
    "bg-primary", "bg-[var(--warm-terracotta)]", "bg-blue-500", "bg-violet-500",
    "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-teal-500",
    "bg-indigo-500", "bg-cyan-500", "bg-rose-500", "bg-lime-500",
    "bg-emerald-500", "bg-amber-500", "bg-fuchsia-500", "bg-sky-500",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getUserInitials(name: string): string {
  return name
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface ActivityItemProps {
  activity: ActivityLog;
  onClick?: () => void;
}

function ActivityItem({ activity, onClick }: ActivityItemProps) {
  const category = getActionCategory(activity.action);
  const bgColorClass = ACTION_BG_COLORS[category];
  const colorClass = ACTION_COLORS[category];
  const userColor = getUserColor(activity.userId);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
    >
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0", colorClass)}>
        {ACTION_ICONS[activity.action]}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-medium shrink-0", userColor)}>
            {getUserInitials(activity.userName || "AN")}
          </div>
          <span className="text-sm font-medium text-foreground truncate">
            {activity.userName || "Anonymous"}
          </span>
        </div>
        
        <p className="text-sm text-muted-foreground mt-0.5">
          {ACTION_LABELS[activity.action]}
          {activity.targetName && (
            <span className="text-foreground"> "{activity.targetName}"</span>
          )}
        </p>
        
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: fr })}
        </p>
      </div>
    </button>
  );
}

export function TimelinePanel({ 
  mapId, 
  isOpen, 
  onClose,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: TimelinePanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const activities = useQuery(api.activityLog.getActivityForMap, { 
    mapId, 
    limit: 500 
  });

  // Keyboard handler for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Get unique users
  const uniqueUsers = useMemo(() => {
    if (!activities) return [];
    const users = new Map<string, string>();
    for (const activity of activities) {
      users.set(activity.userId, activity.userName || "Anonymous");
    }
    return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
  }, [activities]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    
    return activities.filter(activity => {
      if (searchQuery && !activity.targetName?.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !activity.userName?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      if (selectedUser && activity.userId !== selectedUser) {
        return false;
      }
      
      if (selectedCategory && getActionCategory(activity.action) !== selectedCategory) {
        return false;
      }
      
      return true;
    });
  }, [activities, searchQuery, selectedUser, selectedCategory]);

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: { label: string; date: Date; activities: ActivityLog[] }[] = [];
    const today: ActivityLog[] = [];
    const yesterday: ActivityLog[] = [];
    const thisWeek: ActivityLog[] = [];
    const older: ActivityLog[] = [];

    for (const activity of filteredActivities) {
      const date = new Date(activity.timestamp);
      if (isToday(date)) {
        today.push(activity);
      } else if (isYesterday(date)) {
        yesterday.push(activity);
      } else if (isThisWeek(date)) {
        thisWeek.push(activity);
      } else {
        older.push(activity);
      }
    }

    if (today.length > 0) groups.push({ label: "Today", date: new Date(), activities: today });
    if (yesterday.length > 0) groups.push({ label: "Yesterday", date: new Date(Date.now() - 86400000), activities: yesterday });
    if (thisWeek.length > 0) groups.push({ label: "This Week", date: new Date(Date.now() - 604800000), activities: thisWeek });
    if (older.length > 0) groups.push({ label: "Older", date: new Date(0), activities: older });

    return groups;
  }, [filteredActivities]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedUser(null);
    setSelectedCategory(null);
  };

  const hasActiveFilters = searchQuery || selectedUser || selectedCategory;

  const handleUndo = useCallback(() => {
    if (onUndo) {
      onUndo();
      toast.success("Action undone");
    }
  }, [onUndo]);

  const handleRedo = useCallback(() => {
    if (onRedo) {
      onRedo();
      toast.success("Action redone");
    }
  }, [onRedo]);

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-background border-l border-border flex flex-col z-50 shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <Activity size={20} className="text-primary" />
            Timeline
          </h2>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className="h-8 w-8 p-0"
                >
                  <Undo2 size={16} className={canUndo ? "text-foreground" : "text-muted-foreground"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className="h-8 w-8 p-0"
                >
                  <Redo2 size={16} className={canRedo ? "text-foreground" : "text-muted-foreground"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
            </Tooltip>
            
            <Separator orientation="vertical" className="h-6 mx-1" />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-muted/50"
          />
          </div>

        {/* Filter toggle */}
        <div className="flex items-center justify-between mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs h-8"
          >
            <Filter size={14} className="mr-1.5" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                Active
              </Badge>
            )}
          </Button>
          
          {canUndo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              className="text-xs h-8 text-primary hover:text-primary"
            >
              <Undo2 size={14} className="mr-1.5" />
              Undo last
            </Button>
          )}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-3 space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
            {/* Category filter */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Action Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(ACTION_BG_COLORS).map(([category, colorClass]) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                    className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium transition-all capitalize",
                      selectedCategory === category
                        ? colorClass
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* User filter */}
            {uniqueUsers.length > 1 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Users
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueUsers.map(({ id, name }) => (
                    <button
                      key={id}
                      onClick={() => setSelectedUser(selectedUser === id ? null : id)}
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5",
                        selectedUser === id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      )}
                    >
                      <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px]", getUserColor(id))}>
                        {getUserInitials(name)}
                      </div>
                      {name.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full h-7 text-xs"
              >
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Timeline content */}
      <div className="flex-1 overflow-y-auto">
        {!activities && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">Loading timeline...</div>
          </div>
        )}

        {activities && filteredActivities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Eye size={48} className="text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {hasActiveFilters ? "No activities match your filters" : "No activity yet"}
            </p>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            )}
          </div>
        )}

        {filteredActivities.length > 0 && (
          <div className="p-4 space-y-6">
            {groupedActivities.map((group) => (
              <div key={group.label}>
                {/* Date header */}
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {group.label}
                  </h3>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {group.activities.length}
                  </Badge>
                </div>

                {/* Activities */}
                <div className="space-y-1">
                  {group.activities.map((activity) => (
                    <ActivityItem
                      key={activity._id}
                      activity={activity as ActivityLog}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="p-3 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filteredActivities.length} activities</span>
          {uniqueUsers.length > 0 && (
            <span className="flex items-center gap-1">
              <User size={12} />
              {uniqueUsers.length} contributor{uniqueUsers.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
