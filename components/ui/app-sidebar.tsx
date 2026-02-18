"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import ButtonFooter from "../myComponents/ButtonFooter"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Folder, Users, Bell, MailPlus, Check, X, Loader2 } from "lucide-react"
import Link from "next/link"
import { ModeToggle } from "../ModeToggle"
import { Button } from "../ui/button"
import { useState } from "react"
import { useMutation } from "convex/react"
import { Id } from "@/convex/_generated/dataModel"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

export function AppSidebar() {
  const projects = useQuery(api.projects.getUserProjects)
  const [inviteStates, setInviteStates] = useState<Record<string, "accepting" | "declining" | null>>({})

  // Find pending invitations (members with email as userId - not claimed yet)
  // A member is "pending" if their userId contains @ and they're not the current user
  const currentUserId = "current-user-id" // This would come from useAuth in a real app
  const pendingInvitations = projects?.flatMap(project => 
    project.members
      .filter(m => m.userId.includes('@')) // Email-based = pending invitation
      .map(m => ({
        projectId: project._id,
        projectName: project.name,
        email: m.userId,
        role: m.role,
        name: m.name || "Someone"
      }))
  ) || []

  const acceptInvite = useMutation(api.projects.claimInvite)
  const declineInvite = useMutation(api.projects.declineInvite)

  const handleAccept = async (invite: { projectId: string; email: string }) => {
    setInviteStates(prev => ({ ...prev, [invite.projectId]: "accepting" }))
    try {
      await acceptInvite({ 
        projectId: invite.projectId as Id<"projects">, 
        email: invite.email 
      })
      toast.success("You joined the project!")
    } catch (error) {
      toast.error("Failed to join project")
    } finally {
      setInviteStates(prev => ({ ...prev, [invite.projectId]: null }))
    }
  }

  const handleDecline = async (invite: { projectId: string; email: string }) => {
    setInviteStates(prev => ({ ...prev, [invite.projectId]: "declining" }))
    try {
      await declineInvite({ 
        projectId: invite.projectId as Id<"projects">, 
        email: invite.email 
      })
      toast.info("Invitation declined")
    } catch (error) {
      toast.error("Failed to decline invitation")
    } finally {
      setInviteStates(prev => ({ ...prev, [invite.projectId]: null }))
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="p-4">
          <h2 className="text-lg font-semibold">Projects</h2>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Pending Invitations Section */}
        {pendingInvitations.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2 text-orange-600">
              <MailPlus className="w-4 h-4" />
              Pending Invites
              <span className="ml-auto px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                {pendingInvitations.length}
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <AnimatePresence>
                  {pendingInvitations.map((invite, index) => (
                    <motion.div
                      key={`${invite.projectId}-${invite.email}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="p-3 mx-2 my-1 bg-orange-50 border border-orange-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-orange-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{invite.projectName}</p>
                            <p className="text-xs text-orange-600">Invited by {invite.name}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 h-8 bg-green-600 hover:bg-green-700"
                            onClick={() => handleAccept(invite)}
                            disabled={inviteStates[invite.projectId] === "accepting"}
                          >
                            {inviteStates[invite.projectId] === "accepting" ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-3 h-3 mr-1" />
                                Accept
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8"
                            onClick={() => handleDecline(invite)}
                            disabled={inviteStates[invite.projectId] === "declining"}
                          >
                            {inviteStates[invite.projectId] === "declining" ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <X className="w-3 h-3 mr-1" />
                                Decline
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Projects Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Your Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects?.map((project, index) => (
                <motion.div
                  key={project._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link 
                        href={`/project/${project._id}`} 
                        className="flex items-center gap-2 group"
                      >
                        <div className="w-8 h-8 bg-[#3D7C6F]/10 rounded-lg flex items-center justify-center group-hover:bg-[#3D7C6F]/20 transition-colors">
                          <Folder className="w-4 h-4 text-[#3D7C6F]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="truncate block font-medium">{project.name}</span>
                          <span className="text-xs text-gray-500 truncate block">
                            {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </motion.div>
              ))}
              {projects?.length === 0 && (
                <div className="px-2 py-8 text-sm text-gray-500 text-center">
                  <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No projects yet</p>
                  <p className="text-xs mt-1">Create one to get started</p>
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <ButtonFooter />
        <ModeToggle />
      </SidebarFooter>
    </Sidebar>
  )
}
