// hooks/useFollowGroupRect.ts
import { useEffect, useState } from 'react';
import { useThrottle } from '@/hooks/useThrottle';

export function useFollowGroupRect(
  groupId: string | null,
  deps: { scale: number; position: { x: number; y: number } }
) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const update = useThrottle(() => {
    if (!groupId) return;

    const el = document.querySelector(`[data-group-id="${groupId}"]`);
    if (!el) return;

    const r = el.getBoundingClientRect();

    // 🔒 Clamp vertical : 12 px du bord haut / 320 px du bord bas
    const clampedY = Math.max(12, Math.min(window.innerHeight - 320, r.top));

    // On renvoie un rectangle corrigé (x inchangé, y clampé)
    setRect(new DOMRect(r.left, clampedY, r.width, r.height));
  }, 16);

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [groupId, deps.scale, deps.position]);

  return rect;
}