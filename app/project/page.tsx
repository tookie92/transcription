"use client";

export const dynamic = "force-dynamic";

import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RefreshCcwIcon, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserButton, useAuth, useUser } from "@clerk/nextjs";
import Image from "next/image";
import { cn } from "@/lib/utils";

type ProjectRow = {
  _id: Id<"projects">;
  name: string;
  description?: string;
  members: Array<{ userId: string; role: string; invitedBy?: string }>;
  updatedAt: number;
};

function formatStamp(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function SessionRow({
  project,
  onOpen,
  onDelete,
}: {
  project: ProjectRow;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  const crew = project.members.length;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left",
          "transition-colors duration-150 ease-out hover:bg-accent/60"
        )}
      >
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-base text-foreground"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            {project.name}
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
            {project.description?.trim() || "No brief yet"}
            {" · "}
            {crew} crew
            {" · "}
            {formatStamp(project.updatedAt)}
          </p>
        </div>
        {onDelete && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }
            }}
            className="shrink-0 p-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-destructive/10"
            aria-label="Delete session"
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </span>
        )}
        <span className="shrink-0 font-mono text-[11px] tracking-widest uppercase text-muted-foreground group-hover:text-foreground">
          Open →
        </span>
      </button>
    </li>
  );
}

function SessionBlock({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10 border border-border bg-card">
      <div className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-3">
        <h2 className="font-mono text-[11px] tracking-widest uppercase">{label}</h2>
        <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {count}
        </p>
      </div>
      <ul className="divide-y divide-border">{children}</ul>
    </section>
  );
}

const ProjectPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId } = useAuth();
  const { user } = useUser();
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [mounted, setMounted] = useState(false);
  const openedNewRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  const projects = useQuery(api.projects.getUserProjects, {
    userEmail,
  });
  const createProject = useMutation(api.projects.createProject);
  const acceptInvite = useMutation(api.projects.claimInvite);
  const declineInvite = useMutation(api.projects.declineInvite);
  const deleteProject = useMutation(api.projects.deleteProject);

  // Landing / signup → open create dialog once (empty rack or ?new=1).
  useEffect(() => {
    if (!mounted || projects === undefined || openedNewRef.current) return;
    const wantsNew = searchParams.get("new") === "1";
    if (wantsNew || projects.length === 0) {
      openedNewRef.current = true;
      setShowCreateDialog(true);
      if (wantsNew) {
        router.replace("/project");
      }
    }
  }, [mounted, projects, searchParams, router]);

  const ownerProjects =
    projects?.filter((project) => project.ownerId === userId) || [];
  const memberProjects =
    projects?.filter(
      (project) =>
        project.ownerId !== userId &&
        project.members.some(
          (m) => m.userId === userId || m.userId === userEmail
        )
    ) || [];

  const pendingInvitations =
    projects?.flatMap((project) =>
      project.members
        .filter((m) => m.userId.includes("@") && m.userId === userEmail)
        .map((m) => ({
          projectId: project._id,
          projectName: project.name,
          email: m.userId,
          role: m.role,
          invitedBy: m.invitedBy,
        }))
    ) || [];

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error("Name the session");
      return;
    }
    setIsCreating(true);
    try {
      const result = await createProject({
        name: projectName,
      });
      toast.success("Session opened");
      setShowCreateDialog(false);
      setProjectName("");
      router.push(`/project/${result}`);
    } catch {
      toast.error("Could not open session");
    } finally {
      setIsCreating(false);
    }
  };

  const handleAcceptInvite = async (invite: {
    projectId: string;
    email: string;
  }) => {
    try {
      await acceptInvite({
        projectId: invite.projectId as Id<"projects">,
        email: invite.email,
      });
      toast.success("You sat in");
    } catch {
      toast.error("Could not join");
    }
  };

  const handleDeclineInvite = async (invite: {
    projectId: string;
    email: string;
  }) => {
    try {
      await declineInvite({
        projectId: invite.projectId as Id<"projects">,
        email: invite.email,
      });
      toast.success("Pass skipped");
    } catch {
      toast.error("Could not skip");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (
      !confirm(
        "Delete this session? Tape, pins, and the wall go with it."
      )
    ) {
      return;
    }
    try {
      await deleteProject({ projectId: projectId as Id<"projects"> });
      toast.success("Session deleted");
      router.push("/project");
    } catch {
      toast.error("Could not delete");
    }
  };

  if (!mounted) {
    return <div className="min-h-dvh w-full bg-background kit-grain kit-mat" />;
  }

  return (
    <div className="min-h-dvh w-full bg-background text-foreground kit-grain kit-mat">
      <header className="sticky top-0 z-50 border-b border-border bg-background px-5 lg:px-12">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 py-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex min-w-0 cursor-pointer items-center gap-5"
          >
            <Image
              height={44}
              width={132}
              src="/logo.svg"
              alt="Skripta"
              className="h-9 w-auto"
              priority
            />
            <span className="hidden truncate font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground sm:inline">
              Field kit · sessions
            </span>
          </button>

          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle />
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              disabled={isCreating}
              className="h-9 px-4 font-mono text-xs uppercase tracking-widest"
            >
              {isCreating ? (
                <RefreshCcwIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Open a session
            </Button>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="px-5 py-12 lg:px-12 lg:py-16">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="mb-12">
            <p className="mb-3 font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
              Unit · sessions
            </p>
            <h1
              className="mb-3 text-4xl font-semibold tracking-tight md:text-5xl"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Sessions
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Open a study, sit the tapes, pin the wall.
              {projects && projects.length > 0
                ? ` ${projects.length} on the rack.`
                : ""}
            </p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle
                  className="text-xl"
                  style={{ fontFamily: "var(--font-display), sans-serif" }}
                >
                  Open a session
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-2">
                <div className="space-y-2">
                  <label className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">
                    Name
                  </label>
                  <Input
                    placeholder="Study name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && void handleCreateProject()
                    }
                    autoFocus
                    className="h-11"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                    className="font-mono text-xs uppercase tracking-widest"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => void handleCreateProject()}
                    disabled={!projectName.trim() || isCreating}
                    className="font-mono text-xs uppercase tracking-widest"
                  >
                    {isCreating && (
                      <RefreshCcwIcon className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Open
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {pendingInvitations.length > 0 && (
            <section className="mb-10 border border-border bg-card">
              <div className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-3">
                <h2 className="font-mono text-[11px] tracking-widest uppercase">
                  Passes
                </h2>
                <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {pendingInvitations.length} waiting
                </p>
              </div>
              <ul className="divide-y divide-border">
                {pendingInvitations.map((invite) => (
                  <li
                    key={`${invite.projectId}-${invite.email}`}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">{invite.projectName}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        From {invite.invitedBy || "the lead"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        className="font-mono text-[11px] uppercase tracking-widest"
                        onClick={() => void handleAcceptInvite(invite)}
                      >
                        Sit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="font-mono text-[11px] uppercase tracking-widest"
                        onClick={() => void handleDeclineInvite(invite)}
                      >
                        Skip
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {projects === undefined ? (
            <div className="border border-border bg-card px-5 py-16 text-center">
              <p className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">
                Loading rack…
              </p>
            </div>
          ) : projects.length === 0 ? (
            <div className="border border-border bg-card">
              <div className="border-b border-border px-5 py-10 text-center sm:px-10">
                <p className="mb-3 font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
                  Empty rack
                </p>
                <h2
                  className="mb-3 text-3xl font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-display), sans-serif" }}
                >
                  No sessions yet
                </h2>
                <p className="mx-auto mb-8 max-w-md text-muted-foreground">
                  Open a study, load a tape, pin what matters on the wall.
                </p>
                <Button
                  size="lg"
                  onClick={() => setShowCreateDialog(true)}
                  className="h-12 px-6 font-mono text-xs uppercase tracking-widest"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Open a session
                </Button>
              </div>

              <ol className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {[
                  {
                    n: "01",
                    t: "Tape",
                    d: "Drop audio or video. Speakers land on the transcript.",
                  },
                  {
                    n: "02",
                    t: "Pins",
                    d: "Mark quote, pain, follow-up — slips for the wall.",
                  },
                  {
                    n: "03",
                    t: "Wall",
                    d: "Cluster live. Vote. Share a readout when the room leaves.",
                  },
                ].map((step) => (
                  <li key={step.n} className="px-5 py-6">
                    <p className="mb-2 font-mono text-[11px] tracking-widest text-muted-foreground">
                      {step.n}
                    </p>
                    <h3
                      className="mb-2 text-xl font-semibold"
                      style={{ fontFamily: "var(--font-display), sans-serif" }}
                    >
                      {step.t}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.d}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <>
              {ownerProjects.length > 0 && (
                <SessionBlock label="Yours" count={ownerProjects.length}>
                  {ownerProjects.map((project) => (
                    <SessionRow
                      key={project._id}
                      project={project as ProjectRow}
                      onOpen={() => router.push(`/project/${project._id}`)}
                      onDelete={() => void handleDeleteProject(project._id)}
                    />
                  ))}
                </SessionBlock>
              )}

              {memberProjects.length > 0 && (
                <SessionBlock label="Shared" count={memberProjects.length}>
                  {memberProjects.map((project) => (
                    <SessionRow
                      key={project._id}
                      project={project as ProjectRow}
                      onOpen={() => router.push(`/project/${project._id}`)}
                    />
                  ))}
                </SessionBlock>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default function ProjectPageWithSuspense() {
  return (
    <Suspense
      fallback={<div className="min-h-dvh w-full bg-background kit-grain kit-mat" />}
    >
      <ProjectPage />
    </Suspense>
  );
}
