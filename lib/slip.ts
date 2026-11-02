import type { StickyColor } from "@/types/figjam";

export type SlipKind = "quote" | "pain-point" | "follow-up" | "insight";

export const SLIP_KINDS: { id: SlipKind; key: string; label: string }[] = [
  { id: "quote", key: "Q", label: "Quote" },
  { id: "pain-point", key: "P", label: "Pain" },
  { id: "follow-up", key: "F", label: "Follow-up" },
  { id: "insight", key: "I", label: "Insight" },
];

export function slipKindFromColor(
  color: string | undefined,
  source?: string | null
): SlipKind {
  const raw = source || color;
  if (raw === "pain-point" || raw === "quote" || raw === "follow-up" || raw === "insight") {
    return raw;
  }
  return "insight";
}

export function slipStamp(kind: SlipKind): string {
  return SLIP_KINDS.find((entry) => entry.id === kind)?.label ?? "Pin";
}

export function slipStampClass(kind: SlipKind): string {
  switch (kind) {
    case "pain-point":
      return "text-destructive";
    case "quote":
    case "follow-up":
    case "insight":
      return "text-muted-foreground";
  }
}

export function slipTilt(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return ((Math.abs(hash) % 7) - 3) * 0.45;
}

export function isSlipColor(color: StickyColor): color is SlipKind {
  return (
    color === "quote" ||
    color === "pain-point" ||
    color === "follow-up" ||
    color === "insight"
  );
}
