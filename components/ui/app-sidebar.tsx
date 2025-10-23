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
import { Folder } from "lucide-react"

export function AppSidebar() {
    const projects = useQuery(api.projects.getUserProjects)
  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="p-4">
          <h2 className="text-lg font-semibold">Projects</h2>
        </div>
      </SidebarHeader>

            <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Your Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects?.map((project) => (
                <SidebarMenuItem key={project._id}>
                  <SidebarMenuButton asChild>
                    <a href={`/project/${project._id}`} className="flex items-center gap-2">
                      <Folder className="w-4 h-4" />
                      <span className="truncate">{project.name}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {projects?.length === 0 && (
                <div className="px-2 py-3 text-sm text-gray-500 text-center">
                  No projects yet
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>


      <SidebarFooter >
        <ButtonFooter />
      </SidebarFooter>
    </Sidebar>
  )
}