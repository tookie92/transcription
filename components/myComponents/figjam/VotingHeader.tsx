"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Vote, Timer, CheckCircle2, Users, Sparkles, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface VotingConfig {
  dotsPerUser: number;
  durationMinutes: number | null;
  prompt: string;
}

const DOTS_POSITIONS: Array<{ x: number; y: number; speed: number; delay: number }> = [
  { x: 10, y: 20, speed: 0.5, delay: 0.2 },
  { x: 25, y: 60, speed: 0.8, delay: 1.5 },
  { x: 40, y: 15, speed: 0.3, delay: 0.8 },
  { x: 55, y: 80, speed: 1.2, delay: 0.1 },
  { x: 70, y: 35, speed: 0.6, delay: 1.2 },
  { x: 85, y: 70, speed: 0.4, delay: 0.5 },
  { x: 15, y: 45, speed: 0.9, delay: 1.8 },
  { x: 30, y: 90, speed: 0.7, delay: 0.3 },
  { x: 45, y: 25, speed: 1.0, delay: 1.0 },
  { x: 60, y: 55, speed: 0.5, delay: 0.7 },
  { x: 75, y: 10, speed: 0.8, delay: 1.4 },
  { x: 90, y: 40, speed: 0.6, delay: 0.9 },
  { x: 5, y: 75, speed: 1.1, delay: 1.6 },
  { x: 20, y: 50, speed: 0.4, delay: 0.4 },
  { x: 35, y: 85, speed: 0.7, delay: 1.1 },
  { x: 50, y: 30, speed: 0.9, delay: 0.6 },
  { x: 65, y: 65, speed: 0.3, delay: 1.3 },
  { x: 80, y: 5, speed: 1.2, delay: 0.0 },
  { x: 95, y: 95, speed: 0.5, delay: 1.7 },
  { x: 12, y: 38, speed: 0.8, delay: 1.9 },
];

interface VotingHeaderProps {
  isActive: boolean;
  isVoting: boolean;
  isRevealed: boolean;
  sessionName: string;
  maxDotsPerUser: number;
  usedDots: number;
  totalVotes: number;
  remainingTime: number | null;
  userColor: string;
  onStartVoting: (config: VotingConfig) => void;
  onStopVoting: () => void;
  onReveal: () => void;
  onNewRound: () => void;
}

const PRESET_CONFIGS = [
  { name: "Quick", dots: 3, duration: null, description: "Fast decision" },
  { name: "Standard", dots: 5, duration: null, description: "Most common" },
  { name: "Detailed", dots: 8, duration: null, description: "More thorough" },
  { name: "Timed", dots: 5, duration: 5, description: "5 min window" },
];

