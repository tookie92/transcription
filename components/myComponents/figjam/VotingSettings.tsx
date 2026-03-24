"use client";

import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Clock } from "lucide-react";

interface VotingConfig {
  dotsPerUser: number;
  durationMinutes: number | null;
}

interface VotingSettingsProps {
  config: VotingConfig;
  onConfigChange: (config: VotingConfig) => void;
  isVotingActive?: boolean;
  timerSeconds?: number;
  onStartVoting?: () => void;
  onEndVoting?: () => void;
}

export function VotingSettings({ 
  config, 
  onConfigChange,
  isVotingActive,
  timerSeconds = 0,
  onStartVoting,
  onEndVoting,
}: VotingSettingsProps) {
  const [open, setOpen] = useState(false);
  const [dots, setDots] = useState(config.dotsPerUser);
  const [duration, setDuration] = useState(config.durationMinutes ?? 3);
  const [hasDuration, setHasDuration] = useState(config.durationMinutes !== null);
  const [localTimerSeconds, setLocalTimerSeconds] = useState(0);

  useEffect(() => {
    setDots(config.dotsPerUser);
    setDuration(config.durationMinutes ?? 3);
    setHasDuration(config.durationMinutes !== null);
  }, [config]);

  useEffect(() => {
    if (isVotingActive && config.durationMinutes) {
      setLocalTimerSeconds(config.durationMinutes * 60);
    }
  }, [isVotingActive, config.durationMinutes]);

  useEffect(() => {
    if (!isVotingActive || !config.durationMinutes) return;
    const interval = setInterval(() => {
      setLocalTimerSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isVotingActive, config.durationMinutes]);

  const handleStartVoting = () => {
    onConfigChange({
      dotsPerUser: dots,
      durationMinutes: hasDuration ? duration : null,
    });
    onStartVoting?.();
    setOpen(false);
  };

  const adjustDots = (delta: number) => {
    setDots(d => Math.max(1, Math.min(20, d + delta)));
  };

  const adjustDuration = (delta: number) => {
    setDuration(d => Math.max(1, Math.min(60, d + delta)));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {isVotingActive ? (
          <Button 
            variant="default" 
            size="sm" 
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {config.durationMinutes ? (
              <>
                <Clock className="w-4 h-4" />
                {Math.floor(localTimerSeconds / 60)}:{(localTimerSeconds % 60).toString().padStart(2, "0")}
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="6" fill="currentColor" fillOpacity="0.3"/>
                  <circle cx="12" cy="12" r="3" fill="currentColor"/>
                </svg>
                Voting Active
              </>
            )}
          </Button>
        ) : (
          <Button variant="default" size="sm" className="gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="6" fill="currentColor" fillOpacity="0.3"/>
              <circle cx="12" cy="12" r="3" fill="currentColor"/>
            </svg>
            Start Voting
          </Button>
        )}
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-4" align="end">
        {isVotingActive ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <div>
                <p className="font-medium text-sm text-green-800">Voting in Progress</p>
                <p className="text-xs text-green-600">{config.dotsPerUser} dots per user</p>
              </div>
            </div>
            
            {config.durationMinutes && (
              <div className="px-4 py-3 rounded-xl bg-slate-100 text-center font-mono">
                <span className="text-3xl font-bold text-slate-800">
                  {Math.floor(localTimerSeconds / 60)}:{(localTimerSeconds % 60).toString().padStart(2, "0")}
                </span>
              </div>
            )}
            
            <Button 
              onClick={onEndVoting} 
              variant="outline" 
              className="w-full text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              End Voting
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <circle cx="12" cy="12" r="6" fill="currentColor" fillOpacity="0.3"/>
                  <circle cx="12" cy="12" r="3" fill="currentColor"/>
                </svg>
              </div>
              <h4 className="font-semibold text-sm">Vote Setup</h4>
            </div>

            {/* Dots */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dots per user</label>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => adjustDots(-1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="w-20 h-12 flex items-center justify-center border-2 rounded-xl bg-muted/50 font-bold text-2xl">
                  {dots}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => adjustDots(1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Clock className="h-3 w-3" />
                Time limit (optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hasDuration}
                  onChange={(e) => setHasDuration(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Enable timer</span>
              </div>
              {hasDuration && (
                <div className="flex items-center justify-center gap-3 mt-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => adjustDuration(-1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="w-24 h-12 flex items-center justify-center border-2 rounded-xl bg-muted/50">
                    <span className="font-bold text-lg">{duration}</span>
                    <span className="text-sm text-muted-foreground ml-1">min</span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => adjustDuration(1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Start */}
            <Button onClick={handleStartVoting} className="w-full h-11 text-base font-medium">
              Start Voting
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
