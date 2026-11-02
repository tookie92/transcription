import { Metadata } from "next";
import { ProjectShareView } from "@/components/myComponents/ProjectShareView";

interface SharePageProps {
  params: Promise<{
    token: string;
  }>;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { token } = await params;
  return {
    title: "Issue | Skripta",
    description: "A read-only copy of research sittings",
  };
}

export default async function ProjectSharePage({ params }: SharePageProps) {
  const { token } = await params;
  return <ProjectShareView token={token} />;
}
