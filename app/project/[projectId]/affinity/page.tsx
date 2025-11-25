import { Metadata } from "next";
import { AffinityMapWorkspace } from "@/components/myComponents/AffinityMapWorkspace";
import { Id } from "@/convex/_generated/dataModel";
import { NotificationToastProvider } from "@/components/myComponents/NotificationToastProvider";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await params; // params awaiten, auch wenn wir es hier nicht verwenden
  
  return {
    title: "Affinity Map",
    description: "Collaborative affinity diagram",
  };
}

export default async function AffinityPage({ params }: PageProps) {
  const { projectId } = await params;
  
  return (
    <>
      <AffinityMapWorkspace projectId={projectId as Id<"projects">} />
      <NotificationToastProvider/>
    </>
  );
}