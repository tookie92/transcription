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
  });