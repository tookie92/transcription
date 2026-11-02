"use client";

import { useState } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SlipFace,
  SlipStamp,
  slipKindOf,
} from "@/components/myComponents/affinity/SlipFace";
import {
  buildIssueMarkdown,
  buildWallIssueMarkdown,
  downloadIssueMarkdown,
} from "@/lib/issueCut";
import { CastFiche } from "@/components/myComponents/CastFiche";
import { IssueSignalStrip } from "@/components/myComponents/IssueSignalStrip";

interface ProjectShareViewProps {
  token: string;
}

interface InsightRow {
  _id: string;
  type?: string;
  text: string;
  timestamp?: number;
}

interface SittingRow {
  id: string;
  title: string;
  topic?: string;
  summary?: {
    executiveSummary?: string;
  } | null;
  insights?: InsightRow[];
}

interface PersonaRow {
  name: string;
  occupation?: string;
  quote?: string;
  background?: string;
  goals?: string[];
  frustrations?: string[];
}

interface WallSlip {
  id: string;
  text: string;
  kind?: string;
}

interface WallCluster {
  id: string;
  title: string;
  voteCount: number;
  slips: WallSlip[];
}

interface WallSnapshot {
  capturedAt: number;
  clusters: WallCluster[];
  traySlips?: WallSlip[];
  cast?: PersonaRow[];
  brief?: {
    thesis: string;
    framing: string;
    priorityLead: string;
  };
}

function SlipList({
  slips,
  limit,
}: {
  slips: WallSlip[];
  limit?: number;
}) {
  const shown = limit != null ? slips.slice(0, limit) : slips;
  const more = limit != null ? Math.max(0, slips.length - limit) : 0;

  if (slips.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">No evidence in this theme.</p>
    );
  }
  return (
    <ul className="mt-6 space-y-3">
      {shown.map((slip) => {
        const kind = slipKindOf(undefined, slip.kind);
        return (
          <li key={slip.id}>
            <SlipFace kind={kind} className="px-4 py-3">
              <SlipStamp kind={kind} />
              <p className="mt-1 text-sm leading-relaxed">{slip.text}</p>
            </SlipFace>
          </li>
        );
      })}
      {more > 0 ? (
        <li className="font-mono text-[11px] text-muted-foreground">
          +{more} more on the wall
        </li>
      ) : null}
    </ul>
  );
}

