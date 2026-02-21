import { inngest } from "@/lib/inngest/client";

export async function POST(request: Request) {
  try {
    const { interviewId, projectId, audioUrl, segments } = await request.json();

    if (!interviewId || !audioUrl || !segments) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await inngest.send({
      name: "transcription/diarize",
      data: {
        interviewId,
        projectId,
        audioUrl,
        segments,
      },
    });

    return Response.json({ status: "queued" });
  } catch (error) {
    console.error("Error triggering diarization:", error);
    return Response.json(
      { error: "Failed to trigger diarization" },
      { status: 500 }
    );
  }
}
