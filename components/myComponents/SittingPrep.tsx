"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Plus, X } from "lucide-react";

export interface PrepItem {
  id: string;
  text: string;
  checked: boolean;
}

const PREP_MAX = 8;

interface SittingPrepProps {
  interviewId: Id<"interviews">;
  items: PrepItem[];
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `prep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function SittingPrep({ interviewId, items }: SittingPrepProps) {
  const updatePrepGuide = useMutation(api.interviews.updatePrepGuide);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const checkedCount = items.filter((item) => item.checked).length;
  const canAdd = items.length < PREP_MAX;

  const persist = async (next: PrepItem[]) => {
    setSaving(true);
    try {
      await updatePrepGuide({ interviewId, prepGuide: next });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save prep");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    const text = draft.trim();
    if (!text || !canAdd) return;
    setDraft("");
    await persist([...items, { id: newId(), text, checked: false }]);
  };

  const handleToggle = async (id: string) => {
    await persist(
      items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleRemove = async (id: string) => {
    await persist(items.filter((item) => item.id !== id));
  };

  const handleEdit = async (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      await handleRemove(id);
      return;
    }
    await persist(
      items.map((item) => (item.id === id ? { ...item, text: trimmed } : item))
    );
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Prep
            </p>
            <p className="mt-0.5 text-sm text-foreground">
              {items.length === 0
                ? "3–8 questions before you sit."
                : `${checkedCount}/${items.length} covered`}
            </p>
          </div>
          {saving ? (
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Saving
            </span>
          ) : null}
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">
            Add the questions you want to hit. Tick them as you go — or after.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="group flex items-start gap-3 px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => void handleToggle(item.id)}
                  aria-label={item.checked ? "Mark uncovered" : "Mark covered"}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${
                    item.checked
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-transparent hover:border-foreground"
                  }`}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </button>
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <input
                    type="text"
                    defaultValue={item.text}
                    onBlur={(event) => {
                      if (event.target.value.trim() !== item.text) {
                        void handleEdit(item.id, event.target.value);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                    className={`mt-0.5 w-full bg-transparent text-sm outline-none ${
                      item.checked
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemove(item.id)}
                  aria-label="Remove question"
                  className="mt-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {canAdd ? (
          <form
            className="flex items-center gap-2 border-t border-border px-4 py-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAdd();
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add a question…"
              maxLength={280}
              className="h-9 rounded-none border-border"
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={!draft.trim()}
              className="h-9 shrink-0 font-mono text-[11px] uppercase tracking-widest"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </form>
        ) : (
          <p className="border-t border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Full · {PREP_MAX} max
          </p>
        )}
      </div>
    </div>
  );
}
