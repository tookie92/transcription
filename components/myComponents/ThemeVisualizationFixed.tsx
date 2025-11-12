// components/ThemeVisualizationFixed.tsx - VERSION CORRIGÉE
"use client";

import { useEffect, useRef, useState } from "react";
import { AffinityGroup, DetectedTheme } from "@/types";

interface ThemeVisualizationProps {
  groups: AffinityGroup[];
  themes: DetectedTheme[];
  selectedTheme?: DetectedTheme | null;
  canvasPosition: { x: number; y: number };
  canvasScale: number;
}

export function ThemeVisualizationFixed({
  groups,
  themes,
  selectedTheme,
  canvasPosition,
  canvasScale
}: ThemeVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const animationRef = useRef<number>(0); // 🆕 INITIALISER À 0

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // 🆕 FONCTION DE DESSIN AMÉLIORÉE
  const drawThemes = () => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Taille
    const parent = canvas.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (themes.length === 0) {
      // 🆕 ARRÊTER L'ANIMATION SI PAS DE THÈMES
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    // Transformation
    ctx.save();
    ctx.translate(canvasPosition.x, canvasPosition.y);
    ctx.scale(canvasScale, canvasScale);

    // 🆕 ANIMATION PULSATION
    const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7;

    // Dessiner les connections
    themes.forEach(theme => {
      const themeGroups = groups.filter(group => 
        theme.groupIds.includes(group.id)
      );

      if (themeGroups.length < 2) return;

      const isSelected = selectedTheme?.id === theme.id;
      
      // 🎨 STYLES DYNAMIQUES BASÉS SUR LA SÉLECTION
      let themeColor = '#FF4444';
      let lineWidth = 4 / canvasScale;
      let opacity = 0.6;
      
      switch (theme.type) {
        case 'hierarchical': 
          themeColor = isSelected ? '#FF00FF' : '#AA44FF'; 
          lineWidth = isSelected ? 8 / canvasScale : 5 / canvasScale;
          break;
        case 'related': 
          themeColor = isSelected ? '#00FFFF' : '#4444FF'; 
          lineWidth = isSelected ? 7 / canvasScale : 4 / canvasScale;
          break;
        case 'contradictory': 
          themeColor = isSelected ? '#FFFF00' : '#FF4444'; 
          lineWidth = isSelected ? 6 / canvasScale : 4 / canvasScale;
          break;
        case 'complementary': 
          themeColor = isSelected ? '#00FF00' : '#44FF44'; 
          lineWidth = isSelected ? 7 / canvasScale : 4 / canvasScale;
          break;
      }

      // 🎯 EFFETS SPÉCIAUX POUR THÈME SÉLECTIONNÉ
      if (isSelected) {
        opacity = 0.9;
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 15 / canvasScale;
        
        // Animation de pulsation pour le thème sélectionné
        ctx.globalAlpha = opacity * pulse;
      } else {
        ctx.shadowBlur = 0;
        ctx.globalAlpha = opacity;
      }

      // Lignes entre groupes - 🎨 STYLE AMÉLIORÉ
      for (let i = 0; i < themeGroups.length - 1; i++) {
        for (let j = i + 1; j < themeGroups.length; j++) {
          const groupA = themeGroups[i];
          const groupB = themeGroups[j];

          // 📍 POINTS DE CONNEXION CENTRAUX
          const x1 = groupA.position.x + 150;
          const y1 = groupA.position.y + 50;
          const x2 = groupB.position.x + 150;
          const y2 = groupB.position.y + 50;

          ctx.strokeStyle = themeColor;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';

          // 🎨 COURBES POUR MEILLEURE LISIBILITÉ
          ctx.beginPath();
          if (isSelected && theme.type === 'hierarchical') {
            // Ligne droite pour hiérarchique
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
          } else {
            // Légère courbe pour les autres types
            const cpX = (x1 + x2) / 2;
            const cpY = (y1 + y2) / 2 - 20;
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(cpX, cpY, x2, y2);
          }
          ctx.stroke();

          // 🔵 POINTS DE CONNEXION VISIBLES POUR THÈME SÉLECTIONNÉ
          if (isSelected) {
            ctx.fillStyle = themeColor;
            ctx.beginPath();
            ctx.arc(x1, y1, 6 / canvasScale, 0, 2 * Math.PI);
            ctx.arc(x2, y2, 6 / canvasScale, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }

      ctx.shadowBlur = 0;
    });

    ctx.restore();

    // 🔄 CONTINUER L'ANIMATION
    animationRef.current = requestAnimationFrame(drawThemes);
  };

  useEffect(() => {
    drawThemes();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible, groups, themes, selectedTheme, canvasPosition, canvasScale]);

  if (themes.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}