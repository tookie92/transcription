import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function generateShareToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export const createProjectShareLink = mutation({
  args: {
    projectId: v.id("projects"),
    interviewIds: v.array(v.id("interviews")),
    includeCrossThemes: v.boolean(),
    interviewConfig: v.optional(v.record(v.id("interviews"), v.object({
      showSummary: v.boolean(),
      showInsights: v.boolean(),
      showTranscriptExcerpts: v.boolean(),
      maxExcerpts: v.number(),
    }))),
    password: v.optional(v.string()),
    expiresInDays: v.optional(v.number()),
    saveAsTemplate: v.optional(v.boolean()),
    templateName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const shareToken = generateShareToken();
    const expiresAt = args.expiresInDays
      ? Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
      : undefined;

    // Create default config for each interview
    const defaultInterviewConfig: Record<string, {
      showSummary: boolean;
      showInsights: boolean;
      showTranscriptExcerpts: boolean;
      maxExcerpts: number;
    }> = {};

    for (const interviewId of args.interviewIds) {
      if (args.interviewConfig && args.interviewConfig[interviewId]) {
        defaultInterviewConfig[interviewId] = args.interviewConfig[interviewId];
      } else {
        defaultInterviewConfig[interviewId] = {
          showSummary: true,
          showInsights: true,
          showTranscriptExcerpts: true,
          maxExcerpts: 5,
        };
      }
    }

    const linkId = await ctx.db.insert("projectShareLinks", {
      projectId: args.projectId,
      shareToken,
      password: args.password,
      expiresAt,
      createdBy: "user",
      createdAt: Date.now(),
      config: {
        interviewIds: args.interviewIds,
        includeCrossThemes: args.includeCrossThemes,
        interviewConfig: defaultInterviewConfig,
      },
      isTemplate: args.saveAsTemplate || false,
      templateName: args.templateName,
    });

    return { linkId, shareToken, shareUrl: `/share/project/${shareToken}` };
  },
});

export const revokeProjectShareLink = mutation({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("projectShareLinks")
      .filter((q) => q.eq(q.field("shareToken"), args.shareToken))
      .first();

    if (link) {
      await ctx.db.delete(link._id);
    }
  },
});

export const getProjectShareData = query({
  args: { shareToken: v.string(), password: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("projectShareLinks")
      .filter((q) => q.eq(q.field("shareToken"), args.shareToken))
      .first();

    if (!link) {
      return { error: "not_found" as const };
    }

    if (link.expiresAt && link.expiresAt < Date.now()) {
      return { error: "expired" as const };
    }

    if (link.password && link.password !== args.password) {
      return { error: "password_required" as const };
    }

    // Get project
    const project = await ctx.db.get(link.projectId);
    if (!project) {
      return { error: "not_found" as const };
    }

    // Get interviews data
    const interviews = await Promise.all(
      link.config.interviewIds.map(async (interviewId) => {
        const interview = await ctx.db.get(interviewId);
        if (!interview) return null;

        const config = link.config.interviewConfig[interviewId];
        const insights = await ctx.db
          .query("insights")
          .withIndex("by_interview", (q) => q.eq("interviewId", interviewId))
          .collect();

        return {
          id: interview._id,
          title: interview.title,
          topic: interview.topic,
          summary: config?.showSummary ? interview.summary : null,
          insights: config?.showInsights ? insights : [],
          transcriptExcerpts: config?.showTranscriptExcerpts
            ? interview.segments.slice(0, config.maxExcerpts || 5)
            : [],
        };
      })
    );

    // Get cross-interview themes if enabled
    let crossThemes = null;
    if (link.config.includeCrossThemes) {
      const allInsights = interviews
        .filter(Boolean)
        .flatMap((i) => i?.insights || []);

      if (allInsights.length >= 3) {
        // We'll generate cross themes client-side with Groq
        crossThemes = {
          totalInsights: allInsights.length,
          interviewCount: interviews.filter(Boolean).length,
        };
      }
    }

    return {
      project: {
        name: project.name,
        description: project.description,
      },
      interviews: interviews.filter(Boolean),
      crossThemes,
      config: link.config,
    };
  },
});

export const getProjectShareStatus = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("projectShareLinks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return links.map((link) => ({
      id: link._id,
      shareToken: link.shareToken,
      shareUrl: `/share/project/${link.shareToken}`,
      hasPassword: !!link.password,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      interviewCount: link.config.interviewIds.length,
      isTemplate: link.isTemplate,
      templateName: link.templateName,
    }));
  },
});

export const getShareTemplates = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const templates = await ctx.db
      .query("projectShareLinks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("isTemplate"), true))
      .collect();

    return templates.map((t) => ({
      id: t._id,
      name: t.templateName,
      interviewCount: t.config.interviewIds.length,
      includeCrossThemes: t.config.includeCrossThemes,
    }));
  },
});
