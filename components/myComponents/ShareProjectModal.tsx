"use client";

import { useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { openSkriptaSignal } from "@/lib/openSignal";
import {
  buildWallIssueMarkdown,
  downloadIssueMarkdown,
} from "@/lib/issueCut";
import {
  buildIssueBriefFallback,
  type IssueBrief,
} from "@/lib/issueBrief";

interface ShareProjectModalProps {
  projectId: Id<"projects">;
  projectName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide the default trigger when controlled from the wall toolbar. */
  hideTrigger?: boolean;
}

async function fetchIssueBrief(payload: {
  projectName: string;
  description?: string;
  sittingCount: number;
  clusters: Array<{
    title: string;
    voteCount: number;
    slips: Array<{ text: string; kind?: string }>;
  }>;
  castNames: string[];
}): Promise<{ brief: IssueBrief; warning?: string }> {
  try {
    const response = await fetch("/api/issue/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { brief: buildIssueBriefFallback(payload), warning: "AI brief unavailable" };
    }
    const data = (await response.json()) as {
      brief?: IssueBrief;
      source?: string;
      warning?: string;
    };
    if (
      data.brief?.thesis &&
      data.brief.framing != null &&
      data.brief.priorityLead != null
    ) {
      return {
        brief: data.brief,
        warning:
          data.source === "fallback"
            ? data.warning ?? "Using field fallback brief"
            : undefined,
      };
    }
  } catch {
    /* fall through */
  }
  return { brief: buildIssueBriefFallback(payload), warning: "AI brief unavailable" };
}

export function ShareProjectModal({
  projectId,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: ShareProjectModalProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = controlledOpen ?? uncontrolledOpen;
  const setIsOpen = onOpenChange ?? setUncontrolledOpen;

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const shareStatus = useQuery(api.projectSharing.getProjectShareStatus, {
    projectId,
  });
  const createIssue = useMutation(api.projectSharing.createIssueFromWall);
  const revokeLink = useMutation(api.projectSharing.revokeProjectShareLink);
  const convex = useConvex();

  const liveLinks = (shareStatus ?? []).filter((link) => !link.isTemplate);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const wallBrief = await convex.query(api.projectSharing.getWallBrief, {
        projectId,
      });
      if (!wallBrief) {
        throw new Error("No wall yet — open the affinity map first");
      }

      const { brief, warning } = await fetchIssueBrief({
        projectName: wallBrief.projectName,
        description: wallBrief.description,
        sittingCount: wallBrief.sittingCount,
        clusters: wallBrief.wall.clusters.map((cluster) => ({
          title: cluster.title,
          voteCount: cluster.voteCount,
          slips: cluster.slips.map((slip) => ({
            text: slip.text,
            kind: slip.kind,
          })),
        })),
        castNames: (wallBrief.wall.cast ?? []).map((persona) => persona.name),
      });

      const result = await createIssue({
        projectId,
        password: code.trim() ? code.trim() : undefined,
        brief,
      });
      toast.success("Issue published");
      if (warning) toast.message(warning);
      setCode("");
      await navigator.clipboard.writeText(
        `${window.location.origin}${result.shareUrl}`
      );
      setCopiedToken(result.shareToken);
      window.setTimeout(() => setCopiedToken(null), 1600);
      // Soft ask for tester Signal (not stakeholder Issue Signal)
      window.setTimeout(() => openSkriptaSignal("issue"), 900);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not publish Issue"
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRevoke = async (shareToken: string) => {
    try {
      await revokeLink({ shareToken });
      toast.success("Issue revoked");
    } catch {
      toast.error("Could not revoke");
    }
  };

  const handleCopyLink = async (shareUrl: string, token: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`);
    setCopiedToken(token);
    window.setTimeout(() => setCopiedToken(null), 1600);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const wallBrief = await convex.query(api.projectSharing.getWallBrief, {
        projectId,
      });
      if (!wallBrief) {
        toast.error("No wall yet");
        return;
      }
      const { brief, warning } = await fetchIssueBrief({
        projectName: wallBrief.projectName,
        description: wallBrief.description,
        sittingCount: wallBrief.sittingCount,
        clusters: wallBrief.wall.clusters.map((cluster) => ({
          title: cluster.title,
          voteCount: cluster.voteCount,
          slips: cluster.slips.map((slip) => ({
            text: slip.text,
            kind: slip.kind,
          })),
        })),
        castNames: (wallBrief.wall.cast ?? []).map((persona) => persona.name),
      });
      downloadIssueMarkdown(
        wallBrief.projectName,
        buildWallIssueMarkdown({
          projectName: wallBrief.projectName,
          description: wallBrief.description,
          clusters: wallBrief.wall.clusters,
          traySlips: wallBrief.wall.traySlips,
          cast: wallBrief.wall.cast,
          brief,
        })
      );
      if (warning) toast.message(warning);
      else toast.success("Issue exported");
    } catch {
      toast.error("Could not export");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!hideTrigger ? (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="h-10 font-mono text-xs uppercase tracking-widest"
          >
            Issue
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Issue
          </DialogTitle>
          <DialogDescription>
            Freeze the wall for people who were not in the room — thesis,
            priorities, slips, and cast.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {liveLinks.length > 0 ? (
            <ul className="divide-y divide-border">
              {liveLinks.map((link) => (
                <li key={link.shareToken} className="px-5 py-3">
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {link.shareUrl}
                    {link.hasPassword ? " · locked" : ""}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {new Date(link.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    {link.isWallIssue
                      ? ` · ${link.clusterCount} clusters`
                      : ` · ${link.interviewCount} sittings`}
                  </p>
                  <div className="mt-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 font-mono text-[10px] uppercase tracking-widest"
                      onClick={() =>
                        void handleCopyLink(link.shareUrl, link.shareToken)
                      }
                    >
                      {copiedToken === link.shareToken ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 font-mono text-[10px] uppercase tracking-widest"
                      onClick={() => window.open(link.shareUrl, "_blank")}
                    >
                      Open
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive"
                      onClick={() => void handleRevoke(link.shareToken)}
                    >
                      Revoke
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              No Issue published yet.
            </p>
          )}

          <form
            className={cn(
              "border-t border-border px-5 py-4",
              liveLinks.length === 0 && "border-t-0"
            )}
            onSubmit={(event) => {
              event.preventDefault();
              void handlePublish();
            }}
          >
            <p className="mb-2 font-mono text-[11px] tracking-widest uppercase text-muted-foreground">
              Code
            </p>
            <Input
              type="text"
              autoComplete="off"
              placeholder="optional"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mb-3 rounded-none"
            />
            <Button
              type="submit"
              disabled={isPublishing}
              className="w-full font-mono text-[11px] uppercase tracking-widest"
            >
              {isPublishing ? "Publishing…" : "Publish"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isExporting}
              onClick={() => void handleExport()}
              className="mt-2 w-full font-mono text-[11px] uppercase tracking-widest"
            >
              {isExporting ? "Exporting…" : "Export"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
