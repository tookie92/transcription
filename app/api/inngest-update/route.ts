import { NextRequest, NextResponse } from "next/server";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

export async function POST(request: NextRequest) {
  try {
    const { interviewId, projectId, segments } = await request.json();

    if (!interviewId || !segments) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const response = await fetch(`${CONVEX_URL}/updateSegmentsWithSpeakers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ interviewId, segments }),
    });

    if (!response.ok) {
      throw new Error("Failed to update segments in Convex");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating interview segments:", error);
    return NextResponse.json(
      { error: "Failed to update segments" },
      { status: 500 }
    );
  }
}
