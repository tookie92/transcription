"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

interface VotingTimerProps {
  initialMinutes: number;
  onComplete?: () => void;
  onTick?: (seconds: number) => void;
}

export function VotingTimer({ initialMinutes, onComplete, onTick }: VotingTimerProps) {
  const totalSeconds = initialMinutes * 60;
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isComplete = remainingSeconds === 0;
  const isWarning = remainingSeconds > 0 && remainingSeconds <= 60;

  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            onComplete?.();
            return 0;
          }
          onTick?.(prev - 1);
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, remainingSeconds, onComplete, onTick]);

  const formatNum = (n: number) => n.toString().padStart(2, "0");

  const bgColor = isComplete ? "bg-red-100" : isWarning ? "bg-amber-100" : "bg-slate-100";
  const textColor = isComplete ? "text-red-600" : isWarning ? "text-amber-600" : "text-slate-800";

  return (
    <div className="space-y-2">
      <div className={`px-4 py-3 rounded-xl ${bgColor} text-center font-mono`}>
        <span className={`text-4xl font-bold tracking-wider ${textColor}`}>
          {formatNum(minutes)}:{formatNum(seconds)}
        </span>
      </div>
      
      <div className="flex justify-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => setIsRunning(p => !p)}
        >
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => {
            setRemainingSeconds(totalSeconds);
            setIsRunning(true);
          }}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
