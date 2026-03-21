import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { insightsText, interviewCount } = body;

    if (!insightsText) {
      return NextResponse.json(
        { error: "insightsText is required" },
        { status: 400 }
      );
    }

    const prompt = `Analyze the following research insights from ${interviewCount} interviews and identify the main themes that appear across multiple interviews.

Return a JSON array of 3-5 theme names that capture the key cross-cutting patterns. Each theme should be 2-5 words.

Insights:
${insightsText}

Respond ONLY with a JSON array of theme names, like: ["Theme Name 1", "Theme Name 2", "Theme Name 3"]

JSON Response:`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a UX research analyst specializing in identifying patterns across multiple user interviews.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 200,
    });

    const response = completion.choices[0]?.message?.content || "[]";

    // Parse the JSON response
    let themes;
    try {
      themes = JSON.parse(response);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[.*\]/);
      if (jsonMatch) {
        themes = JSON.parse(jsonMatch[0]);
      } else {
        themes = [];
      }
    }

    return NextResponse.json({ themes });
  } catch (error) {
    console.error("Error analyzing cross themes:", error);
    return NextResponse.json(
      { error: "Failed to analyze themes" },
      { status: 500 }
    );
  }
}
