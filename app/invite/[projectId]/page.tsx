// app/invite/[projectId]/page.tsx - REDESIGNED
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
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  Mail, 
  Loader2, 
  FileText, 
  Sparkles,
  PartyPopper
} from "lucide-react";

export default function InvitePage() {
  const { projectId } = useParams() as { projectId: Id<"projects"> };
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(prefilledEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const project = useQuery(api.projects.getProjectForInvite, { projectId });
  const claim = useMutation(api.projects.claimInvite);

  useEffect(() => {
    if (prefilledEmail) setEmail(prefilledEmail);
  }, [prefilledEmail]);

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      toast.info("Please sign in to join the project");
      const currentUrl = window.location.href;
      router.push(`/sign-in?redirect_url=${encodeURIComponent(currentUrl)}`);
      return;
    }

    if (project && userId) {
      const isMember = project.members.some(m => m.userId === userId);
      if (isMember) {
        toast.info("You are already a member");
        router.push(`/project/${projectId}`);
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

    setIsJoining(true);

    try {
      await claim({ projectId, email });
      toast.success("Welcome to the project!");
      router.push(`/project/${projectId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to join");
    } finally {
      setIsJoining(false);
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
          <p className="text-gray-500">Loading invitation...</p>
        </motion.div>
      </div>
    );
  }

  const hasInvite = project.members.some(m => m.userId === email);
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  if (!hasInvite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <Card className="p-8 text-center shadow-xl">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Invitation Not Found
            </h1>
            <p className="text-gray-600 mb-6">
              The email <strong className="text-gray-900">{email}</strong> was not invited to join this project.
            </p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Project: {project.name}</p>
              <p className="text-xs text-gray-500">{project.members.length} members</p>
            </div>

            <Button 
              onClick={() => router.push("/")}
              variant="outline"
              className="w-full"
            >
              Go to Home
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3D7C6F]/5 to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Card className="overflow-hidden shadow-2xl">
          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-[#3D7C6F] to-[#2d5f54] p-8 text-white text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <PartyPopper className="w-10 h-10" />
            </motion.div>
            <h1 className="text-2xl font-bold mb-2">
              You&apos;ve Been Invited! 🎉
            </h1>
            <p className="text-white/80">
              Join <strong>{project.name}</strong> to start collaborating
            </p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Project Info */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 bg-[#3D7C6F]/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#3D7C6F]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{project.name}</p>
                <p className="text-sm text-gray-500">{project.members.length} team members</p>
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Your email address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="h-12"
              />
            </div>

            {/* User Info */}
            {user && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl"
              >
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Signed in as {user.fullName || user.username}
                  </p>
                  <p className="text-xs text-green-600">{user.emailAddresses[0]?.emailAddress}</p>
                </div>
              </motion.div>
            )}

            {/* Join Button */}
            <Button
              onClick={handleJoin}
              disabled={isJoining || !email}
              className="w-full h-12 bg-[#3D7C6F] hover:bg-[#2d5f54] text-lg font-medium"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  Join Project
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            {/* Benefits */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              {[
                { icon: Users, label: "Collaborate" },
                { icon: FileText, label: "Organize" },
                { icon: Sparkles, label: "Analyze" }
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <item.icon className="w-6 h-6 mx-auto text-[#3D7C6F] mb-1" />
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
