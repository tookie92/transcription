import { Metadata } from "next";
import { ShareView } from "@/components/myComponents/ShareView";

interface SharePageProps {
  params: Promise<{
    token: string;
  }>;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { token } = await params;
  return {
    title: "Research Insights | Skripta",
    description: "View shared research insights",
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  return <ShareView token={token} />;
}
