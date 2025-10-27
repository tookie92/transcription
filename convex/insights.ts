import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Créer des insights depuis l'analyse IA
export const createInsights = mutation({
  args: {
    interviewId: v.id("interviews"),
    projectId: v.id("projects"),
    insights: v.array(v.object({
      type: v.union(
        v.literal("pain-point"),
        v.literal("quote"),
        v.literal("insight"),
        v.literal("follow-up")
      ),
      text: v.string(),
      timestamp: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Créer chaque insight avec un ID unique
    const insightPromises = args.insights.map(insight => 
      ctx.db.insert("insights", {
        interviewId: args.interviewId,
        projectId: args.projectId,
        type: insight.type,
        text: insight.text,
        timestamp: insight.timestamp,
        source: "ai" as const,
        createdBy: identity.subject,
        createdAt: Date.now(),
      })
    );

    const insightIds = await Promise.all(insightPromises);
    return insightIds;
  },
});

// Ajoute cette query à la fin du fichier
export const getByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("insights")
      .filter(q => q.eq(q.field("projectId"), args.projectId))
      .collect();
  },
});

// Récupérer les insights d'une interview
export const getByInterview = query({
  args: {
    interviewId: v.id("interviews"),
  },
  handler: async (ctx, args) => {
    const insights = await ctx.db
      .query("insights")
      .filter(q => q.eq(q.field("interviewId"), args.interviewId))
      .order("asc")
      .collect();

    return insights;
  },
});

// Créer un insight manuellement
export const createManualInsight = mutation({
  args: {
    interviewId: v.id("interviews"),
    projectId: v.id("projects"),
    type: v.union(
      v.literal("pain-point"),
      v.literal("quote"),
      v.literal("insight"),
      v.literal("follow-up"),
      v.literal("custom")
    ),
    text: v.string(),
    timestamp: v.number(),
    tags: v.optional(v.array(v.string())),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const insightId = await ctx.db.insert("insights", {
      interviewId: args.interviewId,
      projectId: args.projectId,
      type: args.type,
      text: args.text,
      timestamp: args.timestamp,
      source: "manual" as const,
      createdBy: identity.subject,
      tags: args.tags,
      priority: args.priority,
      createdAt: Date.now(),
    });

    return insightId;
  },
});