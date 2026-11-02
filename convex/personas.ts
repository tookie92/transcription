import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const basedOnValidator = v.object({
  groups: v.number(),
  insights: v.number(),
  groupTitles: v.array(v.string()),
  packetIds: v.optional(v.array(v.string())),
});

const wallPositionValidator = v.object({
  x: v.number(),
  y: v.number(),
});

const personaDoc = v.object({
  _id: v.id("personas"),
  _creationTime: v.number(),
  projectId: v.id("projects"),
  mapId: v.id("affinityMaps"),
  name: v.string(),
  occupation: v.string(),
  background: v.string(),
  goals: v.array(v.string()),
  frustrations: v.array(v.string()),
  quote: v.string(),
  gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
  age: v.optional(v.number()),
  behaviors: v.optional(v.array(v.string())),
  profileImage: v.optional(v.string()),
  demographics: v.optional(
    v.object({
      education: v.string(),
      income: v.string(),
      location: v.string(),
      techProficiency: v.union(
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("expert")
      ),
    })
  ),
  psychographics: v.optional(
    v.object({
      motivations: v.array(v.string()),
      values: v.array(v.string()),
      personality: v.array(v.string()),
    })
  ),
  basedOn: basedOnValidator,
  wallPosition: v.optional(wallPositionValidator),
  createdAt: v.number(),
});

export const createPersona = mutation({
  args: {
    projectId: v.id("projects"),
    mapId: v.id("affinityMaps"),
    name: v.string(),
    occupation: v.string(),
    background: v.string(),
    goals: v.array(v.string()),
    frustrations: v.array(v.string()),
    quote: v.string(),
    basedOn: basedOnValidator,
    profileImage: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    wallPosition: v.optional(wallPositionValidator),
  },
  returns: v.id("personas"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("personas", {
      projectId: args.projectId,
      mapId: args.mapId,
      name: args.name,
      occupation: args.occupation,
      background: args.background,
      goals: args.goals,
      frustrations: args.frustrations,
      quote: args.quote,
      basedOn: args.basedOn,
      profileImage: args.profileImage,
      gender: args.gender,
      wallPosition: args.wallPosition,
      createdAt: Date.now(),
    });
  },
});

export const getPersonasByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  returns: v.array(personaDoc),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("personas")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

export const getPersonasByMap = query({
  args: {
    mapId: v.id("affinityMaps"),
  },
  returns: v.array(personaDoc),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("personas")
      .withIndex("by_map", (q) => q.eq("mapId", args.mapId))
      .order("desc")
      .collect();
  },
});

export const updatePersona = mutation({
  args: {
    personaId: v.id("personas"),
    name: v.optional(v.string()),
    occupation: v.optional(v.string()),
    background: v.optional(v.string()),
    goals: v.optional(v.array(v.string())),
    frustrations: v.optional(v.array(v.string())),
    quote: v.optional(v.string()),
    profileImage: v.optional(v.string()),
    wallPosition: v.optional(wallPositionValidator),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { personaId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    await ctx.db.patch(personaId, filteredUpdates);
    return { success: true };
  },
});

export const updatePersonaWallPosition = mutation({
  args: {
    personaId: v.id("personas"),
    wallPosition: wallPositionValidator,
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const persona = await ctx.db.get(args.personaId);
    if (!persona) throw new Error("Cast not found");

    await ctx.db.patch(args.personaId, {
      wallPosition: args.wallPosition,
    });
    return { success: true };
  },
});

export const deletePersona = mutation({
  args: {
    personaId: v.id("personas"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const persona = await ctx.db.get(args.personaId);
    if (!persona) {
      // Already gone — treat as success so the wall can clear local state.
      return { success: true };
    }

    const project = await ctx.db.get(persona.projectId);
    if (!project) throw new Error("Project not found");

    const hasAccess =
      project.ownerId === identity.subject ||
      project.members.some(
        (member) =>
          member.userId === identity.subject ||
          member.userId === identity.email ||
          member.email === identity.email
      );
    if (!hasAccess) throw new Error("Unauthorized");

    await ctx.db.delete(args.personaId);
    return { success: true };
  },
});
