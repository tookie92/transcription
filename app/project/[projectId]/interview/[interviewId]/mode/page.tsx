import { Metadata } from "next";
import { Id } from "@/convex/_generated/dataModel";
import { InterviewMode } from "@/components/myComponents/InterviewMode";

interface InterviewModePageProps {
  params: Promise<{
    projectId: string;
    interviewId: string;
  }>;
}

export async function generateMetadata({ params }: InterviewModePageProps): Promise<Metadata> {
  return {
    title: "Interview Mode",
    description: "Focus mode for conducting interviews",
  };
}

export default async function InterviewModePage({ params }: InterviewModePageProps) {
  const { projectId, interviewId } = await params;
  return (
    <InterviewMode 
      projectId={projectId as Id<"projects">} 
      interviewId={interviewId as Id<"interviews">} 
    />
  );
}
