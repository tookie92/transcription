"use client";

export const dynamic = 'force-dynamic';

import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell, RefreshCcwIcon, Plus, Users, Folder, ArrowRight, Clock, Mic, Sparkles, FileText, Crown, UserPlus, X, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { motion, useScroll, useTransform } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth, useUser } from "@clerk/nextjs";
import Image from "next/image";

const ProjectPage = () => {
  const router = useRouter();
  const { userId } = useAuth();
  const { user } = useUser();
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [mounted, setMounted] = useState(false);

  const { scrollY } = useScroll();
  const headerBg = useTransform(scrollY, [0, 50], ["rgba(250, 248, 245, 0)", "rgba(250, 248, 245, 0.95)"]);
  const headerBorder = useTransform(scrollY, [0, 50], [0, 1]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  const projects = useQuery(api.projects.getUserProjects, { 
    userEmail 
  });
  const createProject = useMutation(api.projects.createProject);

  const ownerProjects = projects?.filter(project => project.ownerId === userId) || [];
  const memberProjects = projects?.filter(project => 
    project.ownerId !== userId && 
    project.members.some(m => m.userId === userId || m.userId === userEmail)
  ) || [];

  const pendingInvitations = projects?.flatMap(project => 
    project.members
      .filter(m => m.userId.includes('@') && m.userId === userEmail)
      .map(m => ({
        projectId: project._id,
        projectName: project.name,
        email: m.userId,
        role: m.role,
        invitedBy: m.invitedBy
      }))
  ) || [];

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    setIsCreating(true);
    try {
      const result = await createProject({
        name: projectName,
      });
      toast.success("Project created!");
      setShowTemplateDialog(false);
      setProjectName("");
      router.push(`/project/${result}`);
    } catch (error) {
      toast.error("Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const acceptInvite = useMutation(api.projects.claimInvite);
  const declineInvite = useMutation(api.projects.declineInvite);
  const deleteProject = useMutation(api.projects.deleteProject);

  const handleAcceptInvite = async (invite: { projectId: string; email: string }) => {
    try {
      await acceptInvite({ 
        projectId: invite.projectId as Id<"projects">, 
        email: invite.email 
      });
      toast.success("You joined the project!");
    } catch (error) {
      toast.error("Failed to join project");
    }
  };

  const handleDeclineInvite = async (invite: { projectId: string; email: string }) => {
    try {
      await declineInvite({ 
        projectId: invite.projectId as Id<"projects">, 
        email: invite.email 
      });
      toast.success("Invitation declined");
    } catch (error) {
      toast.error("Failed to decline invitation");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteProject({ projectId: projectId as Id<"projects"> });
      toast.success("Project deleted");
    } catch (error) {
      toast.error("Failed to delete project");
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-dvh w-full bg-background" />
    );
  }

  return (
    <div className="min-h-dvh w-full bg-background">
      {/* Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          backgroundColor: headerBg,
          borderBottomWidth: headerBorder,
          borderBottomStyle: "solid",
          borderBottomColor: "var(--border)",
        }}
      >
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-3 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
              onClick={() => router.push("/")}
            >
              <Image
                height={36}
                width={36}
                src="/logo.svg"
                alt="Skripta"
                className="w-9 h-9"
              />
              <span 
                className="text-xl font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                Skripta
              </span>
            </motion.div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Button 
                onClick={() => setShowTemplateDialog(true)}
                disabled={isCreating}
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-5"
              >
                {isCreating ? (
                  <RefreshCcwIcon className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                New Project
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="pt-28 pb-16 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-end gap-4 mb-2">
              <h1 
                className="text-4xl md:text-5xl font-normal tracking-tight"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                Your Projects
              </h1>
              {projects && projects.length > 0 && (
                <span className="text-lg text-muted-foreground mb-2">
                  {projects.length} total
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-lg">
              Manage your interviews and affinity maps
            </p>
          </motion.div>

          {/* Create Project Dialog */}
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl" style={{ fontFamily: "var(--font-display), sans-serif" }}>
                  Create New Project
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Project Name</label>
                  <Input
                    placeholder="Enter project name..."
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                    autoFocus
                    className="h-11"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateProject}
                    disabled={!projectName.trim() || isCreating}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isCreating && <RefreshCcwIcon className="w-4 h-4 animate-spin mr-2" />}
                    Create Project
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Pending Invitations Banner */}
          {pendingInvitations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10"
            >
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--warm-terracotta)]/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-[var(--warm-terracotta)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Pending Invitations</h3>
                    <p className="text-sm text-muted-foreground">{pendingInvitations.length} project{pendingInvitations.length !== 1 ? 's' : ''} waiting</p>
                  </div>
                </div>
                <div className="grid gap-3">
                  {pendingInvitations.map((invite, index) => (
                    <motion.div
                      key={`${invite.projectId}-${invite.email}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-background border border-border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{invite.projectName}</p>
                          <p className="text-sm text-muted-foreground">Invited by {invite.invitedBy}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                          onClick={() => handleAcceptInvite(invite)}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeclineInvite(invite)}
                        >
                          Decline
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Projects Content */}
          {projects && projects.length > 0 ? (
            <>
              {/* Owner Projects */}
              {ownerProjects.length > 0 && (
                <motion.div
                  className="mb-10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <Crown className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-semibold">My Projects</h2>
                    <span className="text-sm text-muted-foreground">({ownerProjects.length})</span>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {ownerProjects.map((project, index) => (
                      <motion.div
                        key={project._id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                        onClick={() => router.push(`/project/${project._id}`)}
                        className="group bg-card rounded-2xl border border-border p-6 hover:border-primary/40 transition-all duration-300 cursor-pointer"
                        whileHover={{ y: -4 }}
                      >
                        <div className="flex items-start justify-between mb-5">
                          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Folder className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(project._id);
                              }}
                              className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                              title="Delete project"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                        
                        <h3 className="font-semibold text-lg mb-2 truncate group-hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-5 min-h-[40px]">
                          {project.description || "No description"}
                        </p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Member Projects */}
              {memberProjects.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <UserPlus className="w-5 h-5 text-[var(--warm-terracotta)]" />
                    <h2 className="text-xl font-semibold">Shared with Me</h2>
                    <span className="text-sm text-muted-foreground">({memberProjects.length})</span>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {memberProjects.map((project, index) => (
                      <motion.div
                        key={project._id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        onClick={() => router.push(`/project/${project._id}`)}
                        className="group bg-card rounded-2xl border border-border p-6 hover:border-[var(--warm-terracotta)]/40 transition-all duration-300 cursor-pointer"
                        whileHover={{ y: -4 }}
                      >
                        <div className="flex items-start justify-between mb-5">
                          <div className="w-14 h-14 rounded-2xl bg-[var(--warm-terracotta)]/10 flex items-center justify-center group-hover:bg-[var(--warm-terracotta)]/20 transition-colors">
                            <Folder className="w-6 h-6 text-[var(--warm-terracotta)]" />
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-[var(--warm-terracotta)] group-hover:translate-x-1 transition-all" />
                        </div>
                        
                        <h3 className="font-semibold text-lg mb-2 truncate group-hover:text-[var(--warm-terracotta)] transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-5 min-h-[40px]">
                          {project.description || "No description"}
                        </p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            /* Empty State */
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Decorative illustration */}
              <div className="relative w-32 h-32 mx-auto mb-8">
                <div className="absolute inset-0 bg-primary/5 rounded-full" />
                <motion.div
                  className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-card rounded-2xl border border-border flex items-center justify-center shadow-sm"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Folder className="w-8 h-8 text-primary" />
                </motion.div>
              </div>

              <h2 
                className="text-3xl font-normal mb-3"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                No projects yet
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
                Create your first project to start organizing interviews and uncovering insights
              </p>
              
              <Button 
                onClick={() => setShowTemplateDialog(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8 text-base"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Project
              </Button>
              
              {/* Quick Start Guide */}
              <div className="mt-16 max-w-3xl mx-auto">
                <p 
                  className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-6"
                  style={{ fontFamily: "var(--font-display), sans-serif" }}
                >
                  How it works
                </p>
                <div className="grid sm:grid-cols-3 gap-6">
                  {[
                    {
                      icon: Mic,
                      step: "01",
                      title: "Upload Interviews",
                      description: "Upload audio or video files for AI transcription"
                    },
                    {
                      icon: Sparkles,
                      step: "02",
                      title: "AI Analysis",
                      description: "Extract insights and detect themes automatically"
                    },
                    {
                      icon: FileText,
                      step: "03",
                      title: "Affinity Mapping",
                      description: "Organize insights with drag-and-drop diagrams"
                    },
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      className="relative p-6 bg-card rounded-2xl border border-border group hover:border-primary/30 transition-all"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      whileHover={{ y: -4 }}
                    >
                      <span 
                        className="text-5xl font-normal absolute top-4 right-4 opacity-[0.05]"
                        style={{ fontFamily: "var(--font-display), sans-serif" }}
                      >
                        {item.step}
                      </span>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <item.icon className="w-6 h-6 text-primary" />
                      </div>
                      <h4 className="font-semibold mb-2">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectPage;
