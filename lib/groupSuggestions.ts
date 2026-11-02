export interface GroupableInsight {
  id: string;
  text: string;
  type: string;
}

export interface NormalizedGroupSuggestion {
  action: "create_new";
  confidence: number;
  reason: string;
  insightIds: string[];
  newGroupTitle: string;
}

const STOP = new Set([
  "that", "this", "with", "from", "have", "been", "would", "could", "should",
  "were", "their", "there", "about", "just", "like", "when", "what", "which",
  "they", "them", "then", "than", "some", "very", "into", "also", "more",
  "really", "because", "thing", "things", "kind", "sort", "much", "many",
  "dont", "didnt", "cant", "wont", "isnt", "wasnt", "yeah", "just",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-zàâäéèêëïîôùûüç0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !STOP.has(word))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const token of a) {
    if (b.has(token)) inter += 1;
  }
  return inter / (a.size + b.size - inter);
}

function titleFromTokens(items: GroupableInsight[]): string {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const token of tokenize(item.text)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1]);
  const top = ranked[0]?.[0];
  if (top) {
    return top.charAt(0).toUpperCase() + top.slice(1);
  }

  const types = new Set(items.map((item) => item.type));
  if (types.has("pain-point") || types.has("pain")) return "Pains";
  if (types.has("follow-up")) return "Follow-ups";
  if (types.has("quote")) return "Quotes";
  return "Packet";
}

function toSuggestion(
  items: GroupableInsight[],
  reason: string,
  confidence: number
): NormalizedGroupSuggestion {
  return {
    action: "create_new",
    confidence,
    reason,
    insightIds: items.map((item) => item.id),
    newGroupTitle: titleFromTokens(items),
  };
}

export function clusterInsights(
  insights: GroupableInsight[]
): NormalizedGroupSuggestion[] {
  if (insights.length < 2) return [];

  const scored = insights.map((insight) => ({
    insight,
    tokens: tokenize(insight.text),
  }));

  const clusters: typeof scored[] = [];
  for (const item of scored) {
    let bestIndex = -1;
    let bestScore = 0;
    clusters.forEach((cluster, index) => {
      if (cluster.length >= 5) return;
      const mean =
        cluster.reduce((sum, other) => sum + jaccard(item.tokens, other.tokens), 0) /
        cluster.length;
      if (mean > bestScore) {
        bestScore = mean;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0 && bestScore >= 0.12) {
      clusters[bestIndex].push(item);
    } else {
      clusters.push([item]);
    }
  }

  return clusters
    .map((cluster) => cluster.map((entry) => entry.insight))
    .filter((cluster) => cluster.length >= 2)
    .slice(0, 5)
    .map((cluster) =>
      toSuggestion(
        cluster,
        `${cluster.length} slips share a theme`,
        0.55 + Math.min(0.25, cluster.length * 0.05)
      )
    );
}

function chunkByType(items: GroupableInsight[]): GroupableInsight[][] {
  const buckets = new Map<string, GroupableInsight[]>();
  for (const item of items) {
    const key = item.type || "other";
    const bucket = buckets.get(key) ?? [];
    bucket.push(item);
    buckets.set(key, bucket);
  }
  return [...buckets.values()].filter((bucket) => bucket.length >= 2);
}

function chunkFixed(items: GroupableInsight[], size: number): GroupableInsight[][] {
  const chunks: GroupableInsight[][] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    if (chunk.length >= 2) chunks.push(chunk);
  }
  return chunks;
}

export function normalizeGroupSuggestions(
  insights: GroupableInsight[],
  raw: Array<{
    action?: string;
    confidence?: number;
    reason?: string;
    insightIds?: string[];
    newGroupTitle?: string;
    targetGroupId?: string;
  }>
): NormalizedGroupSuggestion[] {
  const byId = new Map(insights.map((insight) => [insight.id, insight]));
  const maxSize = Math.min(5, Math.max(3, Math.ceil(insights.length / 3)));
  const used = new Set<string>();
  const out: NormalizedGroupSuggestion[] = [];

  const takeCluster = (items: GroupableInsight[], reason: string, confidence: number) => {
    const fresh = items.filter((item) => !used.has(item.id));
    if (fresh.length < 2) return;
    fresh.forEach((item) => used.add(item.id));
    out.push(toSuggestion(fresh, reason, confidence));
  };

  for (const suggestion of raw) {
    const ids = [...new Set((suggestion.insightIds ?? []).filter((id) => byId.has(id) && !used.has(id)))];
    if (ids.length < 2) continue;
    const items = ids.map((id) => byId.get(id)!);

    if (ids.length > maxSize) {
      const split = clusterInsights(items);
      if (split.length >= 2) {
        for (const part of split) {
          takeCluster(
            part.insightIds.map((id) => byId.get(id)!).filter(Boolean),
            part.reason,
            part.confidence
          );
        }
        continue;
      }
      const typed = chunkByType(items);
      if (typed.length >= 2) {
        for (const group of typed) takeCluster(group, "Same pin kind", 0.5);
        continue;
      }
      for (const chunk of chunkFixed(items, 4)) {
        takeCluster(chunk, "Split stack", 0.45);
      }
      continue;
    }

    takeCluster(
      items,
      suggestion.reason || `${items.length} related slips`,
      suggestion.confidence ?? 0.6
    );
    if (suggestion.newGroupTitle?.trim()) {
      const last = out[out.length - 1];
      if (last) last.newGroupTitle = suggestion.newGroupTitle.trim();
    }
  }

  const coverage = out.reduce((sum, group) => sum + group.insightIds.length, 0);
  const mega =
    out.length <= 1 &&
    insights.length >= 6 &&
    coverage >= Math.max(6, Math.ceil(insights.length * 0.7));

  if (mega || out.length === 0) {
    return clusterInsights(insights);
  }

  return out.slice(0, 5);
}
