"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
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
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

interface TeamDialogProps {
  projectId: Id<"projects">;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface Member {
  userId: string;
  name?: string;
  email?: string;
  role: string;
  joinedAt: number;
}

function displayName(member: Member): string {
  if (member.name && !member.name.includes("@")) return member.name;
  const email = member.email || member.userId;
  return email.includes("@") ? email.split("@")[0] : email;
}

function seatLabel(role: string): string {
  if (role === "owner") return "Lead";
  if (role === "viewer") return "Watch";
  return "Edit";
}

export function TeamDialog({ projectId, trigger, open, onOpenChange }: TeamDialogProps) {
  const { userId } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [isAdding, setIsAdding] = useState(false);

  const project = useQuery(api.projects.getProjectForInvite, { projectId });
  const inviteUser = useMutation(api.projects.inviteUser);
  const removeMember = useMutation(api.projects.removeMember);
  const isOwner = project?.ownerId === userId;
  const members = project?.members || [];

  const handleInvite = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      toast.error("Need a real email");
      return;
    }

    setIsAdding(true);
    try {
      await inviteUser({
        projectId,
        email: trimmed,
        name: trimmed.split("@")[0],
        role,
      });
      toast.success(`Pass sent to ${trimmed}`);
      setEmail("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the pass");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (memberEmail: string) => {
    try {
      await removeMember({
        projectId,
        userId: memberEmail,
      });
      toast.success("Seat freed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove");
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="font-mono text-[11px] uppercase tracking-widest">
      Crew
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Pass</DialogTitle>
          <DialogDescription>
            Hand someone a seat at this kit. They show up in the dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          <ul className="divide-y divide-border">
            {members.map((member: Member) => {
              const emailAddr = member.email || member.userId;
              const pending = emailAddr.includes("@") && member.userId.includes("@");
              const canRemove = isOwner && member.role !== "owner";

              return (
                <li key={member.userId} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{displayName(member)}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {emailAddr}
                      {pending ? " · waiting" : ""}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                    {seatLabel(member.role)}
                  </span>
                  {canRemove ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(emailAddr)}
                    >
                      Free
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {isOwner ? (
            <form
              className="border-t border-border px-5 py-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleInvite();
              }}
            >
              <p className="mb-3 font-mono text-[11px] tracking-widest uppercase text-muted-foreground">
                Send a pass
              </p>
              <div className="flex gap-1 mb-3">
                {(["editor", "viewer"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRole(option)}
                    className={cn(
                      "h-8 px-3 font-mono text-[11px] tracking-widest uppercase border border-border transition-transform duration-150 ease-out active:scale-[0.97]",
                      role === option
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {option === "editor" ? "Edit" : "Watch"}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="name@lab.org"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-none"
                />
                <Button
                  type="submit"
                  disabled={isAdding || !email.includes("@")}
                  className="font-mono text-[11px] uppercase tracking-widest shrink-0"
                >
                  {isAdding ? "Sending" : "Send"}
                </Button>
              </div>
            </form>
          ) : (
            <p className="border-t border-border px-5 py-4 text-sm text-muted-foreground">
              Only the lead can hand out seats.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
