"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Users, Calendar, ArrowLeft, CircuitBoard, Lightbulb, ArrowRight, BarChart3, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { CopyInviteLink } from "./CopyInviteLink";
import { MemberManagerDialog } from "./MemberManagerDialog";
import { TeamMembersModal } from "./TeamMembersModal";
import { Dialog, DialogContent } from "../ui/dialog";
import { DialogTitle, DialogTrigger } from "@radix-ui/react-dialog";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { InviteUserButton } from "./InviteUserButton";

interface ProjectContentProps {
  projectId:  Id<"projects">;
}

export function ProjectContent({ projectId }: ProjectContentProps) {
  const router = useRouter();
  const {userId} = useAuth();
  const {user} = useUser();
  
  // Récupérer les données du projet
const userEmail = user?.emailAddresses?.[0]?.emailAddress || "";
// Remplacer la query actuelle
const project = useQuery(api.projects.getProjectForInvite, { projectId });


  const interviews = useQuery(api.interviews.getProjectInterviews, { projectId });
  const insights = useQuery(api.insights.getByProject, { projectId });
  const affinityMaps = useQuery(api.affinityMaps.getByProject, { projectId });
  const [openManage, setOpenManage] = useState(false);
  const [openInvite, setOpenInvite] = useState(false);

  // Calculate project progress
  const totalInsights = insights?.length || 0;
  const analyzedInterviews = interviews?.filter(i => i.status === "completed").length || 0;
  const totalInterviews = interviews?.length || 0;
  const progressPercent = totalInterviews > 0 ? Math.round((analyzedInterviews / totalInterviews) * 100) : 0;
  
  // Get current affinity map
  const currentMap = affinityMaps?.find(m => m.isCurrent);
  const totalGroups = currentMap?.groups.length || 0;
  const groupedInsights = currentMap?.groups.reduce((sum, g) => sum + g.insightIds.length, 0) || 0;

// Dans ProjectContent.tsx - MODIFIER le useEffect
useEffect(() => {
  if (!project || !userId || !user?.emailAddresses?.[0]?.emailAddress) return;

  const userEmail = user.emailAddresses[0].emailAddress;
  
  console.log("🔍 CHECKING INVITATION:", {
    userId,
    userEmail, 
    projectMembers: project.members
  });

  // Vérifier si déjà membre par userId
  const isMember = project.members.some(m => m.userId === userId);
  
  // Vérifier si invité par email
  const isInvitedByEmail = project.members.some(m => m.userId === userEmail);

  console.log("📊 RESULTS:", { isMember, isInvitedByEmail });

  if (isInvitedByEmail && !isMember) {
    console.log("🔄 Redirecting to invite page");
    router.push(`/invite/${projectId}?email=${encodeURIComponent(userEmail)}`);
  }
}, [project, userId, user, projectId, router]);

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-2xl font-bold">Project not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-8 items-center justify-between">
        <div className="flex items-center  w-full justify-between">
          <Button variant="outline" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600 mt-1">{project.description}</p>
            )}
          </div>
          <div className="flex gap-x-3">
              <Button onClick={() => router.push(`/project/${projectId}/interview/`)}>
                <Plus className="w-4 h-4" />
                New Interview
              </Button> 
               <Button onClick={() => router.push(`/project/${projectId}/affinity/`)}>
                <CircuitBoard className="w-4 h-4" />
                Affinity Map
              </Button> 
          </div>
        </div>
        <div className="flex">
          {/* <InviteUserButton projectId={projectId} /> */}
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Interviews</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{totalInterviews}</div>
            <p className="text-xs text-blue-600">{analyzedInterviews} analyzed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Insights</CardTitle>
            <Lightbulb className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{totalInsights}</div>
            <p className="text-xs text-purple-600">extracted</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Groups</CardTitle>
            <CircuitBoard className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{totalGroups}</div>
            <p className="text-xs text-green-600">{groupedInsights} insights grouped</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Team</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{project.members.length}</div>
            <p className="text-xs text-orange-600">
              {project.ownerId === userId ? "owner" : "member{project.members.length !== 1 ? 's' : ''}"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Progress</CardTitle>
            <BarChart3 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{progressPercent}%</div>
            <div className="w-full bg-amber-200 rounded-full h-1.5 mt-1">
              <div 
                className="bg-amber-500 h-1.5 rounded-full transition-all" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/project/${projectId}/affinity/`)}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CircuitBoard className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">Open Affinity Map</h3>
              <p className="text-sm text-gray-500">Group and organize insights</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/project/${projectId}/interview/`)}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">Add Interview</h3>
              <p className="text-sm text-gray-500">Upload and transcribe new interview</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">Invite Team</h3>
              <p className="text-sm text-gray-500">Collaborate with your team</p>
            </div>
            <TeamMembersModal 
              projectId={projectId} 
              projectName={project.name}
              isOwner={project.ownerId === userId}
            />
          </CardContent>
        </Card>
      </div>

      {/* Interviews List */}
      <Card>
        <CardHeader>
          <CardTitle>Interviews</CardTitle>
          <CardDescription>
            All interviews conducted for this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {interviews && interviews.length > 0 ? (
            <div className="space-y-4">
              {interviews.map((interview) => (
                <Link 
                  key={interview._id} 
                  href={`/project/${projectId}/interview/${interview._id}`}
                  className="block"
                >
                  <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{interview.title}</h3>
                            <p className="text-sm text-gray-500">
                              {Math.floor(interview.duration / 60)}:
                              {String(Math.floor(interview.duration % 60)).padStart(2, '0')} min
                              {interview.topic && ` • ${interview.topic}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="mb-1">
                            {interview.status}
                          </Badge>
                          <p className="text-xs text-gray-500">
                            {new Date(interview.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">No interviews yet</h3>
              <p className="text-gray-500 mb-4">
                Start by uploading your first interview
              </p>
              <Button onClick={() => router.push("/")}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Interview
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {project.ownerId === userId && (
        <MemberManagerDialog
          projectId={projectId}
          open={openManage}
          onOpenChange={setOpenManage}
        />
      )}
    </div>
  );
}