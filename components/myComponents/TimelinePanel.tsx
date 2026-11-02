"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { ActivityLog, ActivityAction } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface TimelinePanelProps {
  mapId: Id<"affinityMaps">;
  isOpen: boolean;
  onClose: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const VERB: Record<ActivityAction, string> = {
  group_created: "framed",
  group_moved: "moved",
  group_renamed: "renamed",
  group_deleted: "pulled",
  insight_added: "pinned",
  insight_removed: "unpinned",
  insight_moved: "moved",
  comment_added: "noted",
  user_mentioned: "tagged",
  sticky_created: "laid",
  sticky_moved: "moved",
  sticky_resized: "resized",
  sticky_updated: "edited",
  sticky_deleted: "filed off",
  sticky_duplicated: "copied",
  section_created: "framed",
  section_moved: "moved",
  section_resized: "resized",
  section_renamed: "renamed",
  section_deleted: "pulled",
  elements_grouped: "bundled",
  ai_cluster_created: "stacked",
  ai_suggestions_generated: "sorted",
  ai_rename_applied: "retitled",
};

function firstName(name: string): string {
  return name.trim().split(" ")[0] || "Someone";
}

export function TimelinePanel({
  mapId,
  isOpen,
  onClose,
}: TimelinePanelProps) {
  const activities = useQuery(api.activityLog.getActivityForMap, {
    mapId,
    limit: 500,
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const groups = useMemo(() => {
    if (!activities) return [];
    const today: ActivityLog[] = [];
    const yesterday: ActivityLog[] = [];
    const week: ActivityLog[] = [];
    const older: ActivityLog[] = [];

    for (const activity of activities as ActivityLog[]) {
      const date = new Date(activity.timestamp);
      if (isToday(date)) today.push(activity);
      else if (isYesterday(date)) yesterday.push(activity);
      else if (isThisWeek(date)) week.push(activity);
      else older.push(activity);
    }

    return [
      { label: "Today", items: today },
      { label: "Yesterday", items: yesterday },
      { label: "This week", items: week },
      { label: "Earlier", items: older },
    ].filter((group) => group.items.length > 0);
  }, [activities]);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      modal={false}
    >
      <SheetContent
        side="right"
        overlay={false}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle>Log</SheetTitle>
          <SheetDescription>
            {activities ? `${activities.length} marks on this wall` : "Reading the tape"}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          {!activities && (
            <p className="p-4 font-mono text-[11px] tracking-widest uppercase text-muted-foreground">
              Reading
            </p>
          )}

          {activities && groups.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              Nothing on the log yet. Moves and packets will stamp here.
            </p>
          )}

          <div className="flex flex-col gap-6 p-4">
            {groups.map((group) => (
              <section key={group.label}>
                <h3 className="mb-2 font-mono text-[11px] tracking-widest uppercase text-muted-foreground">
                  {group.label}
                  <span className="ml-2 tabular-nums">{group.items.length}</span>
                </h3>
                <ol className="flex flex-col">
                  {group.items.map((activity, index) => (
                    <li
                      key={activity._id}
                      className={cn(
                        "grid grid-cols-[3.25rem_1fr] gap-x-3 py-2",
                        index < group.items.length - 1 && "border-b border-border"
                      )}
                    >
                      <time className="font-mono text-[11px] tabular-nums text-muted-foreground pt-0.5">
                        {format(activity.timestamp, "HH:mm")}
                      </time>
                      <p className="text-[13px] leading-snug">
                        <span className="text-foreground">{firstName(activity.userName || "Someone")}</span>
                        {" "}
                        <span className="text-muted-foreground">
                          {VERB[activity.action] ?? activity.action}
                        </span>
                        {activity.targetName ? (
                          <>
                            {" "}
                            <span className="text-foreground">“{activity.targetName}”</span>
                          </>
                        ) : null}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
