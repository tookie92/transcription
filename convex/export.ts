// convex/export.ts - version simplifiée
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Schéma pour l'export/import
const exportMapDataSchema = v.object({
  version: v.literal("1.0"),
  exportedAt: v.number(),
  map: v.object({
    name: v.string(),
    description: v.optional(v.string()),
    groups: v.array(v.object({
      id: v.string(),
      title: v.string(),
      color: v.string(),
      position: v.object({ x: v.number(), y: v.number() }),
      insightIds: v.array(v.string()),
    })),
  }),
});

// Export de la map actuelle
export const exportMapData = query({
  args: {
    mapId: v.id("affinityMaps"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    // ✅ Retourner exactement le type attendu
    const exportData = {
      version: "1.0" as const, // ✅ Literal type
      exportedAt: Date.now(),
      map: {
        name: map.name,
        description: map.description,
        groups: map.groups,
      },
    };

    return exportData;
  },
});

// Import d'une map
export const importMapData = mutation({
  args: {
    projectId: v.id("projects"),
    importData: exportMapDataSchema,
  },
  handler: async (ctx, args): Promise<Id<"affinityMaps">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    
    const hasAccess = project.members.some(member => 
      member.userId === identity.subject
    ) || project.ownerId === identity.subject;

    if (!hasAccess) throw new Error("No access to project");

    // Marquer les autres maps comme non-current
    const existingMaps = await ctx.db
      .query("affinityMaps")
      .filter(q => q.eq(q.field("projectId"), args.projectId))
      .collect();

    for (const map of existingMaps) {
      await ctx.db.patch(map._id, { isCurrent: false });
    }

    // Créer la nouvelle map avec données importées
    const mapId = await ctx.db.insert("affinityMaps", {
      projectId: args.projectId,
      name: args.importData.map.name,
      description: args.importData.map.description,
      version: 1,
      isCurrent: true,
      groups: args.importData.map.groups,
      createdBy: identity.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return mapId;
  },
});