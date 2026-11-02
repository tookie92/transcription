"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CastFiche } from "./CastFiche";
import { castAvatarUrl } from "@/lib/castAvatar";

export interface CastPacket {
  id: string;
  title: string;
  slips: Array<{ id: string; text: string; type: string }>;
}

interface CastFicheView {
  _id?: string;
  name: string;
  occupation: string;
  quote: string;
  goals: string[];
  frustrations: string[];
  profileImage?: string;
  basedOn?: {
    groups: number;
    insights: number;
    groupTitles: string[];
    packetIds?: string[];
  };
}

interface CastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  mapId: string;
  packets: CastPacket[];
  selectedPacketIds?: string[];
  voteWinnerIds?: string[];
  seedPacketId?: string | null;
  projectContext?: string;
  /** Canvas spawn point when saving a new cast. */
  spawnPosition?: { x: number; y: number } | null;
  onNeedConsent?: () => void;
  onCastCreated?: (persona: {
    _id: string;
    name: string;
    occupation: string;
    quote: string;
    goals: string[];
    frustrations: string[];
    profileImage?: string;
    basedOn?: {
      groups: number;
      insights: number;
      groupTitles: string[];
      packetIds?: string[];
    };
  }) => void;
}

function isNamedPacket(packet: CastPacket): boolean {
  const title = packet.title.trim();
  return title.length > 0 && title.toLowerCase() !== "untitled";
}

function snapQuoteToPins(quote: string, pins: string[]): string {
  const normalized = quote.trim().toLowerCase();
  if (!normalized) return pins[0]?.trim() ?? "";
  const exact = pins.find((pin) => pin.trim().toLowerCase() === normalized);
  if (exact) return exact.trim();
  const contained = pins.find((pin) => {
    const pinNorm = pin.trim().toLowerCase();
    return pinNorm.includes(normalized) || normalized.includes(pinNorm);
  });
  if (contained) return contained.trim();
  return pins[0]?.trim() ?? quote.trim();
}

function defaultUsingIds(
  packets: CastPacket[],
  selectedPacketIds: string[],
  voteWinnerIds: string[],
  seedPacketId: string | null
): Set<string> {
  const withSlips = packets.filter((packet) => packet.slips.length > 0);
  const withSlipIds = new Set(withSlips.map((packet) => packet.id));
  if (seedPacketId && withSlipIds.has(seedPacketId)) {
    return new Set([seedPacketId]);
  }
  const named = withSlips.filter(isNamedPacket);
  const namedIds = new Set(named.map((packet) => packet.id));
  const selectedNamed = selectedPacketIds.filter((id) => namedIds.has(id));
  if (selectedNamed.length > 0) return new Set(selectedNamed);
  const winners = voteWinnerIds.filter((id) => namedIds.has(id));
  if (winners.length > 0) return new Set(winners);
  return new Set(named.map((packet) => packet.id));
}

