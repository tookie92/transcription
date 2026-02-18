"use client";

import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell, RefreshCcwIcon, Plus, Users, Folder, ArrowRight, Clock, Layout, Target, MessageSquare, Search, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const PROJECT_TEMPLATES = [
  {
    id: "user-research",
    name: "User Research",
    description: "Conduct interviews and analyze user behavior",
    icon: Search,
    color: "from-blue-500 to-blue-600",
    insightTypes: ["pain-point", "quote", "insight", "follow-up"] as const,
  },
  {
    id: "usability-test",
    name: "Usability Testing",
    description: "Test product usability and identify issues",
    icon: Target,
    color: "from-red-500 to-red-600",
    insightTypes: ["pain-point", "insight", "follow-up"] as const,
  },
  {
    id: "customer-interview",
    name: "Customer Interviews",
    description: "Interview customers about their experience",
    icon: MessageSquare,
    color: "from-green-500 to-green-600",
    insightTypes: ["quote", "insight", "follow-up"] as const,
  },
  {
    id: "discovery",
    name: "Discovery",
    description: "General discovery research",
    icon: Zap,
    color: "from-purple-500 to-purple-600",
    insightTypes: ["insight", "follow-up"] as const,
  },
];

const ProjectPage = () => {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

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
        description: `Template: ${selectedTemplate || 'custom'}`,
      });
      toast.success("Project created!");
      setShowTemplateDialog(false);
      setProjectName("");
      setSelectedTemplate(null);
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
    <div className="min-h-dvh w-full p-8 bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Projects</h1>
            <p className="text-gray-500 mt-1">Manage your interviews and affinity maps</p>
          </div>
          <Button 
            onClick={() => setShowTemplateDialog(true)}
            disabled={isCreating}
            className="bg-[#3D7C6F] hover:bg-[#2d5f54]"
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

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Choose a template to get started or start from scratch
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Template Grid */}
            <div className="grid grid-cols-2 gap-3">
              {PROJECT_TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedTemplate === template.id
                        ? "border-[#3D7C6F] bg-[#3D7C6F]/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center mb-3`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Project Name Input */}
            <div className="space-y-2 pt-4 border-t">
              <label className="text-sm font-medium text-gray-700">Project Name</label>
              <Input
                placeholder="Enter project name..."
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
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
                className="bg-[#3D7C6F] hover:bg-[#2d5f54]"
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
                  className="flex items-center justify-between bg-white rounded-lg p-3 border border-orange-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">{invite.projectName}</p>
                      <p className="text-sm text-gray-500">Invited by {invite.name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
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
                className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-[#3D7C6F] hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#3D7C6F]/10 to-purple-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Folder className="w-6 h-6 text-[#3D7C6F]" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[#3D7C6F] group-hover:translate-x-1 transition-all" />
                </div>
                
                <h3 className="font-semibold text-lg text-gray-900 mb-1 truncate">
                  {project.name}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                  {project.description || "No description"}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-400">
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
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Folder className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Create your first project to start organizing interviews and insights
            </p>
            <Button 
              onClick={handleCreateProject}
              className="bg-[#3D7C6F] hover:bg-[#2d5f54]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectPage
