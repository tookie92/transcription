// components/MemberManagerDialog.tsx
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { UserBadge } from "./UserBadge";
import { useUser } from "@clerk/nextjs";

interface Props {
  projectId: Id<"projects">;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function MemberManagerDialog({ projectId, open, onOpenChange }: Props) {
  const project = useQuery(api.projects.getById, { projectId , withNames: true });
  const updateRole = useMutation(api.projects.updateMemberRole);
  const removeMem = useMutation(api.projects.removeMember);
  const { user } = useUser();


  if (!project) return null;

  const handleRole = async (userId: string, newRole: "owner" | "editor" | "viewer") => {
    try {
      await updateRole({ projectId, userId, newRole });
      toast.success("Role updated");
    } catch (e) {
        const error = e as Error
      toast.error(error.message);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeMem({ projectId, userId });
      toast.success("Member removed");
    } catch (e) {
        const error = e as Error
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage members</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {project.members.map((m) => {
              const isMe = m.userId === user?.id;

            return(
            <div key={m.userId} className="flex items-center justify-between">
            {isMe ? (
                    <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">Y</div>
                    <span className="text-sm">You</span>
                    </div>
                ) : (
                    <UserBadge name={m.name || m.userId} email={m.email || m.userId} />
                )}
              <div className="flex items-center gap-2">
                <Select
                  defaultValue={m.role}
                  onValueChange={(v) => handleRole(m.userId, v as "owner" | "editor" | "viewer")}
                  disabled={m.role === "owner"}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    {m.role === "owner" && <SelectItem value="owner">Owner</SelectItem>}
                  </SelectContent>
                </Select>

                {m.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(m.userId)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                )}
              </div>
            </div>
          )}
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}