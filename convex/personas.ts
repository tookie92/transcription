// convex/personas.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createPersona = mutation({
  args: {
    projectId: v.id("projects"),
    mapId: v.id("affinityMaps"),
    name: v.string(),
    age: v.number(),
    occupation: v.string(),
    background: v.string(),
    goals: v.array(v.string()),
    frustrations: v.array(v.string()),
    behaviors: v.array(v.string()),
    quote: v.string(),
    profileImage: v.string(),
    demographics: v.object({
      education: v.string(),
      income: v.string(),
      location: v.string(),
      techProficiency: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("expert")),
    }),
    psychographics: v.object({
      motivations: v.array(v.string()),
      values: v.array(v.string()),
      personality: v.array(v.string()),
    }),
    basedOn: v.object({
      groups: v.number(),
      insights: v.number(),
      groupTitles: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const personaId = await ctx.db.insert("personas", {
      ...args,
      createdAt: Date.now(),
    });

    return personaId;
  },
});

export const getPersonasByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const personas = await ctx.db
      .query("personas")
      .withIndex("by_project", q => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    return personas;
  },
});

export const getPersonasByMap = query({
  args: {
    mapId: v.id("affinityMaps"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const personas = await ctx.db
      .query("personas")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .order("desc")
      .collect();

    return personas;
  },
});