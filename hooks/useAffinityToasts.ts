"use client";

import { toast } from "sonner";

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

    // 🆕 TOASTS POUR LES CONNECTIONS
  const notifyConnectionCreated = (
    sourceTitle: string, 
    targetTitle: string, 
    connectionType: string
  ) => {
    const typeEmoji = {
      'related': '🔗',
      'hierarchy': '📊', 
      'dependency': '⚡',
      'contradiction': '⚠️'
    }[connectionType] || '🔗';

    toast.success(`${typeEmoji} Connection created`, {
      description: `${sourceTitle} → ${targetTitle}`,
      duration: 3000,
      action: {
        label: "View",
        onClick: () => console.log("View connection"),
      },
    });
  };

  const notifyConnectionCreationStarted = (groupTitle: string) => {
    toast.info("Creating connection...", {
      description: `Click another group to connect with "${groupTitle}"`,
      duration: 4000,
    });
  };

  const notifyConnectionCreationCancelled = () => {
    toast.info("Connection cancelled", {
      duration: 1500,
    });
  };

  const notifyConnectionDeleted = (connectionLabel?: string) => {
    toast.info("Connection deleted", {
      description: connectionLabel ? `"${connectionLabel}" removed` : undefined,
      duration: 2000,
    });
  };

  const notifyConnectionError = (error: string) => {
    toast.error("Connection failed", {
      description: error,
      duration: 3000,
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
  };
}