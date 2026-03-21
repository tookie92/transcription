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
    title: "Research Dashboard | Skripta",
    description: "View shared research insights and findings",
  };
}

export default async function ProjectSharePage({ params }: SharePageProps) {
  const { token } = await params;
  return <ProjectShareView token={token} />;
}
