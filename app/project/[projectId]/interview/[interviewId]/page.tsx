import { Metadata } from "next";

import { Id } from "@/convex/_generated/dataModel";
import { InterviewContent } from "@/components/myComponents/InterviewContent";

interface InterviewPageProps {
  params: Promise<{
    projectId: string;
    interviewId: string;
  }>;
}

export async function generateMetadata({ params }: InterviewPageProps): Promise<Metadata> {
  return {
    title: "Interview Details",
    description: "View and analyze interview transcription",
  };
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { projectId, interviewId } = await params;
  return <InterviewContent projectId={projectId as Id<"projects">} interviewId={interviewId as Id<"interviews">} />;
}