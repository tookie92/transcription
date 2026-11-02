"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Radio, ThumbsDown, ThumbsUp, Minus, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  SKRIPTA_OPEN_SIGNAL,
  type SignalPromptReason,
} from "@/lib/openSignal";

type Sentiment = "up" | "meh" | "down";

const SENTIMENTS: {
  id: Sentiment;
  label: string;
  Icon: typeof ThumbsUp;
}[] = [
  { id: "up", label: "Working", Icon: ThumbsUp },
  { id: "meh", label: "Meh", Icon: Minus },
  { id: "down", label: "Broken", Icon: ThumbsDown },
];

const LS_SENT_AT = "skripta:signal:sentAt";
const LS_NUDGE_DAY = "skripta:signal:nudgeDay";
const LS_SESSION = "skripta:signal:sessionAt";
/** Soft cooldown after a send — still allow radio, skip auto-nudge. */
const SENT_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;
const NUDGE_AFTER_MS = 6 * 60 * 1000;
const NUDGE_AFFINITY_MS = 40 * 1000;
const NUDGE_VISIBLE_MS = 7000;

const PROMPT_BY_REASON: Record<SignalPromptReason, string> = {
  nudge: "How’s the kit feeling?",
  issue: "Issue is out — how did publish feel?",
  flip: "Round flipped — anything rough or good?",
  manual: "How’s the kit feeling?",
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function markSent(): void {
  try {
    localStorage.setItem(LS_SENT_AT, String(Date.now()));
    // Clear legacy forever-flag if present
    localStorage.removeItem("skripta:signal:sent");
  } catch {
    /* ignore */
  }
}

function inSentCooldown(): boolean {
  try {
    if (localStorage.getItem("skripta:signal:sent") === "1") {
      // Migrate one-shot flag → cooldown from now
      localStorage.setItem(LS_SENT_AT, String(Date.now()));
      localStorage.removeItem("skripta:signal:sent");
      return true;
    }
    const raw = localStorage.getItem(LS_SENT_AT);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at < SENT_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function nudgedToday(): boolean {
  try {
    return localStorage.getItem(LS_NUDGE_DAY) === todayKey();
  } catch {
    return false;
  }
}

function markNudgedToday(): void {
  try {
    localStorage.setItem(LS_NUDGE_DAY, todayKey());
  } catch {
    /* ignore */
  }
}

function SignalFiche({
  open,
  onClose,
  onSent,
  prompt,
}: {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
  prompt: string;
}) {
  const { user } = useUser();
  const pathname = usePathname();
  const params = useParams();
  const sendSignal = useMutation(api.signals.send);
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const projectId =
    typeof params?.projectId === "string" ? params.projectId : undefined;

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => textareaRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      const el = target instanceof Element ? target : null;
      if (el?.closest?.("[data-signal-trigger]")) return;
      if (el?.closest?.("[data-signal-nudge]")) return;
      onClose();
    };
    const timer = window.setTimeout(() => {
      window.addEventListener("pointerdown", handlePointerDown, true);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [open, onClose]);

  const reset = useCallback(() => {
    setSentiment(null);
    setMessage("");
    setSending(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleSend = async () => {
    if (!sentiment || sending) return;
    const trimmed = message.trim();
    if (trimmed.length < 2) {
      toast.error("Write a short note");
      return;
    }

    setSending(true);
    try {
      await sendSignal({
        sentiment,
        message: trimmed,
        path: pathname || "/",
        projectId,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        userName: user?.fullName || user?.firstName || undefined,
        userEmail: user?.primaryEmailAddress?.emailAddress,
      });
      markSent();
      onSent();
      toast.success("Signal received — thanks");
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="fixed bottom-28 right-4 z-[70] w-[min(20rem,calc(100vw-2rem))] border border-border bg-card shadow-lg sm:right-6"
      role="dialog"
      aria-label="Send a signal"
      data-signal-fiche
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Signal · beta
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground"
          onClick={handleClose}
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-3 p-3">
        <p
          className="text-[13px] text-muted-foreground"
          style={{ fontFamily: "var(--font-display), serif", fontStyle: "italic" }}
        >
          {prompt}
        </p>

        <div className="flex gap-1.5" role="group" aria-label="Sentiment">
          {SENTIMENTS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSentiment(id)}
              className={cn(
                "flex h-9 flex-1 items-center justify-center gap-1.5 border border-border font-mono text-[10px] uppercase tracking-widest transition-transform duration-150 ease-out active:scale-[0.97]",
                sentiment === id
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              aria-pressed={sentiment === id}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder="What broke, what clicked, what’s missing…"
          rows={3}
          maxLength={2000}
          className="w-full resize-none border border-border bg-background px-2.5 py-2 text-[13px] leading-snug text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-foreground/30"
          style={{ fontFamily: "var(--font-display), serif" }}
        />

        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[9px] tracking-wide text-muted-foreground/80">
            {pathname}
          </span>
          <Button
            type="button"
            size="sm"
            disabled={!sentiment || message.trim().length < 2 || sending}
            onClick={() => void handleSend()}
            className="h-8 px-3 font-mono text-[10px] uppercase tracking-widest"
          >
            {sending ? "…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SignalTrigger() {
  const pathname = usePathname();
  const router = useRouter();
  const isFounder = useQuery(api.signals.amIFounder);
  const [open, setOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [prompt, setPrompt] = useState(PROMPT_BY_REASON.manual);
  const affinityEnteredAt = useRef<number | null>(null);
  const nudgeTimer = useRef<number | null>(null);

  const dismissNudge = useCallback(() => {
    setShowNudge(false);
    markNudgedToday();
  }, []);

  const openFiche = useCallback((reason: SignalPromptReason = "manual") => {
    setShowNudge(false);
    setPrompt(PROMPT_BY_REASON[reason] ?? PROMPT_BY_REASON.manual);
    setOpen(true);
  }, []);

  const fireNudge = useCallback(() => {
    if (inSentCooldown() || nudgedToday()) return;
    if (pathname?.startsWith("/studio")) return;
    if (pathname?.startsWith("/share")) return;
    setPrompt(PROMPT_BY_REASON.nudge);
    setShowNudge(true);
    setPulse(true);
    markNudgedToday();
    window.setTimeout(() => setPulse(false), 600);
    if (nudgeTimer.current) window.clearTimeout(nudgeTimer.current);
    nudgeTimer.current = window.setTimeout(() => {
      setShowNudge(false);
    }, NUDGE_VISIBLE_MS);
  }, [pathname]);

  // External open (Issue publish, Flip, …)
  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ reason?: SignalPromptReason }>)
        .detail;
      const reason = detail?.reason ?? "manual";
      // Contextual asks skip the daily nudge lock — still respect send cooldown.
      if (reason !== "manual" && reason !== "nudge" && inSentCooldown()) {
        return;
      }
      openFiche(reason);
    };
    window.addEventListener(SKRIPTA_OPEN_SIGNAL, onOpen);
    return () => window.removeEventListener(SKRIPTA_OPEN_SIGNAL, onOpen);
  }, [openFiche]);

  // Session timer nudge
  useEffect(() => {
    if (pathname?.startsWith("/studio") || pathname?.startsWith("/share")) {
      return;
    }
    try {
      if (!localStorage.getItem(LS_SESSION)) {
        localStorage.setItem(LS_SESSION, String(Date.now()));
      }
    } catch {
      /* ignore */
    }

    const tick = () => {
      if (inSentCooldown() || nudgedToday()) return;
      try {
        const started = Number(localStorage.getItem(LS_SESSION) || "0");
        if (started && Date.now() - started >= NUDGE_AFTER_MS) {
          fireNudge();
        }
      } catch {
        /* ignore */
      }
    };

    const id = window.setInterval(tick, 30_000);
    tick();
    return () => window.clearInterval(id);
  }, [fireNudge, pathname]);

  // Affinity wall dwell nudge
  useEffect(() => {
    const onWall = Boolean(pathname?.includes("/affinity"));
    if (onWall) {
      if (affinityEnteredAt.current == null) {
        affinityEnteredAt.current = Date.now();
      }
      const elapsed = Date.now() - (affinityEnteredAt.current ?? Date.now());
      const wait = Math.max(0, NUDGE_AFFINITY_MS - elapsed);
      const t = window.setTimeout(() => {
        if (pathname?.includes("/affinity")) fireNudge();
      }, wait);
      return () => window.clearTimeout(t);
    }
    affinityEnteredAt.current = null;
  }, [pathname, fireNudge]);

  useEffect(() => {
    return () => {
      if (nudgeTimer.current) window.clearTimeout(nudgeTimer.current);
    };
  }, []);

  return (
    <>
      <div className="fixed bottom-6 right-4 z-[65] flex items-center gap-2 sm:right-6">
        {showNudge && !open ? (
          <button
            type="button"
            data-signal-nudge
            onClick={() => openFiche("nudge")}
            className={cn(
              "border border-border bg-card px-2.5 py-1.5 shadow-sm",
              "font-mono text-[10px] uppercase tracking-widest text-foreground",
              "transition-opacity duration-150 ease-out"
            )}
            style={{ animation: "signal-nudge-in 180ms ease-out" }}
          >
            Beta · signal?
          </button>
        ) : null}

        {isFounder ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-muted-foreground"
                aria-label="Signal inbox"
                onClick={() => router.push("/studio/signals")}
              >
                <span className="font-mono text-[10px] tracking-widest">IN</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Inbox</TooltipContent>
          </Tooltip>
        ) : null}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              data-signal-trigger
              aria-label="Send a signal"
              aria-expanded={open}
              className={cn(
                "h-10 w-10 border-border bg-card shadow-sm transition-transform duration-150 ease-out active:scale-[0.97]",
                open && "bg-accent",
                pulse && "scale-110"
              )}
              onClick={() => {
                dismissNudge();
                if (open) {
                  setOpen(false);
                } else {
                  openFiche("manual");
                }
              }}
            >
              <Radio className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Signal · beta feedback</TooltipContent>
        </Tooltip>
      </div>
      <SignalFiche
        open={open}
        prompt={prompt}
        onClose={() => setOpen(false)}
        onSent={() => {
          setShowNudge(false);
        }}
      />
    </>
  );
}

/** In-app tester feedback — signed-in only. Not the stakeholder Issue Signal. */
export function SignalWidget() {
  const { isSignedIn } = useAuth();
  const pathname = usePathname();
  if (!isSignedIn) return null;
  if (pathname?.startsWith("/studio/signals")) return null;
  if (pathname?.startsWith("/share")) return null;
  return <SignalTrigger />;
}
