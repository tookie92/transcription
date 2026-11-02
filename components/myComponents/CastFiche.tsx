"use client";

import { useEffect, useState } from "react";
import {
  nextCastAvatarFallback,
  resolveCastAvatar,
} from "@/lib/castAvatar";

interface CastFicheData {
  name: string;
  occupation?: string;
  quote?: string;
  goals?: string[];
  frustrations?: string[];
  profileImage?: string | null;
  basedOn?: {
    groups: number;
    groupTitles?: string[];
  };
}

interface CastFicheProps {
  persona: CastFicheData;
  sourceLine?: string;
}

export function CastFiche({ persona, sourceLine }: CastFicheProps) {
  const from =
    sourceLine ??
    (persona.basedOn
      ? `from ${persona.basedOn.groups} packet${persona.basedOn.groups === 1 ? "" : "s"}`
      : undefined);

  const [imgSrc, setImgSrc] = useState(() =>
    resolveCastAvatar(persona.name, persona.profileImage)
  );

  useEffect(() => {
    setImgSrc(resolveCastAvatar(persona.name, persona.profileImage));
  }, [persona.profileImage, persona.name]);

  return (
    <article>
      <div className="flex items-start gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onError={() =>
              setImgSrc((prev) => nextCastAvatarFallback(persona.name, prev))
            }
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Fiche
          </p>
          <h3
            className="mt-2 text-2xl font-normal italic tracking-tight"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            {persona.name}
          </h3>
          {persona.occupation ? (
            <p className="mt-1 text-sm text-muted-foreground">{persona.occupation}</p>
          ) : null}
        </div>
      </div>
      {persona.quote ? (
        <p
          className="mt-4 max-w-2xl text-lg italic leading-relaxed"
          style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
        >
          {persona.quote}
        </p>
      ) : null}
      {persona.goals && persona.goals.length > 0 ? (
        <div className="mt-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Goals
          </p>
          <ul className="mt-2 max-w-2xl list-disc space-y-1 pl-5 text-sm">
            {persona.goals.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {persona.frustrations && persona.frustrations.length > 0 ? (
        <div className="mt-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Pains
          </p>
          <ul className="mt-2 max-w-2xl list-disc space-y-1 pl-5 text-sm">
            {persona.frustrations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {from ? (
        <p className="mt-5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {from}
        </p>
      ) : null}
    </article>
  );
}
