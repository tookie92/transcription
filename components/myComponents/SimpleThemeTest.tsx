// components/SimpleThemeTest.tsx
"use client";

import { useEffect, useRef } from "react";

export function SimpleThemeTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    console.log('🔍 SimpleThemeTest useEffect running...');
    
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('❌ Canvas ref is null in SimpleThemeTest');
      return;
    }

    console.log('✅ Canvas found in SimpleThemeTest!');

    // Forcer une taille
    canvas.width = 1000;
    canvas.height = 800;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dessiner quelque chose de très visible
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText('SIMPLE TEST WORKS!', 50, 50);

    console.log('✅ Simple test drawing completed');

  }, []);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 9999,
      pointerEvents: 'none'
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          border: '5px solid yellow'
        }}
      />
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        background: 'green',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        zIndex: 10000
      }}>
        🐛 SIMPLE TEST
      </div>
    </div>
  );
}