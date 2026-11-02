import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { GROQ_MODEL_FAST } from "@/lib/groq";
import {
  checkGroqRateLimit,
  groqClientKey,
  groqFailureMessage,
  isGroqRateLimitError,
} from "@/lib/groqGuard";
import {
  buildIssueBriefFallback,
  type IssueBrief,
  type IssueBriefInput,
} from "@/lib/issueBrief";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

function parseBrief(raw: string): IssueBrief | null {
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as Partial<IssueBrief>;
    if (
      typeof parsed.thesis !== "string" ||
      typeof parsed.framing !== "string" ||
      typeof parsed.priorityLead !== "string"
    ) {
      return null;
    }
    return {
      thesis: parsed.thesis.trim().slice(0, 400),
      framing: parsed.framing.trim().slice(0, 240),
      priorityLead: parsed.priorityLead.trim().slice(0, 280),
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let body: IssueBriefInput;
  try {
    body = (await request.json()) as IssueBriefInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.projectName || !Array.isArray(body.clusters)) {
    return NextResponse.json({ error: "Missing wall payload" }, { status: 400 });
  }

  const fallback = buildIssueBriefFallback(body);

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({
      brief: fallback,
      source: "fallback" as const,
      warning: groqFailureMessage(null),
    });
  }

  const limit = checkGroqRateLimit(`brief:${groqClientKey(request)}`);
  if (!limit.ok) {
    return NextResponse.json(
      {
        brief: fallback,
        source: "fallback" as const,
        warning: "AI is busy — try again in a minute",
        retryAfterSec: limit.retryAfterSec,
      },
      {
        status: 200,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      }
    );
  }

  const clusterLines = body.clusters
    .slice(0, 12)
    .map((cluster, index) => {
      const slips = (cluster.slips ?? [])
        .slice(0, 2)
        .map((slip) => `    - ${slip.text.slice(0, 160)}`)
        .join("\n");
      return `${index + 1}. ${cluster.title} (votes ×${cluster.voteCount})\n${slips}`;
    })
    .join("\n");

  const castLine =
    body.castNames && body.castNames.length > 0
      ? body.castNames.slice(0, 4).join(", ")
      : "none";

  const prompt = `You write a stakeholder Issue brief for a field research kit (Skripta).
Return ONLY valid JSON with keys: thesis, framing, priorityLead.
Rules:
- English, plain, field-kit tone (not SaaS marketing, not academic).
- thesis: 1–2 sentences, max 280 chars. What the team decided / should act on. No markdown.
- framing: one short line of context (sittings → wall → team vote). Mention sitting count if given. Max 160 chars.
- priorityLead: one line on the #1 prioritized theme and why it matters, grounded in the slips. Max 200 chars.
- Do not invent facts not in the data. Do not say "Flip" — say "team vote" or "After Flip" only if needed as a label.
- No bullet lists inside string values.

Project: ${body.projectName}
Description: ${body.description?.trim() || "—"}
Sitting count: ${body.sittingCount ?? 0}
Cast: ${castLine}
Themes (by votes):
${clusterLines || "(none)"}`;

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL_FAST,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You output compact JSON only for research Issue briefs. No preamble.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const brief = parseBrief(content);
    if (!brief || brief.thesis.length < 8) {
      return NextResponse.json({
        brief: fallback,
        source: "fallback" as const,
        warning: "AI brief incomplete — using field fallback",
      });
    }
    return NextResponse.json({ brief, source: "groq" as const });
  } catch (error) {
    console.error("issue/brief Groq failed", error);
    const status = isGroqRateLimitError(error) ? 200 : 200;
    return NextResponse.json(
      {
        brief: fallback,
        source: "fallback" as const,
        warning: groqFailureMessage(error),
      },
      { status }
    );
  }
}
