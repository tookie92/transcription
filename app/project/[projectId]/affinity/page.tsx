import { Metadata } from "next";
import { AffinityMapWorkspace } from "@/components/myComponents/AffinityMapWorkspace";
import { Id } from "@/convex/_generated/dataModel";
import { NotificationToastProvider } from "@/components/myComponents/NotificationToastProvider";

interface PageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ sitting?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await params; // params awaiten, auch wenn wir es hier nicht verwenden
  
  return {
    title: "Wall",
    description: "The table where interview lines become packets",
  };
}

export default async function AffinityPage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const query = await searchParams;
  
  return (
    <>
      <AffinityMapWorkspace
        projectId={projectId as Id<"projects">}
        sittingId={query.sitting}
      />
      <NotificationToastProvider/>
    </>
  );
}