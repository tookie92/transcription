"use client";

import React, { useRef, useEffect } from "react";
import type { StickyColor } from "@/types/figjam";
import { Button } from "@/components/ui/button";
import { SlipStamp } from "@/components/myComponents/affinity/SlipFace";
import { SLIP_KINDS } from "@/lib/slip";

interface StickyColorPickerProps {
  onSelectColor: (color: StickyColor) => void;
  isActive?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function StickyColorPicker({
  onSelectColor,
  isActive,
  isOpen: controlledIsOpen,
  onOpenChange,
}: StickyColorPickerProps) {
  const internalIsOpen = controlledIsOpen ?? false;
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onOpenChange?.(false);
      }
    }

    if (internalIsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [internalIsOpen, onOpenChange]);

  return (
    <div ref={pickerRef} className="relative">
      <Button
        onClick={() => onOpenChange?.(!internalIsOpen)}
        variant="ghost"
        size="icon"
        className={`w-10 h-10 ${internalIsOpen || isActive ? "bg-accent" : ""}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" />
        </svg>
      </Button>

      {internalIsOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-card border border-border p-1 flex gap-1">
          {SLIP_KINDS.map((kind) => (
            <button
              key={kind.id}
              type="button"
              onClick={() => {
                onSelectColor(kind.id);
                onOpenChange?.(false);
              }}
              className="px-2 py-2 hover:bg-accent transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              <SlipStamp kind={kind.id} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
