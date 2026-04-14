"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Crown, User, Trash2, Shield } from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";

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

export function TeamDialog({ projectId, trigger, open, onOpenChange }: TeamDialogProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen;
  
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  
  const project = useQuery(api.projects.getProjectForInvite, { projectId });
  const inviteUser = useMutation(api.projects.inviteUser);
  const removeMember = useMutation(api.projects.removeMember);
  const isOwner = project?.ownerId === userId;

  const handleInvite = async () => {
    if (!newName || !newEmail) {
      toast.error("Please enter name and email");
      return;
    }

    setIsAdding(true);
    try {
      const inviterName = user?.fullName || user?.firstName || user?.username || "Team member";
      await inviteUser({
        projectId,
        email: newEmail,
        name: inviterName,
        role: "editor",
      });
      toast.success(`Invitation sent to ${newEmail}`);
      setNewName("");
      setNewEmail("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to invite");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (memberEmail: string) => {
    try {
      await removeMember({
        projectId,
        userId: memberEmail,
      });
      toast.success("Member removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    }
  };

  const members = project?.members || [];
  const owner = members.find((m: Member) => m.role === "owner" || m.email === project?.ownerId);
  const editors = members.filter((m: Member) => m.role === "editor");
  const viewers = members.filter((m: Member) => m.role === "viewer");

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <UserPlus className="w-4 h-4" />
      Manage Team
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Team Members
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Owner Section */}
          {owner && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                Owner
              </h4>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200">
                <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium">{owner.name || "Owner"}</p>
                  <p className="text-xs text-muted-foreground">{owner.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Editors Section */}
          {editors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                Editors ({editors.length})
              </h4>
              <div className="space-y-2">
                {editors.map((member: Member, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    {isOwner && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveMember(member.email!)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Viewers Section */}
          {viewers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                Viewers ({viewers.length})
              </h4>
              <div className="space-y-2">
                {viewers.map((member: Member, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    {isOwner && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveMember(member.email!)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invite New Member */}
          {isOwner && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Invite New Member</h4>
              <div className="space-y-3">
                <Input
                  placeholder="Name (e.g., Marie Curie)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Input
                  placeholder="Email to invite"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <Button 
                  onClick={handleInvite} 
                  disabled={isAdding || !newName || !newEmail}
                  className="w-full gap-2"
                >
                  {isAdding ? "Sending..." : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}