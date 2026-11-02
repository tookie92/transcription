import type { FigJamElement, StickyNoteData } from "@/types/figjam";

export interface FigJamTombstone {
  id: string;
  deleted: true;
  updatedAt: number;
}

export type FigJamStoredElement = FigJamElement | FigJamTombstone;

export function isFigJamTombstone(value: unknown): value is FigJamTombstone {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.deleted === true;
}

function storedUpdatedAt(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const updatedAt = (value as { updatedAt?: unknown }).updatedAt;
  return typeof updatedAt === "number" ? updatedAt : 0;
}

export function liveFigJamElements(
  stored: Record<string, unknown> | null | undefined
): Record<string, FigJamElement> {
  const live: Record<string, FigJamElement> = {};
  if (!stored) return live;
  for (const [id, value] of Object.entries(stored)) {
    if (!value || typeof value !== "object") continue;
    if (isFigJamTombstone(value)) continue;
    live[id] = value as FigJamElement;
  }
  return live;
}

export function mergeFigJamStored(
  current: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, FigJamStoredElement> {
  const result: Record<string, FigJamStoredElement> = {
    ...(current as Record<string, FigJamStoredElement>),
  };

  for (const [id, incomingEl] of Object.entries(incoming)) {
    if (!incomingEl || typeof incomingEl !== "object") continue;
    const existing = result[id];
    if (!existing || storedUpdatedAt(incomingEl) >= storedUpdatedAt(existing)) {
      result[id] = incomingEl as FigJamStoredElement;
    }
  }

  return result;
}

function stickyGroupId(el: FigJamElement): string | null {
  if (el.type !== "sticky") return null;
  const sticky = el as StickyNoteData;
  return sticky.clusterId ?? sticky.parentSectionId ?? null;
}

/**
 * Prefer local grouping when remote would clear cluster membership with a
 * same-or-older clock. Prevents a stale stickies-only save from wiping packets.
 */
function mergeStickyRemote(
  local: FigJamElement,
  remote: FigJamElement
): FigJamElement {
  if (local.type !== "sticky" || remote.type !== "sticky") return remote;

  const localSticky = local as StickyNoteData;
  const remoteSticky = remote as StickyNoteData;
  const localGroup = stickyGroupId(local);
  const remoteGroup = stickyGroupId(remote);
  const localAt = local.updatedAt ?? 0;
  const remoteAt = remote.updatedAt ?? 0;

  // Remote strictly newer and intentionally clears or changes group → trust remote.
  if (remoteAt > localAt) {
    return remote;
  }

  // Equal clocks: keep local group if remote has none.
  if (remoteAt === localAt && localGroup && !remoteGroup) {
    return {
      ...remoteSticky,
      clusterId: localSticky.clusterId ?? null,
      parentSectionId: localSticky.parentSectionId ?? null,
      updatedAt: localAt,
    };
  }

  // Local newer (or equal with local group already handled): keep local.
  if (localAt > remoteAt) {
    return local;
  }

  return remote;
}

export function applyRemoteFigJam(
  localLive: Record<string, FigJamElement>,
  remoteStored: Record<string, unknown>,
  pendingDeletes: Map<string, number> = new Map()
): Record<string, FigJamElement> {
  const next: Record<string, FigJamElement> = { ...localLive };

  for (const [id, remote] of Object.entries(remoteStored)) {
    if (!remote || typeof remote !== "object") continue;

    if (isFigJamTombstone(remote)) {
      const local = next[id];
      // Strict `>` so a same-timestamp local create wins over a raced tombstone.
      if (!local || remote.updatedAt > (local.updatedAt ?? 0)) {
        delete next[id];
      }
      continue;
    }

    const pendingDeletedAt = pendingDeletes.get(id);
    const remoteEl = remote as FigJamElement;
    if (
      pendingDeletedAt !== undefined &&
      pendingDeletedAt >= (remoteEl.updatedAt ?? 0)
    ) {
      continue;
    }

    const local = next[id];
    if (!local) {
      next[id] = remoteEl;
      continue;
    }

    if (local.type === "sticky" && remoteEl.type === "sticky") {
      next[id] = mergeStickyRemote(local, remoteEl);
      continue;
    }

    // Labels/sections/etc.: remote must be strictly newer to replace local.
    if ((remoteEl.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
      next[id] = remoteEl;
    }
  }

  return next;
}

/**
 * Build a save payload from live elements plus *explicit* deletes only.
 * Never infer tombstones from "known live ids" — that races and bulk-deletes packets.
 */
export function buildFigJamSavePayload(
  live: Record<string, FigJamElement>,
  explicitDeletes: Iterable<[string, number]> | Map<string, number>,
  _previousLiveIds?: Iterable<string>,
  _deletedAt?: number
): Record<string, FigJamStoredElement> {
  const payload: Record<string, FigJamStoredElement> = { ...live };
  const deletes =
    explicitDeletes instanceof Map
      ? explicitDeletes
      : new Map(explicitDeletes);

  for (const [id, deletedAt] of deletes) {
    if (id in live) continue;
    payload[id] = { id, deleted: true, updatedAt: deletedAt };
  }
  return payload;
}

/** Prefer the richer wall when healing Convex from localStorage. */
export function preferRicherFigJam(
  primary: Record<string, FigJamElement>,
  secondary: Record<string, FigJamElement>
): Record<string, FigJamElement> {
  const primaryLabels = Object.values(primary).filter((el) => el.type === "label").length;
  const secondaryLabels = Object.values(secondary).filter((el) => el.type === "label").length;
  const primaryGrouped = Object.values(primary).filter(
    (el) => el.type === "sticky" && stickyGroupId(el)
  ).length;
  const secondaryGrouped = Object.values(secondary).filter(
    (el) => el.type === "sticky" && stickyGroupId(el)
  ).length;

  if (secondaryLabels > primaryLabels) return secondary;
  if (secondaryLabels === primaryLabels && secondaryGrouped > primaryGrouped) {
    return secondary;
  }
  if (
    secondaryLabels === primaryLabels &&
    secondaryGrouped === primaryGrouped
  ) {
    const primaryMax = Object.values(primary).reduce(
      (m, el) => Math.max(m, el.updatedAt ?? 0),
      0
    );
    const secondaryMax = Object.values(secondary).reduce(
      (m, el) => Math.max(m, el.updatedAt ?? 0),
      0
    );
    if (secondaryMax > primaryMax) return secondary;
  }
  return primary;
}
