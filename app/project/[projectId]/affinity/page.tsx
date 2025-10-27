import { AffinityMapWorkspace } from "@/components/myComponents/AffinityMapWorkspace";
import { Id } from "@/convex/_generated/dataModel";
import { Metadata } from "next";


interface AffinityPageProps {
  params: {
    projectId: Id<"projects">;
  };
}

export async function generateMetadata({ params }: AffinityPageProps): Promise<Metadata> {
  return {
    title: "Affinity Map",
    description: "Organize insights into affinity groups",
  };
}

export default function AffinityPage({ params }: AffinityPageProps) {
  return <AffinityMapWorkspace projectId={params.projectId} />;
}