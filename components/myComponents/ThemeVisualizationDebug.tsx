// components/ThemeVisualizationDebug.tsx - POUR DÉBOGUER
"use client";

import { useEffect, useRef } from "react";

export function ThemeVisualizationDebug() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('❌ DEBUG: Canvas ref is null');
      return;
    }

    console.log('✅ DEBUG: Canvas ref is available');

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Remplir tout le canvas en rouge
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Écrire du texte
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('THEME VISUALIZATION DEBUG', 10, 30);

    console.log('✅ DEBUG: Red canvas drawn');

  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-50"
        style={{ width: '100%', height: '100%' }}
      />
      <div className="absolute top-4 right-4 bg-green-500 text-white p-3 rounded-lg z-50">
        🐛 DEBUG ACTIF
      </div>
    </>
  );
}