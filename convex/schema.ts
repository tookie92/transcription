import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Table Projects
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.string(), // Clerk user ID
    isPublic: v.boolean(),
    members: v.array(v.object({
      userId: v.string(),
      role: v.union(v.literal("owner"), v.literal("editor"), v.literal("viewer")),
      joinedAt: v.number(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // Table Interviews
  interviews: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    topic: v.optional(v.string()),
    transcription: v.string(),
    segments: v.array(v.object({
      id: v.number(),
      start: v.number(),
      end: v.number(),
      text: v.string(),
    })),
    duration: v.number(),
    status: v.union(
      v.literal("uploading"),
      v.literal("transcribing"), 
      v.literal("completed"),
      v.literal("analyzing"),
      v.literal("ready")
    ),
    createdAt: v.number(),
  }),


  // Table Insights
insights: defineTable({
  interviewId: v.optional(v.id("interviews")), // ← Rendre optionnel
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
  source: v.union(v.literal("ai"), v.literal("manual")),
  createdBy: v.string(),
  tags: v.optional(v.array(v.string())),
  priority: v.optional(v.union(
    v.literal("low"),
    v.literal("medium"), 
    v.literal("high")
  )),
  createdAt: v.number(),
}),

  // Table Affinity Maps
  affinityMaps: defineTable({
    projectId: v.id("projects"),
    name: v.string(),                    // Nom de la map entière
    description: v.optional(v.string()),
    version: v.number(),
    isCurrent: v.boolean(),
    groups: v.array(v.object({
      id: v.string(),
      title: v.string(),                 // ← CHANGÉ: 'title' au lieu de 'name'
      color: v.string(),
      position: v.object({
        x: v.number(),
        y: v.number(),
      }),
      insightIds: v.array(v.id("insights")),
    })),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),


  // Table Group Connections
// 🆕 NOUVELLE TABLE POUR LES CONNECTIONS
  groupConnections: defineTable({
    mapId: v.id("affinityMaps"),          // Map parente
    sourceGroupId: v.string(),            // ID du groupe source
    targetGroupId: v.string(),            // ID du groupe cible
    type: v.union(
      v.literal("related"),
      v.literal("hierarchy"), 
      v.literal("dependency"),
      v.literal("contradiction")
    ),
    label: v.optional(v.string()),        // Label optionnel
    strength: v.optional(v.number()),     // Force 1-5
    createdBy: v.string(),                // User ID
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_map", ["mapId"])
  .index("by_source_group", ["sourceGroupId"])
  .index("by_target_group", ["targetGroupId"]),


   // 🆕 NOUVELLE TABLE POUR LES ANALYTIQUES
  analytics: defineTable({
    mapId: v.id("affinityMaps"),
    type: v.union(
      v.literal("connection_metrics"),
      v.literal("cluster_analysis"),
      v.literal("pattern_insights")
    ),
    data: v.any(), // Données JSON flexibles pour les différents types d'analytics
    generatedAt: v.number(),
    generatedBy: v.string(),
    version: v.string(),
  })
  .index("by_map", ["mapId"])
  .index("by_map_type", ["mapId", "type"]),


    // 🆕 TABLE POUR LES SNAPSHOTS D'EXPORT
  exports: defineTable({
    mapId: v.id("affinityMaps"),
    format: v.union(
      v.literal("json"),
      v.literal("csv"), 
      v.literal("pdf"),
      v.literal("png")
    ),
    data: v.any(),
    generatedAt: v.number(),
    generatedBy: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
  })
  .index("by_map", ["mapId"])
  .index("by_created_at", ["generatedAt"]),



  // 🆕 TABLE POUR LES ANALYTIQUES
  affinityAnalytics: defineTable({
    mapId: v.id("affinityMaps"),
    metrics: v.object({
      totalConnections: v.number(),
      connectedGroups: v.number(),
      connectionRate: v.number(),
      typeDistribution: v.object({
        related: v.number(),
        hierarchy: v.number(),
        dependency: v.number(),
        contradiction: v.number(),
      }),
      averageStrength: v.number(),
      density: v.number(),
    }),
    clusters: v.array(v.object({
      groupIds: v.array(v.string()),
      size: v.number(),
      connectionCount: v.number(),
      centroid: v.object({
        x: v.number(),
        y: v.number(),
      }),
    })),
    recommendations: v.array(v.object({
      sourceGroupId: v.string(),
      targetGroupId: v.string(),
      score: v.number(),
      reason: v.string(),
      suggestedType: v.union(
        v.literal("related"),
        v.literal("hierarchy"),
        v.literal("dependency"),
        v.literal("contradiction")
      ),
    })),
    generatedAt: v.number(),
    expiresAt: v.number(),
  })
  .index("by_map", ["mapId"])
  .index("by_expires", ["expiresAt"]),


  
});
  

  