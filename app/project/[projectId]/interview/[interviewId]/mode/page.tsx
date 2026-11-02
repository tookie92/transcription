import { redirect } from "next/navigation";

interface InterviewModePageProps {
  params: Promise<{
    projectId: string;
    interviewId: string;
  }>;
}

export default async function InterviewModePage({ params }: InterviewModePageProps) {
  const { projectId, interviewId } = await params;
  redirect(`/project/${projectId}/interview/${interviewId}`);
}
