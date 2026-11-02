// app/api/suggest-groups/route.ts
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { GROQ_MODEL_FAST } from "@/lib/groq";
import { clusterInsights, normalizeGroupSuggestions } from "@/lib/groupSuggestions";
import {
  checkGroqRateLimit,
  groqClientKey,
  groqFailureMessage,
  isGroqRateLimitError,
} from "@/lib/groqGuard";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

interface InsightRequest {
  id: string;
  text: string;
  type: string;
}

interface GroupRequest {
  id: string;
  title: string;
  insightIds: string[];
}

interface GroupSuggestionRequest {
  insights: InsightRequest[];
  existingGroups: GroupRequest[];
  projectContext?: string;
}

export async function POST(request: NextRequest) {
  let insights: InsightRequest[] = [];
  let projectContext = "";

  try {
    const body: GroupSuggestionRequest = await request.json();
    insights = body.insights;
    projectContext = body.projectContext || "";
    const { existingGroups } = body;

    if (!insights || insights.length === 0) {
      return NextResponse.json({ error: "No insights provided" }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({
        suggestions: clusterInsights(insights),
        source: "local" as const,
        warning: groqFailureMessage(null),
      });
    }

    const limit = checkGroqRateLimit(`suggest:${groqClientKey(request)}`);
    if (!limit.ok) {
      return NextResponse.json(
        {
          suggestions: clusterInsights(insights),
          source: "local" as const,
          warning: "AI is busy — try again in a minute",
          retryAfterSec: limit.retryAfterSec,
        },
        { headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const prompt = `
You are a UX research expert analyzing interview insights to create meaningful groups.

PROJECT CONTEXT:
${projectContext || "General user research project"}

EXISTING GROUPS (for reference):
${existingGroups.map((group) => `- "${group.title}" (${group.insightIds.length} insights)`).join("\n") || "None"}

UNGROUPED INSIGHTS (analyze content to find patterns):
${insights.map((insight, index) => `${index + 1}. [${insight.type.toUpperCase()}] ID:${insight.id} - "${insight.text}"`).join("\n")}

YOUR TASK:
Find a few small, distinct packets — not one pile of everything.

HARD RULES:
- 2 to 5 slips per packet. Never more than 5.
- If there are 6+ slips, return at least 2 packets with different themes.
- NEVER put every slip into a single packet.
- Leave leftovers ungrouped. No catch-all like "User Feedback" or "Other".
- Titles must name the theme in the slips (Navigation, Pricing, Onboarding) — not "Insights".

Examples of GOOD titles: "Can't find settings", "Price shock", "Mobile keyboard"
Examples of BAD titles: "User Insights", "Theme", "Group 1", "Additional Feedback"

For each packet:
- insightIds: EXACT IDs from the list (2-5)
- newGroupTitle: specific, from the content
- confidence: 0.6-0.9
- reason: the shared pattern, one short sentence

Respond ONLY with valid JSON:
{
  "suggestions": [
    {
      "action": "create_new",
      "confidence": 0.8,
      "reason": "These slips all talk about getting lost in the menu",
      "insightIds": ["id1", "id2", "id3"],
      "newGroupTitle": "Lost in the menu"
    }
  ]
}
`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a UX research expert. Analyze insights semantically and create coherent groups with specific names. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: GROQ_MODEL_FAST,
      temperature: 0.3,
      max_tokens: 2500,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI service");
    }

    let parsedResponse: {
      suggestions?: Array<{
        insightIds?: string[];
        reason?: string;
        confidence?: number;
        newGroupTitle?: string;
      }>;
    };
    try {
      parsedResponse = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error("Invalid JSON");
        }
      } else {
        throw new Error("No JSON found");
      }
    }

    if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
      throw new Error("Invalid suggestions format");
    }

    const validIds = new Set(insights.map((i) => i.id));
    const validSuggestions = parsedResponse.suggestions.filter(
      (s) =>
        Array.isArray(s.insightIds) &&
        s.insightIds.length >= 2 &&
        s.insightIds.every((id) => validIds.has(id))
    );

    const normalized = normalizeGroupSuggestions(insights, validSuggestions);
    if (normalized.length === 0) {
      return NextResponse.json({
        suggestions: clusterInsights(insights),
        source: "local" as const,
        warning: "AI returned no usable packets — local sort used",
      });
    }

    return NextResponse.json({
      suggestions: normalized,
      source: "groq" as const,
    });
  } catch (error) {
    console.error("suggest-groups error:", error);
    const warning = isGroqRateLimitError(error)
      ? "AI is busy — try again in a minute"
      : groqFailureMessage(error);
    return NextResponse.json({
      suggestions: clusterInsights(insights),
      source: "local" as const,
      warning,
    });
  }
}
