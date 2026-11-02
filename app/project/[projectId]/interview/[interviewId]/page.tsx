import { Metadata } from "next";

import { Id } from "@/convex/_generated/dataModel";
import { InterviewContent } from "@/components/myComponents/InterviewContent";

interface InterviewPageProps {
  params: Promise<{
    projectId: string;
    interviewId: string;
  }>;
  searchParams: Promise<{ ready?: string; t?: string }>;
}

export async function generateMetadata({ params }: InterviewPageProps): Promise<Metadata> {
  return {
    title: "Sitting",
    description: "Transcript, pins, and wall for this interview",
  };
}

export default async function InterviewPage({ params, searchParams }: InterviewPageProps) {
  const { projectId, interviewId } = await params;
  const query = await searchParams;
  return (
    <InterviewContent
      projectId={projectId as Id<"projects">}
      interviewId={interviewId as Id<"interviews">}
      tapeReady={query.ready === "1"}
      seekTo={query.t != null && query.t !== "" ? Number(query.t) : null}
    />
  );
}
