import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

const PIN_LIMIT = 40;
const LINE_LIMIT = 24;

const pinTypeValidator = v.union(
  v.literal("pain-point"),
  v.literal("quote"),
  v.literal("insight"),
  v.literal("follow-up"),
  v.literal("custom")
);

const hitValidator = v.object({
  id: v.string(),
  kind: v.union(v.literal("pin"), v.literal("line")),
  interviewId: v.id("interviews"),
  interviewTitle: v.string(),
  timestamp: v.number(),
  text: v.string(),
  pinType: v.optional(pinTypeValidator),
});

function normalize(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function hasProjectAccess(
  project: Doc<"projects">,
  identity: { subject: string; email?: string }
): boolean {
  if (project.ownerId === identity.subject || project.isPublic) return true;
  const email = identity.email;
  return project.members.some(
    (member) =>
      member.userId === identity.subject ||
      (email !== undefined && (member.userId === email || member.email === email))
  );
}

export const searchStudy = query({
  args: {
    projectId: v.id("projects"),
    query: v.string(),
  },
  returns: v.object({
    pins: v.array(hitValidator),
    lines: v.array(hitValidator),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { pins: [], lines: [] };

    const project = await ctx.db.get(args.projectId);
    if (!project || !hasProjectAccess(project, identity)) {
      return { pins: [], lines: [] };
    }

    const needle = normalize(args.query);
    const interviews = await ctx.db
      .query("interviews")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    const titleById = new Map<Id<"interviews">, string>(
      interviews.map((interview) => [interview._id, interview.title])
    );

    const insights = await ctx.db
      .query("insights")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const pins = insights
      .filter((insight) => insight.interviewId)
      .filter((insight) => (needle ? normalize(insight.text).includes(needle) : true))
      .slice(0, PIN_LIMIT)
      .map((insight) => {
        const interviewId = insight.interviewId as Id<"interviews">;
        return {
          id: `pin:${insight._id}`,
          kind: "pin" as const,
          interviewId,
          interviewTitle: titleById.get(interviewId) ?? "Sitting",
          timestamp: insight.timestamp,
          text: insight.text,
          pinType: insight.type,
        };
      });

    if (!needle || needle.length < 2) {
      return { pins, lines: [] };
    }

    const pinKeys = new Set(
      pins.map((pin) => `${pin.interviewId}:${Math.round(pin.timestamp)}`)
    );

    const lines: Array<{
      id: string;
      kind: "line";
      interviewId: Id<"interviews">;
      interviewTitle: string;
      timestamp: number;
      text: string;
    }> = [];

    for (const interview of interviews) {
      if (lines.length >= LINE_LIMIT) break;
      for (const segment of interview.segments) {
        if (lines.length >= LINE_LIMIT) break;
        if (!normalize(segment.text).includes(needle)) continue;
        const nearPin = `${interview._id}:${Math.round(segment.start)}`;
        if (pinKeys.has(nearPin)) continue;
        lines.push({
          id: `line:${interview._id}:${segment.id}`,
          kind: "line",
          interviewId: interview._id,
          interviewTitle: interview.title,
          timestamp: segment.start,
          text: segment.text,
        });
      }
    }

    return { pins, lines };
  },
});

const briefPinValidator = v.object({
  type: pinTypeValidator,
  text: v.string(),
  timestamp: v.number(),
});

const briefSittingValidator = v.object({
  id: v.id("interviews"),
  title: v.string(),
  topic: v.optional(v.string()),
  summary: v.optional(v.string()),
  pins: v.array(briefPinValidator),
});

const briefPersonaValidator = v.object({
  name: v.string(),
  occupation: v.optional(v.string()),
  quote: v.optional(v.string()),
  background: v.optional(v.string()),
  goals: v.optional(v.array(v.string())),
  frustrations: v.optional(v.array(v.string())),
});

export const getStudyBrief = query({
  args: {
    projectId: v.id("projects"),
    interviewIds: v.array(v.id("interviews")),
    personaIds: v.optional(v.array(v.id("personas"))),
  },
  returns: v.object({
    projectName: v.string(),
    description: v.optional(v.string()),
    sittings: v.array(briefSittingValidator),
    personas: v.array(briefPersonaValidator),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { projectName: "", sittings: [], personas: [] };
    }

    const project = await ctx.db.get(args.projectId);
    if (!project || !hasProjectAccess(project, identity)) {
      return { projectName: "", sittings: [], personas: [] };
    }

    const sittings = [];
    for (const interviewId of args.interviewIds) {
      const interview = await ctx.db.get(interviewId);
      if (!interview || interview.projectId !== args.projectId) continue;
      const insights = await ctx.db
        .query("insights")
        .withIndex("by_interview", (q) => q.eq("interviewId", interviewId))
        .collect();
      sittings.push({
        id: interview._id,
        title: interview.title,
        topic: interview.topic,
        summary: interview.summary?.executiveSummary,
        pins: insights.map((insight) => ({
          type: insight.type,
          text: insight.text,
          timestamp: insight.timestamp,
        })),
      });
    }

    const personas = [];
    for (const personaId of args.personaIds ?? []) {
      const persona = await ctx.db.get(personaId);
      if (!persona || persona.projectId !== args.projectId) continue;
      personas.push({
        name: persona.name,
        occupation: persona.occupation,
        quote: persona.quote,
        background: persona.background,
        goals: persona.goals,
        frustrations: persona.frustrations,
      });
    }

    return {
      projectName: project.name,
      description: project.description,
      sittings,
      personas,
    };
  },
});
