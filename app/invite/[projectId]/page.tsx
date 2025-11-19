// app/invite/[projectId]/page.tsx
"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Id } from "@/convex/_generated/dataModel";

export default function InvitePage() {
  const { projectId } = useParams() as { projectId: Id<"projects"> };
  const router = useRouter();
  const { isLoaded } = useAuth();
  const { user } = useUser();
  const [email, setEmail] = useState("");

  const searchParams = useSearchParams();
const prefilledEmail = searchParams.get("email") || "";


    const project = useQuery(api.projects.getByIdWithEmail, {
    projectId,
    userEmail: user?.emailAddresses[0]?.emailAddress || "", // ← email connecté
  });

  console.log("📨 invite page", { projectId, prefilledEmail, userEmail: user?.emailAddresses[0]?.emailAddress, project });
  const claim = useMutation(api.projects.claimInvite);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      toast.info("Please sign in to join the project");
      router.push(`/sign-in?redirect_url=${window.location.href}`);
    }
  }, [user, isLoaded, router]);

const handleJoin = async () => {
  if (!email) return;
  await claim({ projectId, email });
  router.push(`/project/${projectId}`);
};



  if (!project) return <p>Loading…</p>;

    const hasInvite = project.members.some(m => m.userId === prefilledEmail);
    if (!hasInvite) {
    return <p>You were not invited with this email.</p>;
    }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <Card className="p-6 w-96">
        <h1 className="text-xl font-bold mb-2">You’ve been invited</h1>
        <p className="text-sm text-gray-600 mb-4">
          to collaborate on <strong>{project.name}</strong>
        </p>
        <Input
        placeholder="Confirm your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        // defaultValue={prefilledEmail} // ← pré-rempli
        />
        <Button onClick={handleJoin} className="w-full mt-3">
          Join project
        </Button>
      </Card>
    </div>
  );
}