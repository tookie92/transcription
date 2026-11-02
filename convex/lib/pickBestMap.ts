/**
 * Pick the affinity map that actually holds the wall work.
 * Prefer packets (labels) + grouped slips over a bare sticky dump /
 * stale isCurrent flag.
 */

export function countLiveFigJamElements(map: {
  figJamElements?: unknown;
}): number {
  const stored = map.figJamElements;
  if (!stored || typeof stored !== "object") return 0;
  let count = 0;
  for (const value of Object.values(stored as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    if ((value as { deleted?: unknown }).deleted === true) continue;
    count += 1;
  }
  return count;
}

export function mapWallScore(map: { figJamElements?: unknown }): number {
  const stored = map.figJamElements;
  if (!stored || typeof stored !== "object") return 0;

  let labels = 0;
  let stickies = 0;
  let grouped = 0;

  for (const value of Object.values(stored as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    if ((value as { deleted?: unknown }).deleted === true) continue;
    const el = value as {
      type?: string;
      clusterId?: string | null;
      parentSectionId?: string | null;
    };
    if (el.type === "label" || el.type === "section") {
      labels += 1;
      continue;
    }
    if (el.type === "sticky") {
      stickies += 1;
      if (el.clusterId || el.parentSectionId) grouped += 1;
    }
  }

  // Packets dominate; grouped slips next; raw stickies last.
  return labels * 10_000 + grouped * 100 + stickies;
}

export function pickBestMap<
  T extends {
    isCurrent: boolean;
    updatedAt: number;
    figJamElements?: unknown;
  },
>(maps: T[]): T | null {
  if (maps.length === 0) return null;

  const ranked = [...maps].sort((a, b) => {
    const byScore = mapWallScore(b) - mapWallScore(a);
    if (byScore !== 0) return byScore;
    const byContent = countLiveFigJamElements(b) - countLiveFigJamElements(a);
    if (byContent !== 0) return byContent;
    return b.updatedAt - a.updatedAt;
  });

  const best = ranked[0];
  if (!best) return null;
  if (mapWallScore(best) > 0 || countLiveFigJamElements(best) > 0) return best;
  return maps.find((map) => map.isCurrent) ?? best;
}
