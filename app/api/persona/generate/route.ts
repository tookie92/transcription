import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { GROQ_MODEL_FAST } from "@/lib/groq";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface PersonaRequest {
  groups: Array<{
    title: string;
    insightIds: string[];
  }>;
  insights: Array<{
    id: string;
    text: string;
    type: string;
  }>;
  projectContext?: string;
  dotVotingResults?: Array<{
    sectionId: string;
    title: string;
    voteCount: number;
  }>;
}

interface SlimPersona {
  name: string;
  occupation: string;
  background: string;
  quote: string;
  goals: string[];
  frustrations: string[];
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    const body: PersonaRequest = await request.json();
    const { groups, insights, projectContext, dotVotingResults } = body;

    if (!groups || groups.length === 0) {
      return NextResponse.json(
        { error: "Pick at least one packet" },
        { status: 400 }
      );
    }

    const pinLines = insights
      .map((insight) => `- [${insight.type}] ${insight.text.trim()}`)
      .filter((line) => line.length > 10)
      .join("\n");

    const groupsText = groups
      .map((group) => {
        const votingInfo = dotVotingResults?.find((result) => result.title === group.title);
        const voteCount = votingInfo?.voteCount ?? 0;
        const priority = voteCount > 0 ? ` (${voteCount} votes)` : "";
        return `- ${group.title}: ${group.insightIds.length} pins${priority}`;
      })
      .join("\n");

    const prompt = `You extract one research fiche from affinity packets. Do not invent demographics, avatars, income, age, or gender.

PROJECT: ${projectContext || "Interview study"}

PACKETS:
${groupsText}

PINS (use these only):
${pinLines || "- (no pin text)"}

Return JSON with this exact shape:
{
  "name": "a plain given name plus family name that could belong to someone in this study",
  "occupation": "job or role implied by the pins, not a gimmick",
  "background": "one or two sentences grounded in the packets",
  "quote": "MUST be copied verbatim from one PIN above. Do not invent or rewrite.",
  "goals": ["2-4 goals implied by the pins"],
  "frustrations": ["2-4 frustrations taken from pain pins when present"]
}

If a pin is already a first-person line, use that as quote. Never use names like Techlover, Coder, or 2.0.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a field researcher cutting a slim fiche from wall packets. JSON only.",
        },
        { role: "user", content: prompt },
      ],
      model: GROQ_MODEL_FAST,
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Cast model returned invalid JSON" },
        { status: 500 }
      );
    }

    const persona: SlimPersona = {
      name: typeof parsed.name === "string" ? parsed.name.trim() : "",
      occupation: typeof parsed.occupation === "string" ? parsed.occupation.trim() : "",
      background: typeof parsed.background === "string" ? parsed.background.trim() : "",
      quote: typeof parsed.quote === "string" ? parsed.quote.trim() : "",
      goals: asStringArray(parsed.goals).slice(0, 4),
      frustrations: asStringArray(parsed.frustrations).slice(0, 4),
    };

    if (!persona.name || !persona.occupation) {
      return NextResponse.json(
        { error: "Empty fiche — try again with more slips" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      persona,
      basedOn: {
        groups: groups.length,
        insights: insights.length,
        groupTitles: groups.map((group) => group.title),
      },
    });
  } catch (error) {
    console.error("Cast cut error:", error);
    const raw = error instanceof Error ? error.message : "";
    const message = /api key|GROQ|401|Unauthorized/i.test(raw)
      ? "Cast service unavailable — check GROQ_API_KEY"
      : raw.trim() || "Cast service failed — try again";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
