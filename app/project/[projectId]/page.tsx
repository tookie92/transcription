import { Metadata } from "next";
import { ProjectContent } from "@/components/myComponents/ProjectContent";
import { Id } from "@/convex/_generated/dataModel";
import { SidebarProvider } from "@/components/ui/sidebar";
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
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 min-h-dvh">
        <ProjectContent projectId={projectId as Id<"projects">} />
      </main>
    </SidebarProvider>
  );
}