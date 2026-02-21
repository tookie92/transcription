import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { fetchAction } from "@/convex/server";

export async function POST(request: NextRequest) {
  try {
    const { interviewId, projectId, segments } = await request.json();

    if (!interviewId || !segments) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await fetchAction(api.interviews.updateSegmentsWithSpeakers, {
      interviewId,
      segments,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating interview segments:", error);
    return NextResponse.json(
      { error: "Failed to update segments" },
      { status: 500 }
    );
  }
}
