"use client";

import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import { ShareProjectModal } from "./ShareProjectModal";
import { TeamDialog } from "./TeamDialog";
import { FindStudyDialog } from "./FindStudyDialog";
import { TapePeek, type TapePeekTarget } from "./affinity/TapePeek";
import { cn } from "@/lib/utils";
import { liveFigJamElements } from "@/lib/figjamMerge";

interface ProjectContentProps {
  projectId: Id<"projects">;
}

type Sitting = {
  _id: Id<"interviews">;
  title: string;
  topic?: string;
  duration?: number;
  status: string;
  createdAt: number;
  audioUrl?: string;
};

function formatDuration(seconds?: number): string {
  if (!seconds) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.round(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

function statusLabel(status: string): string {
  switch (status) {
    case "completed":
      return "Ready";
    case "analyzing":
      return "Working";
    case "transcribing":
      return "Tape";
    case "uploading":
      return "Load";
    case "ready":
      return "Ready";
    default:
      return status;
  }
}

function SittingRow({
  interview,
  projectId,
  onDelete,
}: {
  interview: Sitting;
  projectId: string;
  onDelete: (id: Id<"interviews">, title: string) => void;
}) {
  const router = useRouter();
  const busy =
    interview.status === "transcribing" ||
    interview.status === "analyzing" ||
    interview.status === "uploading";

  return (
    <li>
      <button
        type="button"
        onClick={() =>
          router.push(`/project/${projectId}/interview/${interview._id}`)
        }
        className={cn(
          "group flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left",
          "transition-colors duration-150 ease-out hover:bg-accent/60"
        )}
      >
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full bg-primary",
            busy && "animate-pulse"
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-base text-foreground"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            {interview.title}
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
            {statusLabel(interview.status)}
            {" · "}
            {formatDuration(interview.duration)}
            {interview.topic ? ` · ${interview.topic}` : ""}
            {" · "}
            {new Date(interview.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(interview._id, interview.title);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onDelete(interview._id, interview.title);
            }
          }}
          className="shrink-0 p-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-destructive/10"
          aria-label="Delete sitting"
          title="Delete"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </span>
        <span className="shrink-0 font-mono text-[11px] tracking-widest uppercase text-muted-foreground group-hover:text-foreground">
          Open →
        </span>
      </button>
    </li>
  );
}

function EmptyRack({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="border border-border bg-card">
      <div className="border-b border-border px-5 py-10 text-center sm:px-10">
        <p className="mb-3 font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
          Empty rack
        </p>
        <h3
          className="mb-3 text-2xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          No sittings yet
        </h3>
        <p className="mx-auto mb-8 max-w-md text-muted-foreground">
          Load a tape, pin the lines that matter, put them on the wall.
        </p>
        <Button
          size="lg"
          onClick={onCreate}
          className="h-12 px-6 font-mono text-xs uppercase tracking-widest"
        >
          <Plus className="mr-2 h-4 w-4" />
          Load a tape
        </Button>
      </div>
      <ol className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          { n: "01", t: "Record", d: "Drop audio or video" },
          { n: "02", t: "Pin", d: "Select a line on the tape" },
          { n: "03", t: "Map", d: "Cluster on the wall" },
        ].map((step) => (
          <li key={step.n} className="px-5 py-6">
            <p className="mb-2 font-mono text-[11px] tracking-widest text-muted-foreground">
              {step.n}
            </p>
            <h4
              className="mb-1 text-lg font-semibold"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              {step.t}
            </h4>
            <p className="text-sm text-muted-foreground">{step.d}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ProjectContent({ projectId }: ProjectContentProps) {
  const router = useRouter();
  const { userId } = useAuth();
  const { user } = useUser();

  const project = useQuery(api.projects.getProjectForInvite, { projectId });
  const interviews = useQuery(api.interviews.getProjectInterviews, {
    projectId,
  });
  const insights = useQuery(api.insights.getByProject, { projectId });
  const affinityMap = useQuery(api.affinityMaps.getCurrent, { projectId });
  const consolidateProjectMaps = useMutation(
    api.affinityMaps.consolidateProjectMaps
  );
  const deleteInterview = useAction(api.interviews.deleteInterview);
  const deleteProject = useMutation(api.projects.deleteProject);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<{
    id: Id<"interviews">;
    title: string;
  } | null>(null);
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [tapePeek, setTapePeek] = useState<TapePeekTarget | null>(null);

  const mapId = affinityMap?._id;
  const figJamElementsRaw = useQuery(
    api.affinityMaps.getFigJamElements,
    mapId ? { mapId } : "skip"
  );
  const figJamElements =
    figJamElementsRaw && typeof figJamElementsRaw === "object"
      ? liveFigJamElements(figJamElementsRaw as Record<string, unknown>)
      : null;

  useEffect(() => {
    if (!affinityMap) return;
    void consolidateProjectMaps({ projectId }).catch(() => undefined);
  }, [affinityMap?._id, projectId, consolidateProjectMaps]);

  const figJamStickies = (() => {
    if (!mapId || !figJamElements) return [] as Array<{
      clusterId?: string | null;
      parentSectionId?: string | null;
    }>;
    return Object.values(figJamElements).flatMap((el) => {
      if (!el || typeof el !== "object" || el.type !== "sticky") return [];
      const sticky = el as {
        type: "sticky";
        clusterId?: string | null;
        parentSectionId?: string | null;
      };
      return [sticky];
    });
  })();
  const totalInsights =
    mapId && figJamElements ? figJamStickies.length : insights?.length || 0;
  const totalInterviews = interviews?.length || 0;
  const groupedInsights = figJamStickies.filter((el) =>
    Boolean(el.clusterId || el.parentSectionId)
  ).length;

  useEffect(() => {
    if (!project || !userId || !user?.emailAddresses?.[0]?.emailAddress) return;

    const userEmail = user.emailAddresses[0].emailAddress;
    const isOwner = project.ownerId === userId;
    const isMember = project.members.some(
      (m: { userId: string }) => m.userId === userId
    );
    const isInvitedByEmail = project.members.some(
      (m: { email?: string }) => m.email === userEmail
    );

    if (!isOwner && !isMember) {
      router.push("/project");
      return;
    }

    if (isInvitedByEmail && !isMember) {
      router.push(
        `/invite/${projectId}?email=${encodeURIComponent(userEmail)}`
      );
    }
  }, [project, userId, user, projectId, router]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        setFindOpen(true);
      }
      if (event.key === "Escape") {
        setTapePeek(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleDeleteInterview = (id: Id<"interviews">, title: string) => {
    setInterviewToDelete({ id, title });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!interviewToDelete) return;

    try {
      const interview = interviews?.find((i) => i._id === interviewToDelete.id);
      if (interview?.audioUrl) {
        await fetch("/api/delete-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileUrl: interview.audioUrl }),
        });
      }
      await deleteInterview({ interviewId: interviewToDelete.id });
      toast.success("Sitting deleted");
      setDeleteDialogOpen(false);
    } catch {
      toast.error("Could not delete sitting");
    }
  };

  const confirmDeleteProject = async () => {
    try {
      await deleteProject({ projectId });
      toast.success("Session deleted");
      setDeleteProjectDialogOpen(false);
      router.push("/project");
    } catch {
      toast.error("Could not delete session");
    }
  };

  if (!project) {
    return (
      <div className="border border-border bg-card px-5 py-16 text-center">
        <p className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">
          Loading session…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-3 font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
            Unit · session
          </p>
          <h1
            className="mb-2 text-3xl font-semibold tracking-tight lg:text-4xl"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            {project.name}
          </h1>
          {project.description ? (
            <p className="mb-3 max-w-xl text-muted-foreground">
              {project.description}
            </p>
          ) : null}
          <p className="font-mono text-[11px] text-muted-foreground">
            Opened{" "}
            {new Date(project.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            {" · "}
            {project.members.length} crew
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {project.ownerId === userId && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDeleteProjectDialogOpen(true)}
              className="h-10 w-10 border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
              title="Delete session"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <FindStudyDialog
            projectId={projectId}
            open={findOpen}
            onOpenChange={setFindOpen}
            onPick={setTapePeek}
          />
          <ShareProjectModal
            projectId={projectId}
            projectName={project.name}
          />
          {project.ownerId === userId && (
            <Button
              variant="outline"
              onClick={() => setTeamDialogOpen(true)}
              className="h-10 font-mono text-xs uppercase tracking-widest"
            >
              Crew
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => router.push(`/project/${projectId}/affinity/`)}
            className="h-10 font-mono text-xs uppercase tracking-widest"
          >
            Wall · {totalInsights}
          </Button>
          <Button
            onClick={() => router.push(`/project/${projectId}/interview/`)}
            className="h-10 font-mono text-xs uppercase tracking-widest"
          >
            <Plus className="mr-2 h-4 w-4" />
            New sitting
          </Button>
        </div>
      </div>

      {totalInterviews > 0 && (
        <div className="flex flex-col gap-4 border border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-sm tracking-wide">
            {totalInterviews}{" "}
            {totalInterviews === 1 ? "sitting" : "sittings"}
            <span className="text-muted-foreground"> · </span>
            {totalInsights} {totalInsights === 1 ? "pin" : "pins"}
            <span className="text-muted-foreground"> · </span>
            {Math.max(totalInsights - groupedInsights, 0)} still in the tray
          </p>
          <Button
            size="sm"
            onClick={() => router.push(`/project/${projectId}/affinity/`)}
            className="self-start font-mono text-[11px] uppercase tracking-widest"
          >
            Open wall
          </Button>
        </div>
      )}

      <TeamDialog
        projectId={projectId}
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
        trigger={null}
      />

      {tapePeek ? (
        <TapePeek
          projectId={projectId}
          target={tapePeek}
          placement="page"
          onClose={() => setTapePeek(null)}
        />
      ) : null}

      {totalInterviews > 0 ? (
        <section className="border border-border bg-card">
          <div className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-3">
            <h2 className="font-mono text-[11px] tracking-widest uppercase">
              Sittings
            </h2>
            <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {totalInterviews}
            </p>
          </div>
          <ul className="divide-y divide-border">
            {interviews?.map((interview) => (
              <SittingRow
                key={interview._id}
                interview={interview as Sitting}
                projectId={projectId}
                onDelete={handleDeleteInterview}
              />
            ))}
          </ul>
        </section>
      ) : (
        <EmptyRack
          onCreate={() => router.push(`/project/${projectId}/interview/`)}
        />
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle
            className="text-lg"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Delete sitting
          </DialogTitle>
          <p className="text-muted-foreground">
            Drop &quot;{interviewToDelete?.title}&quot;? Tape and pins go with
            it.
          </p>
          <div className="mt-4 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="font-mono text-xs uppercase tracking-widest"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDelete()}
              className="font-mono text-xs uppercase tracking-widest"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteProjectDialogOpen}
        onOpenChange={setDeleteProjectDialogOpen}
      >
        <DialogContent className="max-w-md">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-destructive/30 bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle
              className="text-lg"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Delete session
            </DialogTitle>
          </div>
          <p className="text-muted-foreground">
            Delete &quot;{project.name}&quot;? Sittings, pins, and the wall go
            with it.
          </p>
          <div className="mt-4 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteProjectDialogOpen(false)}
              className="font-mono text-xs uppercase tracking-widest"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDeleteProject()}
              className="font-mono text-xs uppercase tracking-widest"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
