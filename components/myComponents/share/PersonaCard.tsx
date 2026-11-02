"use client";

import { CastFiche } from "@/components/myComponents/CastFiche";

interface PersonaCardProps {
  name: string;
  occupation?: string;
  quote?: string;
  goals?: string[];
  frustrations?: string[];
  basedOn?: {
    groups: number;
    groupTitles?: string[];
  };
}

interface PersonaCardComponentProps {
  persona: PersonaCardProps;
  isCompact?: boolean;
}

export function PersonaCard({ persona }: PersonaCardComponentProps) {
  return (
    <div className="border border-border bg-card px-5 py-5">
      <CastFiche persona={persona} />
    </div>
  );
}
