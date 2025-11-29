// app/invite/[projectId]/page.tsx - VERSION CORRIGÉE
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
  const { isLoaded, userId } = useAuth();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(prefilledEmail);
  const [isLoading, setIsLoading] = useState(false);

  // Utiliser la NOUVELLE query qui fonctionne sans accès
  const project = useQuery(api.projects.getProjectForInvite, { projectId });
  const claim = useMutation(api.projects.claimInvite);

  console.log("📨 INVITE PAGE DEBUG:", { 
    projectId, 
    prefilledEmail, 
    userId,
    userEmail: user?.emailAddresses[0]?.emailAddress,
    project: project
  });

  useEffect(() => {
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [prefilledEmail]);

  useEffect(() => {
    if (!isLoaded) return;
    
    // Si l'utilisateur n'est pas connecté
    if (!user) {
      toast.info("Please sign in to join the project");
      const currentUrl = window.location.href;
      router.push(`/sign-in?redirect_url=${encodeURIComponent(currentUrl)}`);
      return;
    }

    // Vérifier si déjà membre (une fois le projet chargé)
    if (project && userId) {
      const isMember = project.members.some(m => m.userId === userId);
      if (isMember) {
        toast.info("You are already a member of this project");
        router.push(`/project/${projectId}`);
        return;
      }
    }
  }, [user, isLoaded, router, project, userId, projectId]);

  const handleJoin = async () => {
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    if (!project) {
      toast.error("Project not found");
      return;
    }

    setIsLoading(true);

    try {
      console.log("🎯 Claiming invitation...", { projectId, email });
      await claim({ projectId, email });
      toast.success("Successfully joined the project!");
      router.push(`/project/${projectId}`);
    } catch (error) {
      console.error("❌ Claim failed:", error);
      toast.error(`Failed to join project: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-6 w-96 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading project...</p>
        </Card>
      </div>
    );
  }

  // Vérifier si l'email est invité
  const hasInvite = project.members.some(m => m.userId === email);
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  console.log("🔍 INVITE CHECK:", {
    email,
    hasInvite,
    userEmail,
    members: project.members
  });

  if (!hasInvite) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-6 w-96">
          <h1 className="text-xl font-bold mb-2 text-red-600">Invitation Not Found</h1>
          <p className="text-sm text-gray-600 mb-4">
            The email <strong>{email}</strong> was not invited to join:<br/>
            <strong>{project.name}</strong>
          </p>
          <div className="space-y-2">
            <p className="text-xs text-gray-500">Available invitations for this project:</p>
            {project.members
              .filter(m => m.userId.includes('@')) // Montrer seulement les invitations par email
              .map((member, index) => (
                <div key={index} className="text-xs bg-gray-100 p-2 rounded">
                  📧 {member.userId} - {member.role}
                </div>
              ))
            }
          </div>
          <Button onClick={() => router.push("/")} className="w-full mt-4">
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <Card className="p-6 w-96">
        <div className="text-center mb-2">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🎯</span>
          </div>
          <h1 className="text-xl font-bold">You{`'`}re Invited!</h1>
        </div>
        
        <p className="text-sm text-gray-600 mb-4 text-center">
          Join <strong>{project.name}</strong> as a collaborator
        </p>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Email address</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
              disabled={!!prefilledEmail}
            />
          </div>
          
          <Button 
            onClick={handleJoin} 
            className="w-full"
            disabled={!email || isLoading}
          >
            {isLoading ? "Joining..." : "Join Project"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => router.push("/")}
            className="w-full"
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-700">
          <strong>Note:</strong> You{`'`}ll be added as an <strong>editor</strong> with full access to collaborate on this project.
        </div>
      </Card>
    </div>
  );
}