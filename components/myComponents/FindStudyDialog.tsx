"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SlipStamp, slipKindOf } from "@/components/myComponents/affinity/SlipFace";
import { cn } from "@/lib/utils";
import type { TapePeekTarget } from "@/components/myComponents/affinity/TapePeek";

interface FindStudyDialogProps {
  projectId: Id<"projects">;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode | null;
  onPick: (target: TapePeekTarget) => void;
}

function formatStamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.round(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-primary/25 text-foreground">{text.slice(index, index + needle.length)}</mark>
      {text.slice(index + needle.length)}
    </>
  );
}

export function FindStudyDialog({
  projectId,
  open,
  onOpenChange,
  trigger,
  onPick,
}: FindStudyDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => setQuery(draft), 120);
    return () => window.clearTimeout(timer);
  }, [draft, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setDraft("");
      setQuery("");
      setActiveIndex(0);
    }
  }, [isOpen]);

  const result = useQuery(
    api.studySearch.searchStudy,
    isOpen ? { projectId, query } : "skip"
  );

  const hits = useMemo(() => {
    if (!result) return [];
    return [...result.pins, ...result.lines];
  }, [result]);

  const groups = useMemo(() => {
    const order: string[] = [];
    const bySitting = new Map<
      string,
      { title: string; indices: number[] }
    >();
    hits.forEach((hit, index) => {
      const key = hit.interviewId;
      const existing = bySitting.get(key);
      if (existing) {
        existing.indices.push(index);
      } else {
        order.push(key);
        bySitting.set(key, {
          title: hit.interviewTitle,
          indices: [index],
        });
      }
    });
    return order.map((key) => bySitting.get(key)!);
  }, [hits]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, result?.pins.length, result?.lines.length]);

  const pick = (index: number) => {
    const hit = hits[index];
    if (!hit) return;
    onPick({
      interviewId: hit.interviewId,
      timestamp: hit.timestamp,
      quote: hit.text,
    });
    setIsOpen(false);
  };

  const pinCount = result?.pins.length ?? 0;
  const lineCount = result?.lines.length ?? 0;

  const defaultTrigger = (
    <Button variant="outline" className="h-10 font-mono text-xs uppercase tracking-widest">
      Find
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      )}
      <DialogContent
        className="max-w-lg gap-0 p-0 duration-0 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) => Math.min(hits.length - 1, current + 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) => Math.max(0, current - 1));
          } else if (event.key === "Enter") {
            event.preventDefault();
            pick(activeIndex);
          }
        }}
      >
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Find</DialogTitle>
          <DialogDescription>
            Pins and lines across every sitting — pick one to peek the tape.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-border px-5 py-3">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="A phrase, a pain, a name"
            className="rounded-none"
            aria-label="Find in study"
            autoComplete="off"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {result === undefined ? (
            <p className="px-5 py-8 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Looking
            </p>
          ) : hits.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              {query.trim() ? "Nothing matches." : "No pins yet."}
            </p>
          ) : (
            <>
              <p className="px-5 pt-3 pb-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {pinCount} {pinCount === 1 ? "pin" : "pins"}
                {lineCount > 0 ? (
                  <>
                    <span> · </span>
                    {lineCount} {lineCount === 1 ? "line" : "lines"}
                  </>
                ) : null}
                {groups.length > 1 ? (
                  <>
                    <span> · </span>
                    {groups.length} sittings
                  </>
                ) : null}
              </p>
              <ul className="pb-2" role="listbox">
                {groups.map((group) => (
                  <li key={group.title + group.indices[0]}>
                    <p className="sticky top-0 z-[1] border-y border-border bg-muted/40 px-5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {group.title}
                    </p>
                    <ul className="divide-y divide-border">
                      {group.indices.map((index) => {
                        const hit = hits[index]!;
                        const kind =
                          hit.kind === "pin" ? slipKindOf(hit.pinType) : null;
                        return (
                          <li key={hit.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={index === activeIndex}
                              onMouseEnter={() => setActiveIndex(index)}
                              onClick={() => pick(index)}
                              className={cn(
                                "flex w-full flex-col gap-1 px-5 py-3 text-left transition-colors duration-150 ease-out active:scale-[0.99]",
                                index === activeIndex
                                  ? "bg-accent"
                                  : "hover:bg-accent"
                              )}
                              ref={(node) => {
                                if (index === activeIndex) {
                                  node?.scrollIntoView({ block: "nearest" });
                                }
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {kind ? (
                                  <SlipStamp kind={kind} />
                                ) : (
                                  <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                                    Line
                                  </span>
                                )}
                                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                                  {formatStamp(hit.timestamp)}
                                </span>
                              </div>
                              <p className="line-clamp-2 text-sm leading-relaxed text-foreground">
                                <Highlight text={hit.text} query={query} />
                              </p>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
