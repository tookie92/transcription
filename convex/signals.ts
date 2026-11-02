import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const sentimentValidator = v.union(
  v.literal("up"),
  v.literal("meh"),
  v.literal("down")
);

const signalDocValidator = v.object({
  _id: v.id("signals"),
  _creationTime: v.number(),
  userId: v.string(),
  userName: v.optional(v.string()),
  userEmail: v.optional(v.string()),
  sentiment: sentimentValidator,
  message: v.string(),
  path: v.string(),
  projectId: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  shareToken: v.optional(v.string()),
  createdAt: v.number(),
});

function founderEmails(): string[] {
  const raw =
    process.env.SIGNAL_FOUNDER_EMAILS ?? process.env.SIGNAL_FOUNDER_EMAIL ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function isFounderIdentity(identity: {
  email?: string | null;
  subject: string;
}): boolean {
  const emails = founderEmails();
  const email = identity.email?.toLowerCase();
  if (email && emails.includes(email)) return true;

  const ids = (process.env.SIGNAL_FOUNDER_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.includes(identity.subject)) return true;

  return false;
}

export const send = mutation({
  args: {
    sentiment: sentimentValidator,
    message: v.string(),
    path: v.string(),
    projectId: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
  },
  returns: v.id("signals"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const trimmed = args.message.trim();
    if (trimmed.length < 2) {
      throw new Error("Write a short note");
    }
    if (trimmed.length > 2000) {
      throw new Error("Keep it under 2000 characters");
    }

    const signalId = await ctx.db.insert("signals", {
      userId: identity.subject,
      userName: args.userName ?? identity.name ?? undefined,
      userEmail: args.userEmail ?? identity.email ?? undefined,
      sentiment: args.sentiment,
      message: trimmed,
      path: args.path.slice(0, 500),
      projectId: args.projectId,
      userAgent: args.userAgent?.slice(0, 400),
      createdAt: Date.now(),
    });

    return signalId;
  },
});

const SHARE_SIGNAL_COOLDOWN_MS = 60_000;

/** Stakeholder feedback on a published Issue — no auth; gated by share token. */
export const sendOnShare = mutation({
  args: {
    shareToken: v.string(),
    sentiment: sentimentValidator,
    message: v.string(),
    guestName: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  returns: v.id("signals"),
  handler: async (ctx, args) => {
    const token = args.shareToken.trim();
    if (!token || token.length > 128) {
      throw new Error("Invalid Issue link");
    }

    const link = await ctx.db
      .query("projectShareLinks")
      .withIndex("by_token", (q) => q.eq("shareToken", token))
      .unique();

    if (!link) {
      throw new Error("Issue not found");
    }
    if (link.expiresAt != null && link.expiresAt < Date.now()) {
      throw new Error("This Issue has expired");
    }

    const trimmed = args.message.trim();
    if (trimmed.length < 2) {
      throw new Error("Write a short note");
    }
    if (trimmed.length > 2000) {
      throw new Error("Keep it under 2000 characters");
    }

    const guestName = (args.guestName ?? "").trim().slice(0, 80) || "Stakeholder";
    const guestId = `guest:${token}`;

    const recent = await ctx.db
      .query("signals")
      .withIndex("by_share_created", (q) => q.eq("shareToken", token))
      .order("desc")
      .take(5);

    const now = Date.now();
    if (recent.some((row) => now - row.createdAt < SHARE_SIGNAL_COOLDOWN_MS)) {
      throw new Error("Wait a minute before sending another note");
    }

    const signalId = await ctx.db.insert("signals", {
      userId: guestId,
      userName: guestName,
      sentiment: args.sentiment,
      message: trimmed,
      path: `/share/project/${token}`,
      projectId: link.projectId,
      userAgent: args.userAgent?.slice(0, 400),
      shareToken: token,
      createdAt: now,
    });

    return signalId;
  },
});

export const amIFounder = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    return isFounderIdentity(identity);
  },
});

/** Own signals. */
export const listMine = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(signalDocValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const limit = Math.min(args.limit ?? 20, 50);
    return await ctx.db
      .query("signals")
      .withIndex("by_user_created", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(limit);
  },
});

/** Founder inbox — requires SIGNAL_FOUNDER_EMAILS or SIGNAL_FOUNDER_USER_IDS. */
export const listInbox = query({
  args: {
    limit: v.optional(v.number()),
    sentiment: v.optional(sentimentValidator),
  },
  returns: v.union(v.array(signalDocValidator), v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    if (!isFounderIdentity(identity)) {
      return null;
    }

    const limit = Math.min(args.limit ?? 100, 200);
    const rows = await ctx.db
      .query("signals")
      .withIndex("by_created")
      .order("desc")
      .take(limit);

    if (args.sentiment) {
      return rows.filter((r) => r.sentiment === args.sentiment);
    }
    return rows;
  },
});
