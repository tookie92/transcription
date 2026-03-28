"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import type { StickyColor } from "@/types/figjam";

const STICKY_COLORS: { id: StickyColor; hex: string; label: string; usage: string }[] = [
  { id: "yellow", hex: "oklch(0.85 0.15 85)", label: "Insight", usage: "Idées, observations" },
  { id: "orange", hex: "oklch(0.75 0.15 55)", label: "Important", usage: "Points clés" },
  { id: "green", hex: "oklch(0.80 0.15 160)", label: "Solution", usage: "Propositions" },
  { id: "blue", hex: "oklch(0.75 0.15 230)", label: "Question", usage: "Questions" },
  { id: "purple", hex: "oklch(0.70 0.15 290)", label: "Créatif", usage: "Idées innovantes" },
  { id: "pink", hex: "oklch(0.75 0.15 350)", label: "Pain Point", usage: "Problèmes" },
  { id: "pain-point", hex: "oklch(0.65 0.18 25)", label: "Friction", usage: "Frustrations" },
  { id: "quote", hex: "oklch(0.80 0.10 280)", label: "Quote", usage: "Citations" },
  { id: "insight", hex: "oklch(0.85 0.20 160)", label: "Découverte", usage: "Insights clés" },
  { id: "follow-up", hex: "oklch(0.90 0.03 200)", label: "Follow-up", usage: "À approfondir" },
  { id: "white", hex: "oklch(1 0 0)", label: "Note", usage: "Annotations" },
];

const RECENT_COLORS_KEY = "figjam-recent-sticky-colors";
const MAX_RECENT = 5;

interface StickyColorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectColor: (color: StickyColor) => void;
  onCreateCustomColor?: (hex: string) => void;
  previewPosition?: { x: number; y: number };
}

export function StickyColorPicker({
  isOpen,
  onClose,
  onSelectColor,
  onCreateCustomColor,
  previewPosition,
}: StickyColorPickerProps) {
  const [recentColors, setRecentColors] = useState<StickyColor[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(RECENT_COLORS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [hoveredColor, setHoveredColor] = useState<StickyColor | null>(null);
  const [selectedForPreview, setSelectedForPreview] = useState<StickyColor | null>(null);

  const handleColorSelect = useCallback((colorId: StickyColor) => {
    setSelectedForPreview(colorId);
    
    const updated = [colorId, ...recentColors.filter(c => c !== colorId)].slice(0, MAX_RECENT);
    setRecentColors(updated);
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
    
    onSelectColor(colorId);
    onClose();
  }, [recentColors, onSelectColor, onClose]);

  const getContrastColor = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
  };

  const previewColor = hoveredColor || selectedForPreview;
  const previewData = previewColor 
    ? STICKY_COLORS.find(c => c.id === previewColor) 
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-card rounded-xl shadow-2xl border border-border overflow-hidden"
            style={{ width: 320 }}
          >
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Choisir une couleur</span>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex">
              <div className="flex-1 p-3">
                {recentColors.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-2">Récents</p>
                    <div className="flex gap-2">
                      {recentColors.map(colorId => {
                        const color = STICKY_COLORS.find(c => c.id === colorId);
                        if (!color) return null;
                        return (
                          <button
                            key={color.id}
                            onClick={() => handleColorSelect(color.id)}
                            className="w-8 h-8 rounded-lg border-2 border-transparent hover:border-foreground/30 transition-all"
                            style={{ backgroundColor: color.hex }}
                            title={color.label}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2 mb-3">
                  {STICKY_COLORS.map(color => (
                    <button
                      key={color.id}
                      onClick={() => handleColorSelect(color.id)}
                      onMouseEnter={() => setHoveredColor(color.id)}
                      onMouseLeave={() => setHoveredColor(null)}
                      className="relative w-full aspect-square rounded-lg border-2 border-transparent hover:border-foreground/30 transition-all flex items-center justify-center"
                      style={{ backgroundColor: color.hex }}
                    >
                      {selectedForPreview === color.id && (
                        <Check 
                          className="w-5 h-5" 
                          style={{ color: getContrastColor(color.hex) }} 
                        />
                      )}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-muted-foreground">
                  Cliquez pour sélectionner ou survolez pour prévisualiser
                </div>
              </div>

              <AnimatePresence>
                {previewData && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 140 }}
                    exit={{ opacity: 0, width: 0 }}
                    className="border-l border-border p-3 bg-muted/30"
                  >
                    <p className="text-xs text-muted-foreground mb-2">Prévisualisation</p>
                    
                    <div 
                      className="w-24 h-24 rounded-lg shadow-md flex items-center justify-center mb-2"
                      style={{ backgroundColor: previewData.hex }}
                    >
                      <div 
                        className="text-xs font-medium px-2 text-center leading-tight"
                        style={{ color: getContrastColor(previewData.hex) }}
                      >
                        Exemple de note
                      </div>
                    </div>
                    
                    <p className="text-sm font-medium text-foreground">{previewData.label}</p>
                    <p className="text-xs text-muted-foreground">{previewData.usage}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="px-3 pb-3">
              <button
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "color";
                  input.value = "#FFE066";
                  input.addEventListener("change", (e) => {
                    const hex = (e.target as HTMLInputElement).value;
                    onCreateCustomColor?.(hex);
                    onClose();
                  });
                  input.click();
                }}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                + Couleur personnalisée
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export { STICKY_COLORS };
