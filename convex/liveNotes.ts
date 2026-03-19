import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("liveNotes")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
      .collect();
    
    return notes.sort((a, b) => a.timestamp - b.timestamp);
  },
});

export const create = mutation({
  args: {
    interviewId: v.id("interviews"),
    userId: v.string(),
    userName: v.string(),
    content: v.string(),
    timestamp: v.number(),
    tag: v.optional(v.union(
      v.literal("observation"),
      v.literal("question"),
      v.literal("idea"),
      v.literal("important"),
      v.literal("action")
    )),
  },
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("liveNotes", {
      interviewId: args.interviewId,
      userId: args.userId,
      userName: args.userName,
      content: args.content,
      timestamp: args.timestamp,
      tag: args.tag ?? undefined,
      insightId: undefined,
      createdAt: Date.now(),
    });
    return noteId;
  },
});

export const update = mutation({
  args: {
    noteId: v.id("liveNotes"),
    content: v.string(),
    tag: v.optional(v.union(
      v.literal("observation"),
      v.literal("question"),
      v.literal("idea"),
      v.literal("important"),
      v.literal("action")
    )),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw new Error("Note not found");
    }

    const updates: Record<string, unknown> = { content: args.content };
    if (args.tag !== undefined) {
      updates.tag = args.tag;
    }

    await ctx.db.patch(args.noteId, updates);
  },
});

export const remove = mutation({
  args: { noteId: v.id("liveNotes") },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw new Error("Note not found");
    }

    // Suppression cascade: si la note a ete convertie en insight, supprimer aussi l'insight
    if (note.insightId) {
      try {
        await ctx.db.delete(note.insightId);
      } catch (e) {
        // L'insight peut deja etre supprime (ex: supprime manuellement sur le canvas)
        console.log("Insight already deleted or not found");
      }
    }

    await ctx.db.delete(args.noteId);
  },
});

export const deleteByInterview = mutation({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("liveNotes")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
      .collect();
    
    for (const note of notes) {
      // Suppression cascade: supprimer aussi l'insight associe
      if (note.insightId) {
        try {
          await ctx.db.delete(note.insightId);
        } catch (e) {
          // Ignore si deja supprime
        }
      }
      await ctx.db.delete(note._id);
    }
  },
});

export const linkInsight = mutation({
  args: {
    noteId: v.id("liveNotes"),
    insightId: v.id("insights"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.noteId, {
      insightId: args.insightId,
    });
  },
});
