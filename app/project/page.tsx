"use client";

import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell, RefreshCcwIcon, Plus, Users, Folder, ArrowRight, Clock, Mic, Sparkles, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";

const ProjectPage = () => {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [projectName, setProjectName] = useState("");

  const projects = useQuery(api.projects.getUserProjects);
  const createProject = useMutation(api.projects.createProject);

  // Find pending invitations
  const pendingInvitations = projects?.flatMap(project => 
    project.members
      .filter(m => m.userId.includes('@'))
      .map(m => ({
        projectId: project._id,
        projectName: project.name,
        email: m.userId,
        role: m.role,
        name: m.name
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

  return (
    <div className="min-h-dvh w-full p-8 bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Your Projects</h1>
            <p className="text-muted-foreground mt-1">Manage your interviews and affinity maps</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button 
              onClick={() => setShowTemplateDialog(true)}
              disabled={isCreating}
              className="bg-primary hover:bg-primary/90"
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

      {/* Create Project Dialog - Simplified */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter a name to get started
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Project Name Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Project Name</label>
              <Input
                placeholder="Enter project name..."
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                autoFocus
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={!projectName.trim() || isCreating}
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
        <div className="max-w-4xl mx-auto mb-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-orange-600" />
              <span className="font-semibold text-orange-800">Pending Invitations</span>
              <span className="px-2 py-0.5 bg-orange-200 text-orange-700 text-xs rounded-full">
                {pendingInvitations.length}
              </span>
            </div>
            <div className="grid gap-3">
              {pendingInvitations.map((invite, index) => (
                <motion.div
                  key={`${invite.projectId}-${invite.email}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between bg-card rounded-lg p-3 border border-orange-200 dark:border-orange-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{invite.projectName}</p>
                      <p className="text-sm text-muted-foreground">Invited by {invite.name}</p>
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
                      onClick={() => {
                        // For now, just refresh - decline would need mutation
                        toast.info("Refresh to see changes");
                      }}
                    >
                      Decline
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Projects Grid */}
      <div className="max-w-4xl mx-auto">
        {projects && projects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <motion.div
                key={project._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => router.push(`/project/${project._id}`)}
                className="group bg-card rounded-xl border border-border p-5 hover:border-primary hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-linear-to-br from-primary/10 to-purple-100 dark:to-purple-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Folder className="w-6 h-6 text-primary" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                
                <h3 className="font-semibold text-lg text-foreground mb-1 truncate">
                  {project.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {project.description || "No description"}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Folder className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">No projects yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Create your first project to start organizing interviews and insights
            </p>
            <Button 
              onClick={() => setShowTemplateDialog(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
            
            {/* Quick Start Guide */}
            <div className="mt-12 max-w-2xl mx-auto">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">How it works</h3>
              <div className="grid sm:grid-cols-3 gap-6 text-left">
                <div className="p-4 bg-card rounded-xl border">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                    <Mic className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="font-medium text-sm mb-1">1. Upload Interviews</h4>
                  <p className="text-xs text-muted-foreground">Upload audio or video files for AI transcription</p>
                </div>
                <div className="p-4 bg-card rounded-xl border">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="font-medium text-sm mb-1">2. AI Analysis</h4>
                  <p className="text-xs text-muted-foreground">Extract insights and detect themes automatically</p>
                </div>
                <div className="p-4 bg-card rounded-xl border">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="font-medium text-sm mb-1">3. Affinity Mapping</h4>
                  <p className="text-xs text-muted-foreground">Organize insights with drag-and-drop affinity diagrams</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectPage
