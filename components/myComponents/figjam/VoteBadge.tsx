"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VoteSticker } from "@/components/myComponents/affinity/VoteSticker";
import { cn } from "@/lib/utils";

interface Voter {
  userId: string;
  name: string;
  color: string;
}

interface VoteBadgeProps {
  voteCount: number;
  voters: Voter[];
  isRevealed: boolean;
  hasUserVoted?: boolean;
  displayMode?: "badge" | "row";
  compact?: boolean;
}

export function VoteBadge({
  voteCount,
  voters,
  isRevealed,
  displayMode = "badge",
  compact = false,
}: VoteBadgeProps) {
  const displayVotes = voters.slice(-10);

  if (displayMode === "row") {
    return (
      <TooltipProvider delayDuration={150}>
        <div className="flex -space-x-0.5">
          {displayVotes.map((voter, i) => (
            <Tooltip key={`${voter.userId}-${i}`}>
              <TooltipTrigger asChild>
                <span>
                  <VoteSticker
                    color={voter.color}
                    label={voter.name}
                    rotate={((i % 5) - 2) * 6}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="rounded-none text-xs">
                {voter.name}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 border border-border bg-card",
        compact && "px-1.5 py-0.5"
      )}
    >
      {isRevealed ? (
        <>
          <div className="flex -space-x-0.5">
            {voters.slice(0, 4).map((voter, i) => (
              <VoteSticker
                key={`${voter.userId}-${i}`}
                color={voter.color}
                label={voter.name}
                rotate={((i % 5) - 2) * 6}
              />
            ))}
          </div>
          <span className="font-mono text-[11px] tabular-nums">×{voteCount}</span>
        </>
      ) : (
        <>
          <VoteSticker color="var(--muted)" rotate={8} />
          <span className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">
            Hidden
          </span>
        </>
      )}
    </div>
  );
}
