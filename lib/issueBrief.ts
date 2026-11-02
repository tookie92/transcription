export interface IssueBrief {
  thesis: string;
  framing: string;
  priorityLead: string;
}

export interface IssueBriefCluster {
  title: string;
  voteCount: number;
  slips: Array<{ text: string; kind?: string }>;
}

export interface IssueBriefInput {
  projectName: string;
  description?: string;
  sittingCount?: number;
  clusters: IssueBriefCluster[];
  castNames?: string[];
}

/** Deterministic brief when Groq is unavailable. */
export function buildIssueBriefFallback(input: IssueBriefInput): IssueBrief {
  const sorted = [...input.clusters].sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return a.title.localeCompare(b.title);
  });
  const top = sorted.find((c) => c.voteCount > 0) ?? sorted[0];
  const leadSlip = top?.slips[0]?.text?.trim();
  const sittings = input.sittingCount ?? 0;
  const packetCount = input.clusters.length;
  const voteTotal = input.clusters.reduce((sum, c) => sum + c.voteCount, 0);

  const thesis = top
    ? leadSlip
      ? `${top.title}: ${leadSlip.slice(0, 180)}`
      : `Priority after the team vote: ${top.title}.`
    : `Field brief for ${input.projectName}.`;

  const framingParts = [
    sittings > 0
      ? `${sittings} sitting${sittings === 1 ? "" : "s"}`
      : null,
    `${packetCount} theme${packetCount === 1 ? "" : "s"}`,
    voteTotal > 0 ? "team vote on the wall" : "wall map",
  ].filter(Boolean);

  const priorityLead = top
    ? top.voteCount > 0
      ? `#1 ${top.title} (×${top.voteCount})${leadSlip ? ` — ${leadSlip.slice(0, 120)}` : ""}`
      : top.title
    : "";

  return {
    thesis: thesis.slice(0, 400),
    framing: framingParts.join(" → ").slice(0, 240),
    priorityLead: priorityLead.slice(0, 280),
  };
}
