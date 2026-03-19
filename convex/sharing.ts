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

export const getShareableInterview = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const interview = await ctx.db
      .query("interviews")
      .filter((q) => q.eq(q.field("shareToken"), args.shareToken))
      .first();

    if (!interview) {
      return null;
    }

    // Check if expired
    if (interview.expiresAt && interview.expiresAt < Date.now()) {
      return { error: "expired" as const };
    }

    // Get related data
    const insights = await ctx.db
      .query("insights")
      .withIndex("by_interview", (q) => q.eq("interviewId", interview._id))
      .collect();

    const project = await ctx.db.get(interview.projectId);

    return {
      interview,
      insights,
      projectName: project?.name || "Research",
    };
  },
});

export const verifySharePassword = query({
  args: { shareToken: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const interview = await ctx.db
      .query("interviews")
      .filter((q) => q.eq(q.field("shareToken"), args.shareToken))
      .first();

    if (!interview) {
      return { valid: false as const };
    }

    if (!interview.sharePassword) {
      return { valid: true as const };
    }

    return { valid: interview.sharePassword === args.password };
  },
});

export const createShareableLink = mutation({
  args: {
    interviewId: v.id("interviews"),
    password: v.optional(v.string()),
    expiresInDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) {
      throw new Error("Interview not found");
    }

    const shareToken = generateShareToken();
    const expiresAt = args.expiresInDays
      ? Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
      : undefined;

    await ctx.db.patch(args.interviewId, {
      shareToken,
      isPublic: true,
      sharePassword: args.password || undefined,
      expiresAt,
    });

    return { shareToken, shareUrl: `/share/${shareToken}` };
  },
});

export const revokeShareableLink = mutation({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.interviewId, {
      shareToken: undefined,
      isPublic: false,
      sharePassword: undefined,
      expiresAt: undefined,
    });
  },
});

export const getShareStatus = query({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) {
      return null;
    }

    return {
      isShared: !!interview.shareToken,
      shareToken: interview.shareToken,
      shareUrl: interview.shareToken ? `/share/${interview.shareToken}` : null,
      hasPassword: !!interview.sharePassword,
      expiresAt: interview.expiresAt,
    };
  },
});
