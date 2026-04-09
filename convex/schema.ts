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
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      invitedBy: v.optional(v.string()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // Table Project Share Links
  projectShareLinks: defineTable({
    projectId: v.id("projects"),
    shareToken: v.string(),
    password: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    // Configuration
    config: v.object({
      interviewIds: v.array(v.id("interviews")), // interviews to include
      includeCrossThemes: v.boolean(),
      interviewConfig: v.record(v.id("interviews"), v.object({
        showSummary: v.boolean(),
        showInsights: v.boolean(),
        showTranscriptExcerpts: v.boolean(),
        maxExcerpts: v.number(), // max transcript excerpts per interview
      })),
      personaIds: v.optional(v.array(v.id("personas"))),
      includeAffinityMap: v.boolean(),
    }),
    // Template info (if saved as template)
    isTemplate: v.boolean(),
    templateName: v.optional(v.string()),
  })
    .index("by_project", ["projectId"])
    .index("by_token", ["shareToken"]),

  // Table Interviews
  interviews: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    topic: v.optional(v.string()),
    language: v.optional(v.string()), // Interview language (en, de, fr, etc.)
    transcription: v.string(),
    segments: v.array(v.object({
      id: v.number(),
      start: v.number(),
      end: v.number(),
      text: v.string(),
      speaker: v.optional(v.string()),
    })),
    duration: v.number(),
    audioUrl: v.optional(v.string()), // URL R2 de l'audio
    status: v.union(
      v.literal("uploading"),
      v.literal("transcribing"), 
      v.literal("completed"),
      v.literal("analyzing"),
      v.literal("ready")
    ),
    summary: v.optional(v.object({
    executiveSummary: v.string(),
    keyPoints: v.array(v.union(v.string(), v.object({
      point: v.string(),
      quantitativeObservation: v.optional(v.string()),
    }))),
    recommendations: v.array(v.union(v.string(), v.object({
      recommendation: v.string(),
      priority: v.optional(v.string()),
    }))),
    mainThemes: v.array(v.union(v.string(), v.object({
      theme: v.string(),
      description: v.optional(v.string()),
    }))),
    criticalIssues: v.array(v.union(v.string(), v.object({
      issue: v.string(),
      impact: v.optional(v.string()),
      urgency: v.optional(v.string()),
    }))),
    generatedAt: v.number(),
    })),
    // Shareable fields
    shareToken: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    sharePassword: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  }),

  // Table Insights
  insights: defineTable({
    interviewId: v.optional(v.id("interviews")),
    projectId: v.id("projects"),
    groupId: v.optional(v.string()), // ID du groupe si l'insight est dans un cluster
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
    createdByName: v.string(),
    tags: v.optional(v.array(v.string())),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"), 
      v.literal("high")
    )),
    createdAt: v.number(),
  })
    .index("by_interview", ["interviewId"])
    .index("by_project", ["projectId"]),

  // Table Live Notes
  liveNotes: defineTable({
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
      v.literal("action"),
      v.literal("pain-point"),
      v.literal("quote"),
      v.literal("insight"),
      v.literal("follow-up"),
      v.literal("custom")
    )),
    insightId: v.optional(v.id("insights")), // Lien vers l'insight cree (pour suppression cascade)
    createdAt: v.number(),
  })
    .index("by_interview", ["interviewId"])
    .index("by_user", ["userId"]),

  // Table Affinity Maps
  affinityMaps: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    version: v.number(),
    isCurrent: v.boolean(),
    clusters: v.array(v.object({
      id: v.string(),
      title: v.string(),
      color: v.string(),
      position: v.object({
        x: v.number(),
        y: v.number(),
      }),
      insightIds: v.array(v.string()),
      insightPositions: v.optional(v.record(v.string(), v.object({
        x: v.number(),
        y: v.number(),
      }))),
      size: v.optional(v.object({
        width: v.number(),
        height: v.number(),
      })),
    })),
    stickyPositions: v.optional(v.record(v.string(), v.object({
      x: v.number(),
      y: v.number(),
    }))),
    // FigJam board elements (sections, stickies, dots, etc.)
    figJamElements: v.optional(v.any()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_current", ["projectId", "isCurrent"]),

  // pour le dot voting
  // 🆕 Table Dot Voting Sessions
dotVotingSessions: defineTable({
  projectId: v.id("projects"),
  mapId: v.id("affinityMaps"),
  name: v.string(),
  maxDotsPerUser: v.number(),
  isActive: v.boolean(),
  votingPhase: v.union(
    v.literal("setup"),
    v.literal("voting"), 
    v.literal("revealed"),
    v.literal("completed")
  ),
  isSilentMode: v.boolean(),
  durationMinutes: v.optional(v.number()),
  startTime: v.optional(v.number()),
  createdBy: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_project", ["projectId"])
.index("by_map", ["mapId"]),

// 🆕 Table Votes




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
  cursorColor: v.optional(v.string()),
  lastSeen: v.number(),
})
.index("by_map", ["mapId"])
.index("by_user_map", ["userId", "mapId"]),

// 🆕 Real-time element movements (for live sync without waiting for save)
elementMovements: defineTable({
  mapId: v.id("affinityMaps"),
  elementId: v.string(),
  elementType: v.union(v.literal("sticky"), v.literal("section"), v.literal("dot"), v.literal("label")),
  action: v.union(v.literal("move"), v.literal("resize"), v.literal("update")),
  position: v.optional(v.object({ x: v.number(), y: v.number() })),
  size: v.optional(v.object({ width: v.number(), height: v.number() })),
  patch: v.optional(v.any()),
  userId: v.string(),
  timestamp: v.number(),
})
.index("by_map", ["mapId"])
.index("by_timestamp", ["timestamp"]),

// 🆕 Element locks (prevent concurrent editing)
elementLocks: defineTable({
  mapId: v.id("affinityMaps"),
  elementId: v.string(),
  userId: v.string(),
  lockedAt: v.number(),
})
.index("by_map", ["mapId"])
.index("by_element", ["elementId"]),

// 🆕 Historique des modifications
// convex/schema.ts
// 🎯 TABLE ACTIVITY LOG (existe déjà mais à compléter)
activityLog: defineTable({
  mapId: v.id("affinityMaps"),
  userId: v.string(),
  userName: v.string(), // 🆕 Ajouter le nom d'utilisateur
  action: v.union(
    // Legacy affinity map actions
    v.literal("group_created"),
    v.literal("group_moved"), 
    v.literal("group_renamed"),
    v.literal("group_deleted"),
    v.literal("insight_added"),
    v.literal("insight_removed"),
    v.literal("insight_moved"),
    v.literal("comment_added"),
    v.literal("user_mentioned"),
    // FigJam board actions
    v.literal("sticky_created"),
    v.literal("sticky_moved"),
    v.literal("sticky_resized"),
    v.literal("sticky_updated"),
    v.literal("sticky_deleted"),
    v.literal("sticky_duplicated"),
    v.literal("section_created"),
    v.literal("section_moved"),
    v.literal("section_resized"),
    v.literal("section_renamed"),
    v.literal("section_deleted"),
    v.literal("elements_grouped"),
  ),
  targetId: v.string(), // ID du groupe/insight concerné
  targetName: v.optional(v.string()), // Nom/titre pour affichage
  details: v.optional(v.any()), // Données supplémentaires
  timestamp: v.number(),
})
.index("by_map", ["mapId"])
.index("by_user", ["userId"])
.index("by_timestamp", ["timestamp"]),

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

// 🎯 TABLE NOTIFICATIONS (pour plus tard)
  notifications: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("group_created"),
      v.literal("group_moved"),
      v.literal("group_renamed"),
      v.literal("group_deleted"),
      v.literal("insight_added"),
      v.literal("insight_removed"),
      v.literal("insight_moved"),
      v.literal("comment_added"),
      v.literal("user_mentioned"),
      v.literal("invite_accepted"),
      v.literal("invite_received"),
      v.literal("invite_declined")
    ),
    title: v.string(), // Titre court de la notification
    message: v.string(), // Message détaillé
    relatedId: v.optional(v.string()), // ID de l'élément concerné
    relatedType: v.optional(v.union(
      v.literal("group"),
      v.literal("comment"),
      v.literal("insight"),
      v.literal("project")
    )),
    read: v.boolean(), // Statut de lecture
    actionUrl: v.optional(v.string()), // URL pour navigation
    createdAt: v.number(),
  })
  .index("by_user", ["userId"])
  .index("by_user_read", ["userId", "read"])
  .index("by_user_created", ["userId", "createdAt"]),

    // 🎯 TABLE POUR LES INDICATEURS DE TYPING
  typingIndicators: defineTable({
    mapId: v.id("affinityMaps"),
    groupId: v.string(),
    userId: v.string(),
    userName: v.string(),
    isTyping: v.boolean(),
    lastActivity: v.number(),
  })
  .index("by_map_group", ["mapId", "groupId"])
  .index("by_user_map", ["userId", "mapId"])
  .index("by_last_activity", ["lastActivity"]),

  //
  votes: defineTable({
  sessionId: v.id("dotVotingSessions"),
  userId: v.string(),
  targetId: v.string(),
  targetType: v.union(v.literal("group"), v.literal("insight")),
  votes: v.number(),
  isVisible: v.boolean(),
  color: v.string(),
  position: v.optional(v.object({
    x: v.number(),
    y: v.number()
  })),
  dotSize: v.optional(v.number()),
  isDragging: v.optional(v.boolean()),
  zIndex: v.optional(v.number()),
  createdAt: v.number(),
})
.index("by_user_target_session", ["userId", "targetId", "sessionId"])
.index("by_session_target", ["sessionId", "targetId"])
.index("by_session", ["sessionId"]),

