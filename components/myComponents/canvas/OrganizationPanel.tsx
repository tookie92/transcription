"use client";

import React, { useState, useCallback, useMemo } from "react";
import { AffinityGroup as AffinityGroupType } from "@/types";
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Merge,
  Copy,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CLUSTER_COLORS = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Gray", value: "#6b7280" },
];

interface OrganizationPanelProps {
  groups: AffinityGroupType[];
  selectedIds: Set<string>;
  onSelectGroup: (groupId: string, additive?: boolean) => void;
  onDeleteGroups: (groupIds: string[]) => void;
  onMergeGroups: (groupIds: string[]) => void;
  onDuplicateGroups: (groupIds: string[]) => void;
  onColorChange: (groupId: string, color: string) => void;
  onRename: (groupId: string, title: string) => void;
  onBringToFront: (groupId: string) => void;
  onSendToBack: (groupId: string) => void;
  onMoveToPosition: (groupId: string, position: { x: number; y: number }) => void;
}

export function OrganizationPanel({
  groups,
  selectedIds,
  onSelectGroup,
  onDeleteGroups,
  onMergeGroups,
  onDuplicateGroups,
  onColorChange,
  onRename,
  onBringToFront,
  onSendToBack,
  onMoveToPosition,
}: OrganizationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const selectedGroups = useMemo(
    () => groups.filter((g) => selectedIds.has(g.id)),
    [groups, selectedIds]
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (confirm(`Delete ${count} cluster${count > 1 ? "s" : ""}?`)) {
      onDeleteGroups(Array.from(selectedIds));
    }
  }, [selectedIds, onDeleteGroups]);

  const handleMergeSelected = useCallback(() => {
    if (selectedIds.size < 2) {
      toast.error("Select at least 2 clusters to merge");
      return;
    }
    onMergeGroups(Array.from(selectedIds));
  }, [selectedIds, onMergeGroups]);

  const handleDuplicateSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    onDuplicateGroups(Array.from(selectedIds));
  }, [selectedIds, onDuplicateGroups]);

  const handleBringAllToFront = useCallback(() => {
    selectedIds.forEach((id) => onBringToFront(id));
  }, [selectedIds, onBringToFront]);

  const handleSendAllToBack = useCallback(() => {
    selectedIds.forEach((id) => onSendToBack(id));
  }, [selectedIds, onSendToBack]);

  return (
    <div className="bg-card border border-border rounded-lg">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm font-medium">
          Organization
          {selectedIds.size > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              ({selectedIds.size} selected)
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Bulk Actions */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Bulk Actions
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMergeSelected}
                disabled={selectedIds.size < 2}
                className="text-xs"
              >
                <Merge className="w-3 h-3 mr-1" />
                Merge
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicateSelected}
                disabled={selectedIds.size === 0}
                className="text-xs"
              >
                <Copy className="w-3 h-3 mr-1" />
                Duplicate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                className="text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  selectedIds.forEach((id) => onSelectGroup(id, true));
                }}
                disabled={selectedIds.size === 0}
                className="text-xs"
              >
                Deselect All
              </Button>
            </div>
          </div>

          {/* Z-Order */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Z-Order
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBringAllToFront}
                disabled={selectedIds.size === 0}
                className="text-xs"
              >
                <ArrowUp className="w-3 h-3 mr-1" />
                Front
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendAllToBack}
                disabled={selectedIds.size === 0}
                className="text-xs"
              >
                <ArrowDown className="w-3 h-3 mr-1" />
                Back
              </Button>
            </div>
          </div>

          {/* Quick Colors */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Quick Colors
            </label>
            <div className="flex gap-1">
              {CLUSTER_COLORS.slice(0, 5).map((color) => (
                <button
                  key={color.value}
                  onClick={() => {
                    selectedIds.forEach((id) => onColorChange(id, color.value));
                  }}
                  disabled={selectedIds.size === 0}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                    selectedIds.size === 0 && "opacity-50 cursor-not-allowed"
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Selected Clusters List */}
          {selectedGroups.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Selected Clusters
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {selectedGroups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="flex-1 truncate">{group.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {group.insightIds.length} insights
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
