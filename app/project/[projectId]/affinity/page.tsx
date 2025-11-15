import { AffinityMapWorkspace } from "@/components/myComponents/AffinityMapWorkspace";
import { Id } from "@/convex/_generated/dataModel";
import { Metadata } from "next";


interface AffinityPageProps {
  params: Promise<{
    projectId: Id<"projects">;
  }>;
}

export async function generateMetadata({ params }: AffinityPageProps): Promise<Metadata> {
  await params; // Await params here too
  return {
    title: "Affinity Map",
    description: "Organize insights into affinity groups",
  };
}

export default async function AffinityPage({ params }: AffinityPageProps) {
  const { projectId } = await params;
  return <AffinityMapWorkspace projectId={projectId} />;
}