dotVotes: defineTable({
  sessionId: v.id("dotVotingSessions"),
  userId: v.string(),
  targetType: v.union(v.literal("group"), v.literal("insight")),
  targetId: v.string(),
  color: v.string(),
  position: v.object({ x: v.number(), y: v.number() }),
  createdAt: v.number(),
})
.index("by_session", ["sessionId"])
.index("by_user_session", ["userId", "sessionId"]) // 🎯 CET INDEX EST CRUCIAL
.index("by_target", ["targetType", "targetId"]),


votingHistory: defineTable({
  sessionId: v.id("dotVotingSessions"),
  results: v.array(v.object({
    groupId: v.string(),
    groupTitle: v.string(),
    totalVotes: v.number(),
    voteDetails: v.array(v.object({
      userId: v.string(),
      votes: v.number(),
      color: v.string(),
    }))
  })),
  savedBy: v.string(),
  savedAt: v.number(),
})
.index("by_session", ["sessionId"])
.index("by_date", ["savedAt"]),

// convex/schema.ts - AJOUTER CETTE TABLE
personas: defineTable({
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
  createdAt: v.number(),
})
.index("by_project", ["projectId"])
.index("by_map", ["mapId"]),

// convex/schema.ts - AJOUTER CETTE TABLE
silentSortingSessions: defineTable({
  mapId: v.id("affinityMaps"),
  isActive: v.boolean(),
  duration: v.number(),
  startTime: v.number(),
  endTime: v.number(),
  createdBy: v.string(),
  participants: v.array(v.string()),
})
.index("by_map", ["mapId"])
.index("by_active", ["isActive"]),

  // Table for group connections
  groupConnections: defineTable({
    mapId: v.id("affinityMaps"),
    sourceGroupId: v.string(),
    targetGroupId: v.string(),
    type: v.union(
      v.literal("related"),
      v.literal("hierarchy"),
      v.literal("dependency"),
      v.literal("contradiction")
    ),
    label: v.optional(v.string()),
    strength: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_map", ["mapId"]),

  // Comment Bubbles - persisted floating comments like Figma
  commentBubbles: defineTable({
    mapId: v.id("affinityMaps"),
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
    targetId: v.optional(v.string()),
    targetType: v.optional(v.union(
      v.literal("sticky"),
      v.literal("label"),
      v.literal("canvas")
    )),
    resolved: v.boolean(),
    createdBy: v.string(),
    createdByName: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_map", ["mapId"])
  .index("by_target", ["targetId"]),

  // User credits for usage limits
  userCredits: defineTable({
    clerkId: v.string(), // Clerk user ID
    credits: v.number(), // Current available credits
    totalCredits: v.number(), // Total credits received
    monthlyCredits: v.number(), // Credits this month period
    lastResetAt: v.number(), // Last monthly reset timestamp
    gdprConsent: v.optional(v.boolean()), // GDPR consent status
    gdprConsentDate: v.optional(v.number()), // GDPR consent date
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_clerk", ["clerkId"]),

});

