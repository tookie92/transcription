// components/UltraSimpleTest.tsx
"use client";

import { useEffect, useRef } from "react";

export function UltraSimpleTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Taille fixe
    canvas.width = 2000;
    canvas.height = 2000;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // DESSINER UN GRAND X ROUGE IMPOSSIBLE À RATER
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 20;
    
    // X géant
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(2000, 2000);
    ctx.moveTo(2000, 0);
    ctx.lineTo(0, 2000);
    ctx.stroke();

    // Cercle au centre
    ctx.fillStyle = '#0000FF';
    ctx.beginPath();
    ctx.arc(1000, 1000, 100, 0, 2 * Math.PI);
    ctx.fill();

    console.log('🎯 ULTRA SIMPLE TEST DRAWN');

  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999,
      pointerEvents: 'none',
      background: 'rgba(0,255,0,0.1)' // Fond vert très transparent
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          border: '10px solid yellow'
        }}
      />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'black',
        color: 'white',
        padding: '20px',
        fontSize: '24px',
        zIndex: 10000
      }}>
        ULTRA SIMPLE TEST - YOU SHOULD SEE RED X
      </div>
    </div>
  );
}