function PrioritiesStrip({ clusters }: { clusters: WallCluster[] }) {
  const voted = clusters.filter((c) => c.voteCount > 0);
  if (voted.length === 0) return null;

  return (
    <section className="border-b border-border py-10">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        After Flip
      </p>
      <h2
        className="mt-2 text-2xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--font-display), sans-serif" }}
      >
        What the team prioritized
      </h2>
      <ol className="mt-6 space-y-4">
        {voted.map((cluster, index) => {
          const lead = cluster.slips[0];
          return (
            <li
              key={cluster.id}
              className="border border-border bg-card px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex min-w-0 items-baseline gap-3">
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="truncate text-lg text-foreground"
                    style={{ fontFamily: "var(--font-display), sans-serif" }}
                  >
                    {cluster.title}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                  ×{cluster.voteCount}
                </span>
              </div>
              {lead ? (
                <p className="mt-2 pl-8 text-sm leading-relaxed text-muted-foreground">
                  {lead.text}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ClusterBrief({
  cluster,
  rank,
}: {
  cluster: WallCluster;
  rank: number | null;
}) {
  return (
    <article className="border-b border-border py-10">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Theme
          {rank != null ? ` · #${rank}` : ""}
        </p>
        {cluster.voteCount > 0 ? (
          <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
            ×{cluster.voteCount}
          </p>
        ) : null}
      </div>
      <h2
        className="mt-2 text-3xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--font-display), sans-serif" }}
      >
        {cluster.title}
      </h2>
      <SlipList slips={cluster.slips} limit={2} />
    </article>
  );
}

function SittingBrief({ sitting }: { sitting: SittingRow }) {
  const pins = sitting.insights ?? [];
  const summary = sitting.summary?.executiveSummary;

  return (
    <article className="border-b border-border py-10">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Sitting
      </p>
      <h2
        className="mt-2 text-3xl font-normal tracking-tight"
        style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
      >
        {sitting.title}
      </h2>
      {sitting.topic ? (
        <p className="mt-1 text-sm text-muted-foreground">{sitting.topic}</p>
      ) : null}
      {summary ? (
        <p
          className="mt-6 max-w-2xl text-lg leading-relaxed text-foreground"
          style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
        >
          {summary}
        </p>
      ) : null}
      {pins.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {pins.map((pin) => {
            const kind = slipKindOf(undefined, pin.type);
            return (
              <li key={pin._id}>
                <SlipFace kind={kind} className="px-4 py-3">
                  <SlipStamp kind={kind} />
                  <p className="mt-1 text-sm leading-relaxed">{pin.text}</p>
                </SlipFace>
              </li>
            );
          })}
        </ul>
      ) : null}
    </article>
  );
}

export function ProjectShareView({ token }: ProjectShareViewProps) {
  const [code, setCode] = useState("");
  const [submittedCode, setSubmittedCode] = useState("");

  const data = useConvexQuery(api.projectSharing.getProjectShareData, {
    shareToken: token,
    password: submittedCode || undefined,
  });

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background kit-grain kit-mat">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Opening…
        </p>
      </div>
    );
  }

  if ("error" in data) {
    const locked = data.error === "password_required";
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 kit-grain kit-mat">
        <div className="w-full max-w-md border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <p
              className="text-lg text-foreground"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Issue
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {locked
                ? "This Issue is locked. Enter the code."
                : data.error === "expired"
                  ? "This Issue has expired."
                  : "This Issue is gone."}
            </p>
          </div>
          {locked ? (
            <form
              className="px-5 py-4"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmittedCode(code.trim());
              }}
            >
              <Input
                type="text"
                autoComplete="off"
                placeholder="code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="rounded-none"
              />
              <Button
                type="submit"
                className="mt-3 w-full font-mono text-[11px] uppercase tracking-widest"
              >
                Open
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    );
  }

  const { project } = data;
  const wall = (data.wall as WallSnapshot | null) ?? null;
  const sittings: SittingRow[] = (data.interviews?.filter(Boolean) ??
    []) as SittingRow[];
  const personas: PersonaRow[] = (
    wall?.cast ??
    (Array.isArray(data.personas) ? data.personas.filter(Boolean) : [])
  ) as PersonaRow[];

  const handleExport = () => {
    if (wall) {
      downloadIssueMarkdown(
        project.name,
        buildWallIssueMarkdown({
          projectName: project.name,
          description: project.description,
          clusters: wall.clusters,
          traySlips: wall.traySlips,
          cast: wall.cast,
          brief: wall.brief,
        })
      );
      return;
    }
    downloadIssueMarkdown(
      project.name,
      buildIssueMarkdown({
        projectName: project.name,
        description: project.description,
        sittings: sittings.map((sitting) => ({
          title: sitting.title,
          topic: sitting.topic,
          summary: sitting.summary?.executiveSummary,
          pins: sitting.insights,
        })),
        personas,
      })
    );
  };

  const empty =
    wall != null
      ? wall.clusters.length === 0 &&
        (wall.traySlips?.length ?? 0) === 0 &&
        personas.length === 0
      : sittings.length === 0 && personas.length === 0;

  const castShown = personas.slice(0, 2);
  const brief = wall?.brief;

  return (
    <div className="min-h-screen bg-background kit-grain kit-mat print:bg-white">
      <header className="sticky top-0 z-10 border-b border-border bg-background print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logomark.svg" alt="Skripta" className="h-7 w-7" />
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{project.name}</p>
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Issue
                {wall
                  ? ` · ${new Date(wall.capturedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 font-mono text-[11px] uppercase tracking-widest"
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 font-mono text-[11px] uppercase tracking-widest"
              onClick={() => window.print()}
            >
              Print
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16">
        {wall ? (
          <>
            <section className="border-b border-border py-10">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Issue
                {` · ${new Date(wall.capturedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}`}
              </p>
              {brief?.thesis ? (
                <h1
                  className="mt-4 text-2xl font-normal leading-snug tracking-tight text-foreground md:text-3xl"
                  style={{ fontFamily: "var(--font-display), sans-serif" }}
                >
                  {brief.thesis}
                </h1>
              ) : project.description ? (
                <p
                  className="mt-4 text-xl leading-relaxed text-muted-foreground"
                  style={{
                    fontFamily: "var(--font-display), sans-serif",
                    fontStyle: "italic",
                  }}
                >
                  {project.description}
                </p>
              ) : (
                <h1
                  className="mt-4 text-2xl font-normal tracking-tight text-foreground"
                  style={{ fontFamily: "var(--font-display), sans-serif" }}
                >
                  {project.name}
                </h1>
              )}
              {brief?.framing ? (
                <p className="mt-3 text-sm text-muted-foreground">{brief.framing}</p>
              ) : null}
              {brief?.priorityLead ? (
                <p
                  className="mt-6 border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground"
                >
                  {brief.priorityLead}
                </p>
              ) : null}
            </section>
            <PrioritiesStrip clusters={wall.clusters} />
            {wall.clusters.length > 0 ? (
              <p className="border-b border-border py-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
                <span className="text-foreground">Quote</span> — said in a sitting
                {" · "}
                <span className="text-foreground">Pain</span> — friction
                {" · "}
                <span className="text-foreground">Follow-up</span> — still open
              </p>
            ) : null}
            {wall.clusters.map((cluster) => {
              const voted = wall.clusters.filter((c) => c.voteCount > 0);
              const rankIndex = voted.findIndex((c) => c.id === cluster.id);
              return (
                <ClusterBrief
                  key={cluster.id}
                  cluster={cluster}
                  rank={rankIndex >= 0 ? rankIndex + 1 : null}
                />
              );
            })}
            {wall.traySlips && wall.traySlips.length > 0 ? (
              <article className="border-b border-border py-10">
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Tray
                </p>
                <h2
                  className="mt-2 text-2xl font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-display), sans-serif" }}
                >
                  Still in the tray
                </h2>
                <SlipList slips={wall.traySlips} limit={8} />
              </article>
            ) : null}
            {castShown.length > 0 ? (
              <section className="border-b border-border py-10">
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Cast
                </p>
                <h2
                  className="mt-2 text-2xl font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-display), sans-serif" }}
                >
                  Who this is about
                </h2>
                <div className="mt-6 space-y-8">
                  {castShown.map((persona) => (
                    <CastFiche key={persona.name} persona={persona} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <>
            {sittings.map((sitting) => (
              <SittingBrief key={sitting.id} sitting={sitting} />
            ))}
            {personas.map((persona) => (
              <div key={persona.name} className="border-b border-border py-8">
                <CastFiche persona={persona} />
              </div>
            ))}
          </>
        )}
        {empty ? (
          <p className="py-16 text-sm text-muted-foreground">
            This Issue is empty.
          </p>
        ) : null}
        <IssueSignalStrip shareToken={token} projectName={project.name} />
      </main>
    </div>
  );
}
