"use client";

import { toast } from "sonner";
import { GroupConnection } from "@/types";

export function useAffinityToasts() {
  const notifyInsightAdded = (groupTitle: string) => {
    toast.success(`Insight added to "${groupTitle}"`, {
      duration: 2000,
    });
  };

  const notifyInsightRemoved = () => {
    toast.info("Insight returned to available list", {
      duration: 2000,
    });
  };

  const notifyGroupDeleted = (groupTitle: string) => {
    toast.success(`Group "${groupTitle}" deleted`, {
      duration: 2000,
    });
  };

  const notifyGroupCreated = () => {
    toast.success("New group created", {
      duration: 2000,
    });
  };

  const notifyConnectionCreated = (
    sourceTitle: string, 
    targetTitle: string, 
    type: GroupConnection['type']
  ) => {
    const typeConfig = {
      'related': { icon: '🔗', description: 'Related connection created' },
      'hierarchy': { icon: '📊', description: 'Hierarchy connection created' },
      'dependency': { icon: '⚡', description: 'Dependency connection created' },
      'contradiction': { icon: '⚠️', description: 'Contradiction connection created' },
    }[type];

    toast.success(`${typeConfig.icon} Connection Created`, {
      description: `${sourceTitle} → ${targetTitle}`,
      duration: 4000,
    });
  };

  const notifyConnectionCreationStarted = (type: GroupConnection['type']) => {
    const typeConfig = {
      'related': { icon: '🔗', label: 'Related' },
      'hierarchy': { icon: '📊', label: 'Hierarchy' },
      'dependency': { icon: '⚡', label: 'Dependency' },
      'contradiction': { icon: '⚠️', label: 'Contradiction' },
    }[type];

    toast.info(`Creating ${typeConfig.label} Connection`, {
      description: "Click on another group to connect",
      duration: 3000,
    });
  };

  const notifyConnectionCreationCancelled = () => {
    toast.info("Connection Creation Cancelled", {
      description: "No connection was created",
      duration: 2000,
    });
  };

  const notifyConnectionDeleted = (label?: string) => {
    toast.success("Connection Deleted", {
      description: label ? `"${label}" connection removed` : "Connection removed",
      duration: 3000,
    });
  };

  const notifyConnectionError = (error: string) => {
    toast.error("Connection Error", {
      description: error,
      duration: 5000,
    });
  };

  const notifyAnalyticsReady = (insights: string[]) => {
    toast.success("Pattern Analysis Complete", {
      description: `${insights.length} insights detected`,
      duration: 5000,
      action: {
        label: "View",
        onClick: () => console.log("View analytics"),
      },
    });
  };

  const notifyExportReady = (format: string) => {
    toast.success(`Export Ready`, {
      description: `Your affinity map has been exported as ${format}`,
      duration: 4000,
    });
  };

  return {
    notifyInsightAdded,
    notifyInsightRemoved,
    notifyGroupDeleted,
    notifyGroupCreated,
    // 🆕 Nouveaux toasts
     notifyConnectionCreated,
    notifyConnectionCreationStarted,
    notifyConnectionCreationCancelled,
    notifyConnectionDeleted,
    notifyConnectionError,
    notifyAnalyticsReady,
    notifyExportReady,
  };
}