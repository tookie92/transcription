"use client";

import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Users, Calendar, ArrowLeft, CircuitBoard, Lightbulb, ArrowRight, BarChart3, CheckCircle2, Circle, TrendingUp, Clock, Target, Zap, PieChart, DeleteIcon, Trash, Trash2, ViewIcon } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { CopyInviteLink } from "./CopyInviteLink";
import { MemberManagerDialog } from "./MemberManagerDialog";
import { TeamMembersModal } from "./TeamMembersModal";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShareProjectModal } from "./ShareProjectModal";
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
  const deleteInterview = useAction(api.interviews.deleteInterview);
  const insights = useQuery(api.insights.getByProject, { projectId });
  const affinityMaps = useQuery(api.affinityMaps.getByProject, { projectId });
  const [openManage, setOpenManage] = useState(false);
  const [openInvite, setOpenInvite] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<{ id: Id<"interviews">; title: string } | null>(null);
 

  // Calculate project progress
  const totalInsights = insights?.length || 0;
  const analyzedInterviews = interviews?.filter(i => i.status === "completed").length || 0;
  const totalInterviews = interviews?.length || 0;
  const progressPercent = totalInterviews > 0 ? Math.round((analyzedInterviews / totalInterviews) * 100) : 0;
  
  // Get current affinity map
  const currentMap = affinityMaps?.find(m => m.isCurrent);
  const totalClusters = currentMap?.clusters.length || 0;
  const groupedInsights = currentMap?.clusters.reduce((sum: number, g) => sum + g.insightIds.length, 0) || 0;
  
  // Analytics calculations
  const interviewStatusBreakdown = {
    completed: interviews?.filter(i => i.status === "completed").length || 0,
    analyzing: interviews?.filter(i => i.status === "analyzing").length || 0,
    transcribing: interviews?.filter(i => i.status === "transcribing").length || 0,
    uploading: interviews?.filter(i => i.status === "uploading").length || 0,
    ready: interviews?.filter(i => i.status === "ready").length || 0,
  };
  
  const insightsByType = {
    painPoint: insights?.filter(i => i.type === "pain-point").length || 0,
    quote: insights?.filter(i => i.type === "quote").length || 0,
    insight: insights?.filter(i => i.type === "insight").length || 0,
    followUp: insights?.filter(i => i.type === "follow-up").length || 0,
  };
  
  const totalDuration = interviews?.reduce((sum, i) => sum + (i.duration || 0), 0) || 0;
  const avgInterviewDuration = totalInterviews > 0 ? Math.round(totalDuration / totalInterviews) : 0;
  const groupingProgress = totalInsights > 0 ? Math.round((groupedInsights / totalInsights) * 100) : 0;

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
          
          <div className="flex flex-col  ">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
          <div className="flex gap-x-3">
              <ShareProjectModal projectId={projectId} projectName={project.name} />
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interviews</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInterviews}</div>
            <p className="text-xs text-muted-foreground">{analyzedInterviews} analyzed</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insights</CardTitle>
            <Lightbulb className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInsights}</div>
            <p className="text-xs text-muted-foreground">extracted</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Groups</CardTitle>
            <CircuitBoard className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClusters}</div>
            <p className="text-xs text-muted-foreground">{groupedInsights} insights grouped</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">{project.members.length}</div>
              <p className="text-xs text-muted-foreground">
                {project.ownerId === userId ? "owner" : `${project.members.length !== 1 ? 'members' : 'member'}`}
              </p>
            </div>
            <TeamMembersModal 
              projectId={projectId} 
              projectName={project.name}
              isOwner={project.ownerId === userId}
              variant="minimal"
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
                
                  <Card 
                    key={interview._id} 
                    className="group hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => router.push(`/project/${projectId}/interview/${interview._id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{interview.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {Math.floor(interview.duration / 60)}:
                              {String(Math.floor(interview.duration % 60)).padStart(2, '0')} min
                              {interview.topic && ` • ${interview.topic}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex gap-2 items-center">
                            <div>
                              <Badge variant="outline" className="mb-1">
                                {interview.status}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {new Date(interview.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInterviewToDelete({ id: interview._id, title: interview.title });
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted" />
              <h3 className="text-lg font-semibold mb-2">No interviews yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by uploading your first interview
              </p>
              <Button onClick={() => router.push(`/project/${projectId}/interview`)}>
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogTitle className="text-lg font-semibold">Supprimer l&apos;interview</DialogTitle>
          <p className="text-muted-foreground">
            Etes-vous sur de vouloir supprimer &quot;{interviewToDelete?.title}&quot; ? Cette action est irr&eacute;versible
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (interviewToDelete) {
                  try {
                    const interview = interviews?.find(i => i._id === interviewToDelete.id);
                    if (interview?.audioUrl) {
                      await fetch('/api/delete-audio', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileUrl: interview.audioUrl }),
                      });
                    }
                    await deleteInterview({ interviewId: interviewToDelete.id });
                    toast.success("Interview supprimée");
                    setDeleteDialogOpen(false);
                  } catch (error) {
                    toast.error("Erreur lors de la suppression");
                  }
                }
              }}
            >
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}