export function VotingHeader({
  isActive,
  isVoting,
  isRevealed,
  sessionName,
  maxDotsPerUser,
  usedDots,
  totalVotes,
  remainingTime,
  userColor,
  onStartVoting,
  onStopVoting,
  onReveal,
  onNewRound,
}: VotingHeaderProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [dotsPerUser, setDotsPerUser] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("Vote for priorities");

  const remaining = maxDotsPerUser - usedDots;
  const progressPercent = (usedDots / maxDotsPerUser) * 100;

  const formatTime = (ms: number | null) => {
    if (!ms) return null;
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartVoting = () => {
    onStartVoting({
      dotsPerUser,
      durationMinutes,
      prompt,
    });
    setShowConfig(false);
  };

  if (!isActive) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-50"
        >
          <button
            onClick={() => setShowConfig(true)}
            className={cn(
              "group flex items-center gap-3 px-5 py-3 rounded-2xl",
              "bg-gradient-to-r from-amber-500/90 to-orange-500/90",
              "hover:from-amber-500 hover:to-orange-500",
              "text-white shadow-lg shadow-amber-500/25",
              "transition-all duration-300",
              "hover:shadow-xl hover:shadow-amber-500/30",
              "hover:scale-[1.02]"
            )}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Sparkles className="w-5 h-5" />
            </motion.div>
            <span className="font-semibold tracking-tight">Start Voting</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/20">
              <Vote className="w-4 h-4" />
              <span className="text-sm font-medium">5</span>
            </div>
          </button>
        </motion.div>

        <Dialog open={showConfig} onOpenChange={setShowConfig}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <motion.div
                  initial={{ rotate: -10, scale: 0.9 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </motion.div>
                Start Dot Voting
              </DialogTitle>
              <DialogDescription>
                Configure your voting session. Click on clusters to vote.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Presets */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Quick Presets
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_CONFIGS.map((preset) => (
                    <motion.button
                      key={preset.name}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setDotsPerUser(preset.dots);
                        setDurationMinutes(preset.duration);
                      }}
                      className={cn(
                        "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                        dotsPerUser === preset.dots && durationMinutes === preset.duration
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <span className="font-medium text-sm">{preset.name}</span>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {preset.description}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Dots per user */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Votes per Person
                </Label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={dotsPerUser}
                    onChange={(e) => setDotsPerUser(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex items-center gap-2 min-w-[80px]">
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(dotsPerUser, 5) }).map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="w-2.5 h-2.5 rounded-full bg-primary"
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{dotsPerUser}</span>
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Time Limit
                </Label>
                <Select
                  value={durationMinutes?.toString() ?? "none"}
                  onValueChange={(v) => setDurationMinutes(v === "none" ? null : parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No time limit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No time limit</SelectItem>
                    <SelectItem value="1">1 minute</SelectItem>
                    <SelectItem value="3">3 minutes</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Prompt
                </Label>
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Vote for your priorities"
                  className="rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowConfig(false)}>
                Cancel
              </Button>
              <Button onClick={handleStartVoting} className="gap-2">
                <Vote className="w-4 h-4" />
                Start Voting
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isVoting ? "voting" : "results"}
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-50"
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl",
            "backdrop-blur-xl border shadow-xl",
            isVoting && "bg-gradient-to-r from-slate-900/95 to-slate-800/95 border-slate-700/50",
            isRevealed && "bg-gradient-to-r from-emerald-900/95 to-teal-900/95 border-emerald-700/50"
          )}
        >
          {/* Gradient overlay */}
          <div
            className={cn(
              "absolute inset-0 opacity-30",
              isVoting && "bg-gradient-to-r from-violet-500/20 via-transparent to-cyan-500/20",
              isRevealed && "bg-gradient-to-r from-emerald-500/20 via-transparent to-teal-500/20"
            )}
          />

          {/* Animated background dots - deterministic positions */}
          <div className="absolute inset-0 overflow-hidden opacity-20">
            {DOTS_POSITIONS.map((dot, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-white/50"
                style={{
                  left: `${dot.x}%`,
                  top: `${dot.y}%`,
                }}
                animate={{
                  opacity: [0.2, 0.5, 0.2],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: 3 + dot.speed,
                  repeat: Infinity,
                  delay: dot.delay,
                }}
              />
            ))}
          </div>

          <div className="relative flex items-center gap-4 px-5 py-3">
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <motion.div
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  isVoting && "bg-violet-400",
                  isRevealed && "bg-emerald-400"
                )}
                animate={isVoting ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  isVoting && "text-violet-300",
                  isRevealed && "text-emerald-300"
                )}
              >
                {isVoting ? "Voting" : "Results"}
              </span>
            </div>

            <div className="w-px h-6 bg-white/20" />

            {/* Session name */}
            <div className="flex items-center gap-2">
              <Vote className="w-4 h-4 text-white/60" />
              <span className="text-sm font-medium text-white/90">
                {sessionName || "Dot Voting"}
              </span>
            </div>

            {isVoting && remainingTime && (
              <>
                <div className="w-px h-6 bg-white/20" />
                <div className="flex items-center gap-1.5 text-white/80">
                  <Timer className="w-4 h-4" />
                  <span className="text-sm font-mono font-medium tabular-nums">
                    {formatTime(remainingTime)}
                  </span>
                </div>
              </>
            )}

            {isVoting && (
              <>
                <div className="w-px h-6 bg-white/20" />

                {/* Vote progress */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {/* User's dots */}
                    <div className="flex gap-1">
                      {Array.from({ length: maxDotsPerUser }).map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 25,
                            delay: i * 0.05,
                          }}
                          className={cn(
                            "w-3.5 h-3.5 rounded-full border-2 transition-all duration-200",
                            i < usedDots
                              ? "border-transparent"
                              : "border-white/40 bg-transparent"
                          )}
                          style={{
                            backgroundColor:
                              i < usedDots ? userColor : "transparent",
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-white/70">
                      {remaining} left
                    </span>
                  </div>
                </div>
              </>
            )}

            {isRevealed && (
              <>
                <div className="w-px h-6 bg-white/20" />
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {totalVotes} total votes
                  </span>
                </div>
              </>
            )}

            <div className="w-px h-6 bg-white/20" />

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isVoting && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onStopVoting}
                    className="h-8 px-3 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10"
                  >
                    End
                  </Button>
                </>
              )}

              {isRevealed && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onNewRound}
                    className="h-8 px-3 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10"
                  >
                    New Round
                  </Button>
                  <Button
                    size="sm"
                    onClick={onStopVoting}
                    className="h-8 px-3 text-xs font-medium bg-white/10 hover:bg-white/20 text-white border-0"
                  >
                    Done
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {isVoting && (
            <motion.div
              className="h-0.5 bg-white/10"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: progressPercent / 100 }}
              style={{ transformOrigin: "left" }}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
