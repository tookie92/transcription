"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export type PinKind = "quote" | "pain-point" | "follow-up";

export interface PinSelection {
  text: string;
  timestamp: number;
  x: number;
  y: number;
}

interface PinToolbarProps {
  selection: PinSelection;
  onPin: (kind: PinKind) => void;
  onClose: () => void;
}

const ACTIONS: { kind: PinKind; key: string; label: string }[] = [
  { kind: "quote", key: "Q", label: "Quote" },
  { kind: "pain-point", key: "P", label: "Pain" },
  { kind: "follow-up", key: "F", label: "Follow-up" },
];

export function PinToolbar({ selection, onPin, onClose }: PinToolbarProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const match = ACTIONS.find((a) => a.key === e.key.toUpperCase());
      if (match && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        onPin(match.kind);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPin, onClose]);

  useEffect(() => {
    let ignoreOpener = true;
    queueMicrotask(() => {
      ignoreOpener = false;
    });

    const handlePointerDown = (event: PointerEvent) => {
      if (ignoreOpener) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('[role="toolbar"]')) return;
      onClose();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [onClose]);

  const left = Math.min(Math.max(selection.x, 96), window.innerWidth - 96);
  const top = Math.max(selection.y - 10, 56);

  return (
    <div
      role="toolbar"
      aria-label="Pin this line"
      className="pin-toolbar fixed z-50"
      style={{ left, top }}
    >
      <div className="flex items-center gap-1 border border-border bg-card px-1 py-1">
        {ACTIONS.map((action) => (
          <Button
            key={action.kind}
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 font-mono text-[11px] tracking-widest uppercase transition-transform duration-150 ease-out active:scale-[0.97]"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPin(action.kind)}
          >
            <span className="text-muted-foreground mr-1.5">{action.key}</span>
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