export function CastDialog({
  open,
  onOpenChange,
  projectId,
  mapId,
  packets,
  selectedPacketIds = [],
  voteWinnerIds = [],
  seedPacketId = null,
  projectContext,
  spawnPosition = null,
  onNeedConsent,
  onCastCreated,
}: CastDialogProps) {
  const [usingIds, setUsingIds] = useState<Set<string>>(new Set());
  const [isCasting, setIsCasting] = useState(false);
  const [viewing, setViewing] = useState<CastFicheView | null>(null);

  const createPersona = useMutation(api.personas.createPersona);
  const deletePersona = useMutation(api.personas.deletePersona);
  const saved = useQuery(
    api.personas.getPersonasByMap,
    mapId ? { mapId: mapId as Id<"affinityMaps"> } : "skip"
  );
  const consent = useQuery(api.credits.getConsent);

  const packetsWithSlips = useMemo(
    () => packets.filter((packet) => packet.slips.length > 0),
    [packets]
  );

  const seedPacket = useMemo(
    () =>
      seedPacketId
        ? packetsWithSlips.find((packet) => packet.id === seedPacketId)
        : null,
    [packetsWithSlips, seedPacketId]
  );

  useEffect(() => {
    if (!open) return;
    setUsingIds(
      defaultUsingIds(packets, selectedPacketIds, voteWinnerIds, seedPacketId)
    );
    setViewing(null);
    // Snapshot selection when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const togglePacket = (packetId: string) => {
    setUsingIds((prev) => {
      const next = new Set(prev);
      if (next.has(packetId)) next.delete(packetId);
      else next.add(packetId);
      return next;
    });
  };

  const usingPackets = packetsWithSlips.filter((packet) =>
    usingIds.has(packet.id)
  );
  const canCast = usingPackets.length > 0 && !isCasting;

  const handleCast = async () => {
    if (usingPackets.length === 0) {
      toast.error("Pick at least one packet");
      return;
    }
    if (consent === false) {
      onNeedConsent?.();
      toast.error("Accept privacy first");
      return;
    }

    const slips = usingPackets.flatMap((packet) => packet.slips);
    const pinTexts = slips.map((slip) => slip.text.trim()).filter(Boolean);
    if (pinTexts.length === 0) {
      toast.error("Those packets have no slips");
      return;
    }

    setIsCasting(true);
    try {
      const response = await fetch("/api/persona/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: usingPackets.map((packet) => ({
            title: packet.title.trim() || "Untitled",
            insightIds: packet.slips.map((slip) => slip.id),
          })),
          insights: slips.map((slip) => ({
            id: slip.id,
            text: slip.text,
            type: slip.type,
          })),
          projectContext,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        persona?: {
          name?: string;
          occupation?: string;
          background?: string;
          quote?: string;
          goals?: string[];
          frustrations?: string[];
        };
        basedOn?: {
          groups: number;
          insights: number;
          groupTitles: string[];
        };
      };

      if (!response.ok) {
        if (response.status === 400 && payload.error) {
          throw new Error(payload.error);
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error("Sign in to cast");
        }
        if (
          typeof payload.error === "string" &&
          /api key|GROQ|unauthorized/i.test(payload.error)
        ) {
          throw new Error("Cast service unavailable — check GROQ_API_KEY");
        }
        throw new Error(
          payload.error?.trim() || "Cast service failed — try again"
        );
      }

      const data = payload;
      const persona = data.persona;
      if (!persona?.name) {
        throw new Error("Empty fiche — try again with more slips");
      }
      if (!persona.occupation) {
        throw new Error("Fiche incomplete — try again");
      }

      const quoteSlips = slips
        .filter((slip) => slip.type === "quote")
        .map((slip) => slip.text);
      const quote = snapQuoteToPins(
        persona.quote ?? "",
        quoteSlips.length > 0 ? quoteSlips : pinTexts
      );
      const basedOn = {
        groups: data.basedOn?.groups ?? usingPackets.length,
        insights: data.basedOn?.insights ?? slips.length,
        groupTitles:
          data.basedOn?.groupTitles ??
          usingPackets.map((packet) => packet.title.trim() || "Untitled"),
        packetIds: usingPackets.map((packet) => packet.id),
      };

      const slim: CastFicheView = {
        name: persona.name.trim(),
        occupation: (persona.occupation ?? "").trim() || "—",
        quote,
        goals: (persona.goals ?? [])
          .map((goal) => goal.trim())
          .filter(Boolean)
          .slice(0, 4),
        frustrations: (persona.frustrations ?? [])
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 4),
        profileImage: castAvatarUrl(persona.name.trim()),
        basedOn,
      };

      const wallPosition = spawnPosition ?? {
        x: 120 + Math.random() * 80,
        y: 120 + Math.random() * 80,
      };

      const personaId = await createPersona({
        projectId: projectId as Id<"projects">,
        mapId: mapId as Id<"affinityMaps">,
        name: slim.name,
        occupation: slim.occupation,
        background: (persona.background ?? "").trim(),
        quote: slim.quote,
        goals: slim.goals,
        frustrations: slim.frustrations,
        basedOn,
        profileImage: slim.profileImage,
        wallPosition,
      }).catch((error: unknown) => {
        const raw = error instanceof Error ? error.message : "";
        if (/Not authenticated/i.test(raw)) {
          throw new Error("Sign in to cast");
        }
        if (/Validator|ArgumentValidation|packetIds|wallPosition|profileImage/i.test(raw)) {
          throw new Error("Cast schema outdated — restart convex dev");
        }
        throw new Error("Could not save cast to the wall");
      });

      setViewing({ ...slim, _id: personaId });
      onCastCreated?.({ ...slim, _id: personaId });
      toast.success("Cast on the wall");
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Could not cast a fiche";
      toast.error(message);
    } finally {
      setIsCasting(false);
    }
  };

  const handleDelete = async (personaId: string) => {
    try {
      if (viewing?._id === personaId) setViewing(null);
      await deletePersona({ personaId: personaId as Id<"personas"> });
      toast.success("Cast deleted");
    } catch {
      toast.error("Could not delete");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Cast
          </DialogTitle>
          <DialogDescription>
            {seedPacket
              ? `Build a fiche from “${seedPacket.title.trim() || "Untitled"}”. Add other packets only if they are the same person.`
              : "Choose which packets feed this person. The fiche lands on the wall — drag it like a packet."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto">
          {viewing ? (
            <div className="border-b border-border px-5 py-5">
              <CastFiche persona={viewing} />
            </div>
          ) : null}

          <div>
            <p className="px-5 pt-4 font-mono text-[11px] tracking-widest uppercase text-muted-foreground">
              Feed from
              <span className="ml-2 tabular-nums">{usingIds.size}</span>
            </p>
            {packetsWithSlips.length > 0 ? (
              <ul className="mt-1 divide-y divide-border">
                {packetsWithSlips.map((packet) => {
                  const on = usingIds.has(packet.id);
                  return (
                    <li key={packet.id}>
                      <button
                        type="button"
                        onClick={() => togglePacket(packet.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-transform duration-150 ease-out active:scale-[0.99]",
                          on ? "bg-accent" : "hover:bg-accent"
                        )}
                      >
                        <span className="min-w-0 truncate text-sm text-foreground">
                          {packet.title.trim() || "Untitled"}
                          <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                            {packet.slips.length} slips
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 font-mono text-[10px] uppercase tracking-widest",
                            on ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {on ? "Using" : "Skip"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-muted-foreground">
                File slips into a named packet first.
              </p>
            )}
          </div>

          <div className="border-t border-border px-5 py-4">
            <Button
              type="button"
              disabled={!canCast}
              onClick={() => void handleCast()}
              className="w-full font-mono text-[11px] uppercase tracking-widest"
            >
              {isCasting ? "Casting…" : "Cast"}
            </Button>
          </div>

          {saved && saved.length > 0 ? (
            <div className="border-t border-border">
              <p className="px-5 pt-4 font-mono text-[11px] tracking-widest uppercase text-muted-foreground">
                On the wall
                <span className="ml-2 tabular-nums">{saved.length}</span>
              </p>
              <ul className="mt-1 divide-y divide-border">
                {saved.map((persona) => (
                  <li key={persona._id} className="px-5 py-3">
                    <p className="truncate text-sm text-foreground">
                      {persona.name}
                    </p>
                    {persona.occupation ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {persona.occupation}
                      </p>
                    ) : null}
                    <div className="mt-2 flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 font-mono text-[10px] uppercase tracking-widest"
                        onClick={() =>
                          setViewing({
                            _id: persona._id,
                            name: persona.name,
                            occupation: persona.occupation,
                            quote: persona.quote,
                            goals: persona.goals,
                            frustrations: persona.frustrations,
                            basedOn: persona.basedOn,
                          })
                        }
                      >
                        Open
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 font-mono text-[10px] uppercase tracking-widest"
                        onClick={() => void handleDelete(persona._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
