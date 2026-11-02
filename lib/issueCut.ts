import { slipKindFromColor, slipStamp } from "@/lib/slip";

export interface IssueSlip {
  text: string;
  kind?: string;
}

export interface IssueCluster {
  title: string;
  voteCount: number;
  slips: IssueSlip[];
}

export interface IssueCast {
  name: string;
  occupation?: string;
  quote?: string;
  background?: string;
  goals?: string[];
  frustrations?: string[];
}

export interface IssueWallInput {
  projectName: string;
  description?: string;
  clusters: IssueCluster[];
  traySlips?: IssueSlip[];
  cast?: IssueCast[];
  brief?: {
    thesis: string;
    framing: string;
    priorityLead: string;
  };
}

/** @deprecated Legacy sitting-based export shape. */
export interface IssueCutPin {
  type?: string;
  text: string;
}

/** @deprecated */
export interface IssueCutSitting {
  title: string;
  topic?: string;
  summary?: string | null;
  pins?: IssueCutPin[];
}

/** @deprecated */
export interface IssueCutPersona {
  name: string;
  occupation?: string;
  quote?: string;
  background?: string;
  goals?: string[];
  frustrations?: string[];
}

/** @deprecated */
export interface IssueCutInput {
  projectName: string;
  description?: string;
  sittings: IssueCutSitting[];
  personas?: IssueCutPersona[];
}

const EVIDENCE_PER_PACKET = 2;

function sortedByVotes(clusters: IssueCluster[]): IssueCluster[] {
  return [...clusters].sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return a.title.localeCompare(b.title);
  });
}

/** Stakeholder-ready markdown: thesis → Priorities → packets → Cast. */
export function buildWallIssueMarkdown(input: IssueWallInput): string {
  const clusters = sortedByVotes(input.clusters);
  const lines: string[] = [`# ${input.projectName}`, ""];

  if (input.brief?.thesis?.trim()) {
    lines.push(input.brief.thesis.trim(), "");
  } else if (input.description?.trim()) {
    lines.push(input.description.trim(), "");
  }

  if (input.brief?.framing?.trim()) {
    lines.push(`_${input.brief.framing.trim()}_`, "");
  }

  if (input.brief?.priorityLead?.trim()) {
    lines.push(`**${input.brief.priorityLead.trim()}**`, "");
  }

  const voted = clusters.filter((c) => c.voteCount > 0);
  if (voted.length > 0) {
    lines.push("## What the team prioritized", "");
    voted.forEach((cluster, index) => {
      const lead = cluster.slips[0]?.text;
      lines.push(
        `${index + 1}. **${cluster.title}** — ×${cluster.voteCount}${
          lead ? ` — ${lead}` : ""
        }`
      );
    });
    lines.push("");
  }

  lines.push("## Themes", "");

  if (clusters.length === 0) {
    lines.push("_No themes on the wall yet._", "");
  }

  for (const cluster of clusters) {
    const rank =
      voted.length > 0 && cluster.voteCount > 0
        ? ` · #${voted.findIndex((c) => c.title === cluster.title) + 1}`
        : "";
    const votes =
      cluster.voteCount > 0 ? ` · ×${cluster.voteCount}` : "";
    lines.push(`### ${cluster.title}${votes}${rank}`, "");

    const evidence = cluster.slips.slice(0, EVIDENCE_PER_PACKET);
    if (evidence.length === 0) {
      lines.push("_No evidence in this theme._", "");
    } else {
      for (const slip of evidence) {
        const stamp = slipStamp(slipKindFromColor(undefined, slip.kind));
        lines.push(`- ${stamp} — ${slip.text}`);
      }
      if (cluster.slips.length > EVIDENCE_PER_PACKET) {
        lines.push(
          `- _+${cluster.slips.length - EVIDENCE_PER_PACKET} more on the wall_`
        );
      }
      lines.push("");
    }
  }

  if (input.traySlips && input.traySlips.length > 0) {
    lines.push("## Still in the tray", "");
    for (const slip of input.traySlips.slice(0, 8)) {
      const stamp = slipStamp(slipKindFromColor(undefined, slip.kind));
      lines.push(`- ${stamp} — ${slip.text}`);
    }
    if (input.traySlips.length > 8) {
      lines.push(`- _+${input.traySlips.length - 8} more_`);
    }
    lines.push("");
  }

  if (input.cast && input.cast.length > 0) {
    lines.push("## Who this is about", "");
    for (const persona of input.cast.slice(0, 2)) {
      lines.push(`### ${persona.name}`, "");
      if (persona.occupation) lines.push(persona.occupation, "");
      if (persona.quote) lines.push(`> ${persona.quote}`, "");
      if (persona.goals && persona.goals.length > 0) {
        lines.push("Goals", ...persona.goals.map((goal) => `- ${goal}`), "");
      }
      if (persona.frustrations && persona.frustrations.length > 0) {
        lines.push(
          "Frustrations",
          ...persona.frustrations.map((item) => `- ${item}`),
          ""
        );
      }
    }
  }

  lines.push("_Quote — said in a sitting · Pain — friction · Follow-up — still open_", "");

  return lines.join("\n").trim() + "\n";
}

/** @deprecated Prefer buildWallIssueMarkdown */
export function buildIssueMarkdown(input: IssueCutInput): string {
  return buildWallIssueMarkdown({
    projectName: input.projectName,
    description: input.description,
    clusters: input.sittings.map((sitting) => ({
      title: sitting.title,
      voteCount: 0,
      slips: (sitting.pins ?? []).map((pin) => ({
        text: pin.text,
        kind: pin.type,
      })),
    })),
    cast: input.personas,
  });
}

export function downloadIssueMarkdown(
  projectName: string,
  markdown: string
): void {
  const slug =
    projectName.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "issue";
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug}-issue.md`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
