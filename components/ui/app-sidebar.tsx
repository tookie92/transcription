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
  useSidebar,
} from "@/components/ui/sidebar"
import ButtonFooter from "../myComponents/ButtonFooter"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Folder, Users, Bell, MailPlus, Check, X, Loader2, Search, Plus, PanelLeftIcon, PanelLeftCloseIcon, Trash2 } from "lucide-react"
import Link from "next/link"
import { ModeToggle } from "../ModeToggle"
import { Button } from "../ui/button"
import { useState } from "react"
import { Id } from "@/convex/_generated/dataModel"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth, useUser } from "@clerk/nextjs"
import { Input } from "../ui/input"
import Image from "next/image"

export function AppSidebar() {
  const { state, toggleSidebar, isMobile } = useSidebar()
  const { isSignedIn, userId } = useAuth()
  const { user } = useUser()
  const [searchQuery, setSearchQuery] = useState("")
  
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  const projects = useQuery(api.projects.getUserProjects, { userEmail })
  const [inviteStates, setInviteStates] = useState<Record<string, "accepting" | "declining" | null>>({})

  // Only show projects user is a member of (not just invited)
  const memberProjects = projects?.filter(p => 
    p.ownerId !== userId || !p.members.some(m => m.userId.includes('@') && m.userId === userEmail)
  ) || []

  const filteredProjects = memberProjects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Only show invitations where the email matches the current user's email
  const pendingInvitations = projects?.flatMap(project => 
    project.members
      .filter(m => m.userId.includes('@') && m.userId === userEmail)
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
  const deleteProject = useMutation(api.projects.deleteProject)
  const [deleteStates, setDeleteStates] = useState<Record<string, "deleting" | null>>({})

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

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return
    }
    setDeleteStates(prev => ({ ...prev, [projectId]: "deleting" }))
    try {
      await deleteProject({ projectId: projectId as Id<"projects"> })
      toast.success("Project deleted")
    } catch (error) {
      toast.error("Failed to delete project")
    } finally {
      setDeleteStates(prev => ({ ...prev, [projectId]: null }))
    }
  }

  const isCollapsed = state === "collapsed"

  return (
    <Sidebar variant="inset" className="pt-4">
      <SidebarHeader className="border-b">
        <div className="p-4 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Image width={50} height={50} src="/logomark.svg" alt="Skripta" className="size-4" />
              </div>
              <h2 className="text-lg font-semibold">Projects</h2>
            </div>
          )}
          {/* <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={isCollapsed ? "mx-auto" : "ml-auto"}
          >
            {isCollapsed ? (
              <PanelLeftIcon className="h-4 w-4" />
            ) : (
              <PanelLeftCloseIcon className="h-4 w-4" />
            )}
          </Button> */}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {!isCollapsed && (
          <>
            <div className="p-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* <div className="px-4 pb-4">
              <Button 
                asChild
                size="sm" 
                className="w-full h-8"
              >
                <Link href="/project">
                  <Plus className="w-4 h-4 mr-1" />
                  New Projecty
                </Link>
              </Button>
            </div> */}

            {pendingInvitations.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="flex items-center gap-2 text-orange-600">
                  <MailPlus className="w-4 h-4" />
                  Pending Invites
                  <span className="ml-auto px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full">
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
                          className="mx-2"
                        >
                          <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-xl space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-orange-200 dark:bg-orange-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                                <Users className="w-4 h-4 text-orange-700 dark:text-orange-300" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{invite.projectName}</p>
                                <p className="text-xs text-orange-600 dark:text-orange-400">Invited by {invite.name}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700"
                                onClick={() => handleAccept(invite)}
                                disabled={inviteStates[invite.projectId] === "accepting"}
                              >
                                {inviteStates[invite.projectId] === "accepting" ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
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
                                className="flex-1 h-7 text-xs"
                                onClick={() => handleDecline(invite)}
                                disabled={inviteStates[invite.projectId] === "declining"}
                              >
                                {inviteStates[invite.projectId] === "declining" ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <X className="w-3 h-3 mr-1" />
                                    Decline
                                  </>
                                )}
                              </Button>
                              {/* <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-7 text-xs"
                                onClick={() => handleDecline(invite)}
                                disabled={inviteStates[invite.projectId] === "declining"}
                              >
                                {inviteStates[invite.projectId] === "declining" ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <X className="w-3 h-3 mr-1" />
                                    Decline
                                  </>
                                )}
                              </Button> */}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        )}

        <SidebarGroup className={isCollapsed ? "mt-4" : "mt-2"}>
          {!isCollapsed && <SidebarGroupLabel>Your Projects</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <SidebarMenuItem className={isCollapsed ? "flex justify-center" : "mb-1"}>
                    <SidebarMenuButton asChild>
                      {isCollapsed ? (
                        <div className="relative group">
                          <Link 
                            href={`/project/${project._id}`}
                            className="w-10 h-10 bg-sidebar-primary/10 rounded-lg flex items-center justify-center hover:bg-sidebar-primary/20 transition-colors"
                            title={project.name}
                          >
                            <Folder className="w-5 h-5 text-sidebar-primary" />
                          </Link>
                          {project.ownerId === userId && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                handleDeleteProject(project._id)
                              }}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete project"
                            >
                              <Trash2 className="w-2.5 h-2.5 text-destructive-foreground" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group w-full">
                          <div className="w-8 h-8 bg-sidebar-primary/10 rounded-lg flex items-center justify-center group-hover:bg-sidebar-primary/20 transition-colors">
                            <Folder className="w-4 h-4 text-sidebar-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="truncate block font-medium">{project.name}</span>
                            <span className="text-xs text-muted-foreground truncate block flex items-center gap-1">
                              {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                              {project.members.some(m => m.userId.includes('@')) && (
                                <span className="text-orange-500">• {project.members.filter(m => m.userId.includes('@')).length} pending</span>
                              )}
                            </span>
                          </div>
                          {project.ownerId === userId && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                handleDeleteProject(project._id)
                              }}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                              title="Delete project"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          )}
                        </div>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </motion.div>
              ))}
              {filteredProjects.length === 0 && !isCollapsed && (
                <div className="px-2 py-8 text-sm text-muted-foreground text-center">
                  <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No projects yet</p>
                  <p className="text-xs mt-1">Create one to get started</p>
                </div>
              )}
              {isCollapsed && filteredProjects.length === 0 && (
                <div className="flex justify-center py-4">
                  <Folder className="w-6 h-6 text-muted-foreground opacity-50" />
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2">
        {/* {!isCollapsed && user && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent">
            <div className="w-8 h-8 bg-sidebar-primary rounded-full flex items-center justify-center text-sidebar-primary-foreground text-sm font-medium">
              {user.firstName?.charAt(0) || user.emailAddresses[0]?.emailAddress.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.fullName || user.username || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user.emailAddresses[0]?.emailAddress}</p>
            </div>
          </div>
        )}
        {isCollapsed && user && (
          <div className="w-10 h-10 mx-auto bg-sidebar-primary rounded-full flex items-center justify-center text-sidebar-primary-foreground text-sm font-medium" title={user.fullName || "User"}>
            {user.firstName?.charAt(0) || user.emailAddresses[0]?.emailAddress.charAt(0) || "U"}
          </div>
        )} */}
        <ButtonFooter />
        <ModeToggle />
      </SidebarFooter>
    </Sidebar>
  )
}
