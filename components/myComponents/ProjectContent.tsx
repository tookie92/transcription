"use client";

import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Users, ArrowLeft, CircuitBoard, Lightbulb, ArrowRight, CheckCircle2, Circle, Clock, Trash2, ChevronRight, MoreHorizontal, Share2, Mic, Sparkles, BarChart3, UserPlus } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import { DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { ShareProjectModal } from "./ShareProjectModal";
import { TeamDialog } from "./TeamDialog";

interface ProjectContentProps {
  projectId: Id<"projects">;
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext, 
  color,
  progress,
  progressLabel,
  delay,
  actionIcon: ActionIcon,
  onActionClick 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number;
  subtext?: string;
  color: string;
  progress?: number;
  progressLabel?: string;
  delay?: number;
  actionIcon?: React.ElementType;
  onActionClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="group relative bg-card rounded-2xl border border-border p-5 hover:border-primary/30 transition-all duration-300"
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div 
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-semibold" style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
            {value}
          </span>
          {ActionIcon && onActionClick && (
            <button 
              onClick={onActionClick}
              className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <ActionIcon className="w-4 h-4 text-muted-foreground hover:text-primary" />
            </button>
          )}
        </div>
      </div>
      
      <p className="font-medium text-sm mb-1">{label}</p>
      {subtext && (
        <p className="text-xs text-muted-foreground">{subtext}</p>
      )}
      
      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">{progressLabel}</span>
            <span className="font-medium" style={{ color }}>{progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, delay: (delay || 0) + 0.2 }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function InterviewCard({ 
  interview, 
  projectId, 
  onDelete,
  index 
}: { 
  interview: any; 
  projectId: string;
  onDelete: (id: Id<"interviews">, title: string) => void;
  index: number;
}) {
  const router = useRouter();
  const statusColors: Record<string, string> = {
    completed: "bg-green-500",
    analyzing: "bg-amber-500",
    transcribing: "bg-blue-500",
    uploading: "bg-purple-500",
    ready: "bg-cyan-500",
  };

  const statusBg: Record<string, string> = {
    completed: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900",
    analyzing: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900",
    transcribing: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
    uploading: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900",
    ready: "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-900",
  };

  const duration = interview.duration ? `${Math.floor(interview.duration / 60)}:${String(Math.floor(interview.duration % 60)).padStart(2, '0')}` : "0:00";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group"
    >
      <div 
        className="relative p-5 bg-card rounded-2xl border border-border hover:border-primary/40 transition-all duration-300 cursor-pointer"
        onClick={() => router.push(`/project/${projectId}/interview/${interview._id}`)}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                  {interview.title}
                </h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {duration}
                  </span>
                  {interview.topic && (
                    <span className="text-muted-foreground/70">• {interview.topic}</span>
                  )}
                </div>
              </div>
              
              {/* Status & Actions */}
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusBg[interview.status] || statusBg.ready}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusColors[interview.status] || statusColors.ready} mr-1.5 inline-block animate-pulse`} />
                  {interview.status}
                </span>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(interview._id, interview.title);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Date */}
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(interview.createdAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ onCreateInterview }: { onCreateInterview: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center py-16 px-8"
    >
      {/* Illustration */}
      <div className="relative w-32 h-32 mx-auto mb-8">
        <div className="absolute inset-0 bg-primary/5 rounded-full" />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-card rounded-2xl border border-border shadow-sm flex items-center justify-center"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Mic className="w-8 h-8 text-primary" />
        </motion.div>
        {/* Decorative elements */}
        <motion.div
          className="absolute -top-2 -right-2 w-6 h-6 bg-[#FFF9C4] rounded-lg shadow-sm"
          animate={{ rotate: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-1 -left-3 w-5 h-5 bg-[#C8E6C9] rounded-full shadow-sm"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        />
      </div>
      
      <h3 
        className="text-2xl font-normal mb-3"
        style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
      >
        No interviews yet
      </h3>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Upload your first interview to start extracting insights with AI-powered analysis
      </p>
      
      <Button 
        onClick={onCreateInterview}
        size="lg"
        className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8"
      >
        <Plus className="w-5 h-5 mr-2" />
        Upload Your First Interview
      </Button>
      
      {/* How it works */}
      <div className="mt-16 max-w-2xl mx-auto">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-6">
          How it works
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Mic, step: "01", title: "Upload", desc: "Upload audio or video" },
            { icon: Sparkles, step: "02", title: "AI Analysis", desc: "Get automatic insights" },
            { icon: BarChart3, step: "03", title: "Organize", desc: "Map your findings" },
          ].map((item, i) => (
            <div key={i} className="relative p-5 bg-card rounded-xl border border-border">
              <span 
                className="text-4xl font-normal absolute top-3 right-4 opacity-[0.05]"
                style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
              >
                {item.step}
              </span>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-medium text-sm mb-1">{item.title}</h4>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function ProjectContent({ projectId }: ProjectContentProps) {
  const router = useRouter();
  const { userId } = useAuth();
  const { user } = useUser();
  
  const project = useQuery(api.projects.getProjectForInvite, { projectId });
  const interviews = useQuery(api.interviews.getProjectInterviews, { projectId });
  const insights = useQuery(api.insights.getByProject, { projectId });
  const affinityMaps = useQuery(api.affinityMaps.getByProject, { projectId });
  const deleteInterview = useAction(api.interviews.deleteInterview);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<{ id: Id<"interviews">; title: string } | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);

  // Calculate stats
  const totalInsights = insights?.length || 0;
  const analyzedInterviews = interviews?.filter(i => i.status === "completed").length || 0;
  const totalInterviews = interviews?.length || 0;
  const progressPercent = totalInterviews > 0 ? Math.round((analyzedInterviews / totalInterviews) * 100) : 0;
  
  const currentMap = affinityMaps?.find(m => m.isCurrent);
  const totalClusters = currentMap?.clusters.length || 0;
  const groupedInsights = currentMap?.clusters.reduce((sum: number, g) => sum + g.insightIds.length, 0) || 0;
  const groupingProgress = totalInsights > 0 ? Math.round((groupedInsights / totalInsights) * 100) : 0;

  useEffect(() => {
    if (!project || !userId || !user?.emailAddresses?.[0]?.emailAddress) return;
    
    const userEmail = user.emailAddresses[0].emailAddress;
    const isMember = project.members.some((m: any) => m.userId === userId);
    const isInvitedByEmail = project.members.some((m: any) => m.userId === userEmail);

    if (isInvitedByEmail && !isMember) {
      router.push(`/invite/${projectId}?email=${encodeURIComponent(userEmail)}`);
    }
  }, [project, userId, user, projectId, router]);

  const handleDeleteInterview = (id: Id<"interviews">, title: string) => {
    setInterviewToDelete({ id, title });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!interviewToDelete) return;
    
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
      toast.success("Interview deleted");
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete interview");
    }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Clock className="w-5 h-5 text-muted-foreground animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-6"
      >
        <div className="flex-1">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Link href="/project" className="hover:text-foreground transition-colors">
              Projects
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-medium">{project.name}</span>
          </div>
          
          {/* Title */}
          <h1 
            className="text-3xl lg:text-4xl font-normal tracking-tight mb-2"
            style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
          >
            {project.name}
          </h1>
          
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
          
          {/* Meta */}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Created {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {project.members.length} member{project.members.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-3">
          <ShareProjectModal projectId={projectId} projectName={project.name} />
          <Button
            variant="outline"
            onClick={() => router.push(`/project/${projectId}/affinity/`)}
            className="h-10"
          >
            <CircuitBoard className="w-4 h-4 mr-2" />
            Affinity Map
          </Button>
          <Button
            onClick={() => router.push(`/project/${projectId}/interview/`)}
            className="bg-primary hover:bg-primary/90 h-10"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Interview
          </Button>
        </div>
      </motion.div>

      {/* Quick Status Strip */}
      {totalInterviews > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Project Progress</span>
            <span className="text-sm text-muted-foreground">{progressPercent}% analyzed</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>{analyzedInterviews} of {totalInterviews} interviews analyzed</span>
            <span>{groupingProgress}% of insights grouped</span>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="Interviews"
          value={totalInterviews}
          subtext={`${analyzedInterviews} analyzed`}
          color="#3B82F6"
          progress={progressPercent}
          progressLabel="Analyzed"
          delay={0.1}
        />
        <StatCard
          icon={Lightbulb}
          label="Insights"
          value={totalInsights}
          subtext="extracted from interviews"
          color="#A855F7"
          delay={0.15}
        />
        <StatCard
          icon={CircuitBoard}
          label="Clusters"
          value={totalClusters}
          subtext={`${groupedInsights} insights grouped`}
          color="#22C55E"
          progress={groupingProgress}
          progressLabel="Grouped"
          delay={0.2}
        />
        <StatCard
          icon={Users}
          label="Team"
          value={project.members.length}
          subtext={project.ownerId === userId ? "you are owner" : "collaborators"}
          color="#F97316"
          delay={0.25}
          actionIcon={project.ownerId === userId ? UserPlus : undefined}
          onActionClick={project.ownerId === userId ? () => setTeamDialogOpen(true) : undefined}
        />
      </div>

      {/* Invite Dialog */}
      <TeamDialog 
        projectId={projectId} 
        open={teamDialogOpen} 
        onOpenChange={setTeamDialogOpen} 
      />

      {/* Interviews Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 
              className="text-xl font-semibold"
              style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
            >
              Interviews
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalInterviews > 0 ? `${totalInterviews} interview${totalInterviews !== 1 ? 's' : ''} in this project` : 'Get started with your first interview'}
            </p>
          </div>
          {totalInterviews > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/project/${projectId}/interview/`)}
              className="text-muted-foreground"
            >
              View all
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
        
        {totalInterviews > 0 ? (
          <div className="space-y-3">
            {interviews?.slice(0, 5).map((interview, index) => (
              <InterviewCard
                key={interview._id}
                interview={interview}
                projectId={projectId}
                onDelete={handleDeleteInterview}
                index={index}
              />
            ))}
            
            {interviews && interviews.length > 5 && (
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => router.push(`/project/${projectId}/interview/`)}
              >
                View all {interviews.length} interviews
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        ) : (
          <EmptyState onCreateInterview={() => router.push(`/project/${projectId}/interview/`)} />
        )}
      </motion.div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-lg font-semibold">Delete Interview</DialogTitle>
          <p className="text-muted-foreground">
            Are you sure you want to delete &quot;{interviewToDelete?.title}&quot;? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
