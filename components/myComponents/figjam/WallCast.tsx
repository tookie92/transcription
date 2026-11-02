"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  nextCastAvatarFallback,
  resolveCastAvatar,
} from "@/lib/castAvatar";

export interface WallCastData {
  id: string;
  name: string;
  occupation: string;
  profileImage?: string | null;
  position: { x: number; y: number };
}

interface WallCastProps {
  cast: WallCastData;
  zoom: number;
  canInteract?: boolean;
  onOpen: (id: string, screenRect: DOMRect) => void;
  onDragEnd: (id: string, position: { x: number; y: number }) => void;
}

/**
 * Free-floating Cast fiche on the affinity wall — drag like a packet.
 */
export function WallCast({
  cast,
  zoom,
  canInteract = true,
  onOpen,
  onDragEnd,
}: WallCastProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const [imgSrc, setImgSrc] = useState(() =>
    resolveCastAvatar(cast.name, cast.profileImage)
  );
  const draggingRef = useRef(false);

  useEffect(() => {
    setImgSrc(resolveCastAvatar(cast.name, cast.profileImage));
  }, [cast.profileImage, cast.name]);

  useEffect(() => {
    if (draggingRef.current) return;
    const el = elRef.current;
    if (!el) return;
    el.style.left = `${cast.position.x}px`;
    el.style.top = `${cast.position.y}px`;
  }, [cast.position.x, cast.position.y]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!canInteract || e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;
      const startPosX = cast.position.x;
      const startPosY = cast.position.y;
      let hasMoved = false;
      draggingRef.current = true;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
        const newX = startPosX + dx / zoom;
        const newY = startPosY + dy / zoom;
        const el = elRef.current;
        if (el) {
          el.style.left = `${newX}px`;
          el.style.top = `${newY}px`;
        }
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        draggingRef.current = false;

        if (!hasMoved) {
          const rect = elRef.current?.getBoundingClientRect();
          if (rect) onOpen(cast.id, rect);
          return;
        }

        const finalX = startPosX + (upEvent.clientX - startX) / zoom;
        const finalY = startPosY + (upEvent.clientY - startY) / zoom;
        onDragEnd(cast.id, { x: finalX, y: finalY });
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [canInteract, cast.id, cast.position.x, cast.position.y, onDragEnd, onOpen, zoom]
  );

  return (
    <div
      ref={elRef}
      data-wall-cast={cast.id}
      className={cn(
        "absolute z-20 w-[200px] select-none border border-border bg-card",
        "cursor-grab active:cursor-grabbing",
        "transition-shadow duration-150 hover:shadow-md"
      )}
      style={{
        left: cast.position.x,
        top: cast.position.y,
      }}
      onPointerDown={handlePointerDown}
      role="button"
      tabIndex={0}
      aria-label={`Cast ${cast.name}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const rect = elRef.current?.getBoundingClientRect();
          if (rect) onOpen(cast.id, rect);
        }
      }}
    >
      <div className="flex items-stretch gap-0">
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden border-r border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onError={() =>
              setImgSrc((prev) => nextCastAvatarFallback(cast.name, prev))
            }
          />
        </div>
        <div className="min-w-0 flex-1 px-2.5 py-2">
          <p className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground">
            Cast
          </p>
          <p
            className="mt-0.5 truncate text-sm italic leading-tight text-foreground"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            {cast.name}
          </p>
          {cast.occupation ? (
            <p className="mt-0.5 line-clamp-2 font-mono text-[10px] leading-snug text-muted-foreground">
              {cast.occupation}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
