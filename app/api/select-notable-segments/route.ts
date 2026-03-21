import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface Segment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { segments, insights, count = 5 } = body;

    if (!segments || !Array.isArray(segments)) {
      return NextResponse.json(
        { error: "segments array is required" },
        { status: 400 }
      );
    }

    // If we have insights, use them to find relevant segments
    if (insights && insights.length > 0) {
      const insightsContext = insights
        .map((ins: { type: string; text: string }) => `[${ins.type}]: ${ins.text}`)
        .join("\n");

      const segmentsText = segments
        .map((s: Segment) => `[${Math.floor(s.start / 60)}:${String(Math.floor(s.start % 60)).padStart(2, "0")}] ${s.text}`)
        .join("\n");

      const prompt = `Based on these research insights:
${insightsContext}

Select the ${count} most relevant transcript segments that best illustrate or support these insights. Look for:
- Segments that contain key quotes or statements
- Segments that highlight important moments
- Segments that directly relate to pain points or user needs

Transcript:
${segmentsText}

Return a JSON array of segment indices (0-based) that are most relevant. Example: [0, 3, 7, 12, 15]

JSON Response:`;

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a UX research analyst selecting the most impactful transcript segments for a research report.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.3,
        max_tokens: 100,
      });

      const response = completion.choices[0]?.message?.content || "[]";

      let selectedIndices: number[];
      try {
        selectedIndices = JSON.parse(response);
      } catch {
        const jsonMatch = response.match(/\[.*?\]/);
        if (jsonMatch) {
          selectedIndices = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: just take first N segments
          selectedIndices = segments.slice(0, count).map((_: Segment, i: number) => i);
        }
      }

      const selectedSegments = selectedIndices
        .filter((i: number) => i >= 0 && i < segments.length)
        .map((i: number) => segments[i]);

      return NextResponse.json({ segments: selectedSegments });
    }

    // Fallback: return first N segments
    return NextResponse.json({
      segments: segments.slice(0, count),
    });
  } catch (error) {
    console.error("Error selecting notable segments:", error);
    return NextResponse.json(
      { error: "Failed to analyze segments" },
      { status: 500 }
    );
  }
}
