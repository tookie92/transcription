"use client";

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  SkipBack,
  SkipForward
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AudioPlayerHandle {
  getCurrentTime: () => number;
  play: () => void;
  pause: () => void;
  setCurrentTime: (time: number) => void;
  isPlaying: boolean;
}

interface AudioPlayerProps {
  src: string;
  className?: string;
  onTimeUpdate?: (time: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  ({ src, className, onTimeUpdate, onPlayStateChange }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    useImperativeHandle(ref, () => ({
      getCurrentTime: () => audioRef.current?.currentTime ?? 0,
      setCurrentTime: (time: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = time;
        }
      },
      play: () => audioRef.current?.play(),
      pause: () => audioRef.current?.pause(),
      isPlaying,
    }));

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
        onTimeUpdate?.(audio.currentTime);
      };
      const handleLoadedMetadata = () => setDuration(audio.duration);
      const handleEnded = () => {
        setIsPlaying(false);
        onPlayStateChange?.(false);
      };
      const handlePlay = () => {
        setIsPlaying(true);
        onPlayStateChange?.(true);
      };
      const handlePause = () => {
        setIsPlaying(false);
        onPlayStateChange?.(false);
      };

      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("play", handlePlay);
      audio.addEventListener("pause", handlePause);

      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("play", handlePlay);
        audio.removeEventListener("pause", handlePause);
      };
    }, [onTimeUpdate]);

    const formatTime = (seconds: number) => {
      if (isNaN(seconds)) return "0:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const togglePlay = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    };

    const handleSeek = (value: number[]) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = value[0];
    };

    const handleVolumeChange = (value: number[]) => {
      const audio = audioRef.current;
      if (!audio) return;
      const newVolume = value[0] / 100;
      audio.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    };

    const toggleMute = () => {
      const audio = audioRef.current;
      if (!audio) return;
      
      if (isMuted) {
        audio.volume = volume || 1;
        setIsMuted(false);
      } else {
        audio.volume = 0;
        setIsMuted(true);
      }
    };

    const skip = (seconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, duration));
    };

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {/* Hidden Audio Element */}
        <audio ref={audioRef} src={src} preload="metadata" />

        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-10 font-mono">
            {formatTime(currentTime)}
          </span>
          
          <div className="flex-1 group">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
          </div>
          
          <span className="text-xs text-muted-foreground w-10 font-mono text-right">
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Volume */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleMute}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            
            <div className="w-20 hidden sm:block">
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
                className="cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Skip Back */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => skip(-5)}
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            {/* Play/Pause */}
            <Button
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </Button>

            {/* Skip Forward */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => skip(5)}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          <div className="w-24 hidden sm:block" />
        </div>
      </div>
    );
  }
);

AudioPlayer.displayName = "AudioPlayer";
