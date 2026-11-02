"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Sentiment = "up" | "meh" | "down";

const REACTIONS: {
  id: Sentiment;
  label: string;
  hint: string;
}[] = [
  { id: "up", label: "Makes sense", hint: "Ready to act on this" },
  { id: "meh", label: "Almost", hint: "Need one more detail" },
  { id: "down", label: "Not clear", hint: "Can’t decide from this" },
];

interface IssueSignalStripProps {
  shareToken: string;
  projectName: string;
}

export function IssueSignalStrip({
  shareToken,
  projectName,
}: IssueSignalStripProps) {
  const sendOnShare = useMutation(api.signals.sendOnShare);
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [message, setMessage] = useState("");
  const [guestName, setGuestName] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!sentiment) {
      toast.error("Pick how this brief landed");
      return;
    }
    setSending(true);
    try {
      await sendOnShare({
        shareToken,
        sentiment,
        message,
        guestName: guestName.trim() || undefined,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      });
      setSent(true);
      toast.success("Note sent to the research team");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send note"
      );
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <section className="mt-12 border border-border bg-card px-5 py-6 print:hidden">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Reply
        </p>
        <p className="mt-2 text-sm text-foreground">
          Sent — the research team will see your note on {projectName}.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-12 border border-border bg-card print:hidden">
      <div className="border-b border-border px-5 py-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Reply
        </p>
        <p className="mt-1 text-sm text-foreground">
          Tell the research team if this brief is enough to decide — or what is
          missing.
        </p>
      </div>
      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {REACTIONS.map(({ id, label, hint }) => (
            <button
              key={id}
              type="button"
              title={hint}
              onClick={() => setSentiment(id)}
              className={cn(
                "inline-flex flex-col items-start gap-0.5 border px-3 py-2 text-left",
                sentiment === id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
              )}
            >
              <span className="font-mono text-[11px] uppercase tracking-widest">
                {label}
              </span>
              <span
                className={cn(
                  "text-[11px] normal-case tracking-normal",
                  sentiment === id
                    ? "text-background/80"
                    : "text-muted-foreground"
                )}
              >
                {hint}
              </span>
            </button>
          ))}
        </div>
        <Input
          value={guestName}
          onChange={(event) => setGuestName(event.target.value)}
          placeholder="Your name (optional)"
          maxLength={80}
          className="h-9 rounded-none"
        />
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="One sentence for the team…"
          maxLength={2000}
          rows={3}
          className="w-full resize-y border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground"
        />
        <Button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || !sentiment || message.trim().length < 2}
          className="h-9 font-mono text-[11px] uppercase tracking-widest"
        >
          {sending ? "Sending…" : "Send to research team"}
        </Button>
      </div>
    </section>
  );
}
