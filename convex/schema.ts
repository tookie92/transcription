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
      name:v.optional(v.string()),
      email:v.optional(v.string()),
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
    interviewId: v.optional(v.id("interviews")),
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
    name: v.string(),
    description: v.optional(v.string()),
    version: v.number(),
    isCurrent: v.boolean(),
    groups: v.array(v.object({
      id: v.string(),
      title: v.string(),
      color: v.string(),
      position: v.object({
        x: v.number(),
        y: v.number(),
      }),
      insightIds: v.array(v.string()), // ← CHANGÉ: string[] au lieu de Id<"insights">[]
    })),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

 // pour le dot voting
  // 🆕 Table Dot Voting Sessions
  dotVotingSessions: defineTable({
    projectId: v.id("projects"),
    mapId: v.id("affinityMaps"),
    name: v.string(),
    maxVotesPerUser: v.number(),
    isActive: v.boolean(),
    createdBy: v.string(), // Clerk user ID
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_project",["projectId"]),

  // 🆕 Table Votes
  votes: defineTable({
    sessionId: v.id("dotVotingSessions"),
    userId: v.string(), // Clerk user ID
    groupId: v.string(), // ID du groupe dans affinityMaps.groups[]
    votes: v.number(), // Nombre de votes pour ce groupe
    createdAt: v.number(),
  })
  .index("by_user_group_session", ["userId", "groupId", "sessionId"])
  .index("by_session", ["sessionId"]),

  // 🆕 Présence utilisateur en temps réel
presence: defineTable({
  mapId: v.id("affinityMaps"),
  userId: v.string(), // Clerk user ID
  cursor: v.object({
    x: v.number(),
    y: v.number(),
  }),
  selection: v.array(v.string()), // groupIds sélectionnés
  user: v.object({
    id: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
  }),
  lastSeen: v.number(),
})
.index("by_map", ["mapId"])
.index("by_user_map", ["userId", "mapId"]),

// 🆕 Historique des modifications
// convex/schema.ts
activityLog: defineTable({
  mapId: v.id("affinityMaps"),
  userId: v.string(),
  action: v.union( // ← nouveau
    v.literal("group_moved"),
    v.literal("group_created"),
    v.literal("group_deleted"),
    v.literal("insight_added"),
    v.literal("insight_removed"),
    v.literal("group_renamed")
  ),
  payload: v.optional(v.any()),
  timestamp: v.number(),
})
.index("by_map", ["mapId"])
.index("by_user", ["userId"]),

// 🆕 Commentaires sur les groupes
comments: defineTable({
  mapId: v.id("affinityMaps"),
  groupId: v.string(),
  userId: v.string(),
  userName: v.string(),
  text: v.string(),
  resolved: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_map", ["mapId"])
.index("by_group", ["groupId"]),


commentViews: defineTable({
  commentId: v.id("comments"),
  userId: v.string(),
  viewedAt: v.number(),
})
.index("by_user_comment", ["userId", "commentId"]),

  
});

