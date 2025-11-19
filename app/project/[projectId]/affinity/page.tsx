import { Metadata } from "next";
import { AffinityMapWorkspace } from "@/components/myComponents/AffinityMapWorkspace";
import { Id } from "@/convex/_generated/dataModel";
import { NotificationToastProvider } from "@/components/myComponents/NotificationToastProvider";

interface PageProps {
  params: { projectId: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: "Affinity Map",
    description: "Collaborative affinity diagram",
  };
}

export default function AffinityPage({ params }: PageProps) {
  return (
    <>
      <AffinityMapWorkspace projectId={params.projectId as Id<"projects">} />
      <NotificationToastProvider/>
    </>
);
}