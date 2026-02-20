import { Metadata } from "next";
import { ProjectContent } from "@/components/myComponents/ProjectContent";
import { Id } from "@/convex/_generated/dataModel";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";

interface ProjectPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { projectId } = await params;
  return {
    title: "Project Details",
    description: "View and manage your project interviews",
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  return (
      
     <SidebarProvider defaultOpen={false} >
                <AppSidebar />
                <main className="flex w-full min-h-dvh">
                   <SidebarTrigger /> 
                      <ProjectContent projectId={projectId as Id<"projects">} />
                </main>
    </SidebarProvider>
);
}