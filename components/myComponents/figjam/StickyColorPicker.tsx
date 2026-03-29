"use client";

import React, { useRef, useEffect } from "react";
import type { StickyColor } from "@/types/figjam";
import { STICKY_COLORS } from "./StickyNote";
import { Button } from "@/components/ui/button";

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
  onOpenChange 
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

  const insightTypes: { id: StickyColor; label: string; desc: string }[] = [
    { id: "pain-point", label: "Pain Point", desc: "Problèmes" },
    { id: "insight", label: "Insight", desc: "Découvertes" },
    { id: "quote", label: "Quote", desc: "Citations" },
    { id: "follow-up", label: "Follow-up", desc: "À suivre" },
  ];

  const handleToggle = () => {
    onOpenChange?.(!internalIsOpen);
  };

  return (
    <div ref={pickerRef} className="relative">
      <Button
        onClick={handleToggle}
        variant="ghost"
        size="icon"
        className={`w-10 h-10 rounded-xl ${internalIsOpen || isActive ? "bg-primary/20 text-primary ring-2 ring-primary/30" : ""}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      </Button>

      {internalIsOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-card rounded-xl shadow-2xl border border-border p-2">
          <div className="text-xs font-medium text-muted-foreground px-2 pb-2">Type d&apos;insight</div>
          <div className="flex gap-1">
            {insightTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  onSelectColor(type.id);
                  onOpenChange?.(false);
                }}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-accent transition-colors min-w-[70px]"
              >
                <div 
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: STICKY_COLORS[type.id].bg }}
                />
                <div className="text-[10px] font-medium text-center">{type.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
