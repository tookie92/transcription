import { Metadata } from "next";

import { Id } from "@/convex/_generated/dataModel";
import { InterviewContent } from "@/components/myComponents/InterviewContent";

interface InterviewPageProps {
  params: {
    projectId: Id<"projects">;
    interviewId: Id<"interviews">;
  };
}

export async function generateMetadata({ params }: InterviewPageProps): Promise<Metadata> {
  return {
    title: "Interview Details",
    description: "View and analyze interview transcription",
  };
}

export default function InterviewPage({ params }: InterviewPageProps) {
  return <InterviewContent projectId={params.projectId} interviewId={params.interviewId} />;
}