"use client";

import React, { useState, useCallback, useMemo } from "react";
import { AffinityGroup as AffinityGroupType } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Merge } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#22c55e",
  "#14b8a6", "#3b82f6", "#6366f1", "#a855f7",
];

interface MergeClustersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusters: AffinityGroupType[];
  selectedIds: string[];
  onMerge: (mergedCluster: {
    id: string;
    title: string;
    color: string;
    position: { x: number; y: number };
    insightIds: string[];
  }) => void;
}

export function MergeClustersModal({
  open,
  onOpenChange,
  clusters,
  selectedIds,
  onMerge,
}: MergeClustersModalProps) {
  const selectedClusters = useMemo(
    () => clusters.filter((c) => selectedIds.includes(c.id)),
    [clusters, selectedIds]
  );

  const [title, setTitle] = useState(() => {
    if (selectedClusters.length > 0) {
      return `Merged: ${selectedClusters.map((c) => c.title).join(", ")}`;
    }
    return "New Cluster";
  });
  const [color, setColor] = useState(COLORS[5]);

  const totalInsights = useMemo(
    () => selectedClusters.reduce((sum, c) => sum + c.insightIds.length, 0),
    [selectedClusters]
  );

  const avgPosition = useMemo(() => {
    if (selectedClusters.length === 0) return { x: 0, y: 0 };
    const sumX = selectedClusters.reduce((sum, c) => sum + c.position.x, 0);
    const sumY = selectedClusters.reduce((sum, c) => sum + c.position.y, 0);
    return {
      x: sumX / selectedClusters.length,
      y: sumY / selectedClusters.length,
    };
  }, [selectedClusters]);

  const handleMerge = useCallback(() => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    const allInsightIds = selectedClusters.flatMap((c) => c.insightIds);
    
    onMerge({
      id: `merged-${Date.now()}`,
      title: title.trim(),
      color,
      position: avgPosition,
      insightIds: allInsightIds,
    });

    toast.success(`Merged ${selectedClusters.length} clusters into "${title.trim()}"`);
    onOpenChange(false);
  }, [title, color, avgPosition, selectedClusters, onMerge, onOpenChange]);

  if (selectedClusters.length < 2) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="w-5 h-5" />
            Merge {selectedClusters.length} Clusters
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">
              Will merge {totalInsights} total insights:
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedClusters.map((cluster) => (
                <span
                  key={cluster.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                  style={{ backgroundColor: `${cluster.color}20`, color: cluster.color }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cluster.color }}
                  />
                  {cluster.title}
                </span>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Cluster Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter cluster title..."
              className="w-full"
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Cluster Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMerge}>
            <Merge className="w-4 h-4 mr-2" />
            Merge Clusters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
