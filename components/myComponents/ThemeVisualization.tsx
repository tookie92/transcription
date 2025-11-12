// components/ThemeVisualization.tsx - AVEC DÉLAI
"use client";

import { useEffect, useRef, useState } from "react";
import { AffinityGroup, DetectedTheme } from "@/types";

interface ThemeVisualizationProps {
  groups: AffinityGroup[];
  themes: DetectedTheme[];
  selectedTheme?: DetectedTheme | null;
  canvasPosition: { x: number; y: number };
  canvasScale: number;
  onThemeHover?: (theme: DetectedTheme | null) => void;
}

export function ThemeVisualization({
  groups,
  themes,
  selectedTheme,
  canvasPosition,
  canvasScale,
  onThemeHover
}: ThemeVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // 🆕 ATTENDRE QUE LE COMPOSANT SOIT MONTRÉ
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('❌ Canvas ref is still null after mount');
      return;
    }

    console.log('✅ Canvas ref is now available');

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redimensionner
    const parent = canvas.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      console.log('📐 Canvas sized to:', rect.width, 'x', rect.height);
    }

    // Clear et dessiner
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (themes.length === 0) return;

    // Appliquer transformation
    ctx.save();
    ctx.translate(canvasPosition.x, canvasPosition.y);
    ctx.scale(canvasScale, canvasScale);

    // Dessiner les lignes
    themes.forEach(theme => {
      const themeGroups = groups.filter(group => 
        theme.groupIds.includes(group.id)
      );

      if (themeGroups.length < 2) return;

      const isSelected = selectedTheme?.id === theme.id;
      const themeColor = '#FF0000'; // 🆕 ROUGE pour test
      const lineWidth = 5 / canvasScale; // 🆕 ÉPAIS pour test

      // Dessiner une seule ligne de test d'abord
      const groupA = themeGroups[0];
      const groupB = themeGroups[1];

      const x1 = groupA.position.x + 150;
      const y1 = groupA.position.y + 50;
      const x2 = groupB.position.x + 150;
      const y2 = groupB.position.y + 50;

      console.log(`🎯 TEST LINE: (${x1}, ${y1}) to (${x2}, ${y2})`);

      ctx.strokeStyle = themeColor;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = 1.0;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      console.log('✅ TEST LINE DRAWN');
    });

    ctx.restore();

  }, [isMounted, groups, themes, selectedTheme, canvasPosition, canvasScale]);

  if (themes.length === 0 || !isMounted) {
    return null;
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-40 border-2 border-green-500" // 🆕 BORDURE VERTE
      />
      {/* Overlay de debug */}
      <div className="absolute top-4 left-4 bg-blue-500 text-white p-3 rounded-lg z-50">
        🎨 {themes.length} thèmes | Canvas: {canvasRef.current ? '✅' : '❌'}
      </div>
    </>
  );
}