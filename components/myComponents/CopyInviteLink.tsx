"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { Link2 } from "lucide-react";

export function CopyInviteLink({ projectId }: { projectId: Id<"projects"> }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const link = `${window.location.origin}/project/${projectId}/affinity`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Invite link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button onClick={handleCopy} variant="outline" className="gap-2">
      <Link2 className="w-4 h-4" />
      {copied ? "Copied!" : "Copy Invite Link"}
    </Button>
  );
}