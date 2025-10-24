import { Metadata } from "next";
import { ProjectContent } from "@/components/myComponents/ProjectContent";
import { Id } from "@/convex/_generated/dataModel";

interface ProjectPageProps {
  params: {
    projectId: Id<"projects">;
  };
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  return {
    title: "Project Details",
    description: "View and manage your project interviews",
  };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  return <ProjectContent projectId={params.projectId} />;
}