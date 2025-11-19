"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function InviteUserButton({ projectId }: { projectId: Id<"projects"> }) {

  const [email, setEmail] = useState("");
const [name, setName] = useState("");
  const inviteUser = useMutation(api.projects.inviteUser);

  const handleInvite = async () => {
    if (!email) return;

    try {
      await inviteUser({
        projectId,
        email,
        role: "editor",
        name
      });
      toast.success(`Invitation sent to ${email}`);
      setEmail("");
    } catch (error) {
      toast.error(`Invitation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <div className="flex gap-2">
          <Input
        placeholder="Name (ex: Marie Curie)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-64"
      />
      <Input
        placeholder="Email to invite"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-64"
      />

      <Button
        onClick={() => {
          if (!email || !name) return;
          inviteUser({ projectId, email, name, role: "editor" });
          setEmail(""); setName("");
        }}
      >
        Invite
      </Button>
    </div>
  );
}