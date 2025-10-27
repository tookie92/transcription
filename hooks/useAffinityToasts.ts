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

  return {
    notifyInsightAdded,
    notifyInsightRemoved,
    notifyGroupDeleted,
    notifyGroupCreated,
  };
}