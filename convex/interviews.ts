import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Créer une interview
export const createInterview = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Vérifier que l'utilisateur a accès au projet
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    
    const hasAccess = project.members.some(member => 
      member.userId === identity.subject
    );
    if (!hasAccess) throw new Error("No access to project");

    const interviewId = await ctx.db.insert("interviews", {
      ...args,
      status: "completed",
      createdAt: Date.now(),
    });

    return interviewId;
  },
});


// Récupérer les interviews d'un projet
export const getProjectInterviews = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("🚫 No user identity - cannot access interviews");
      return [];
    }

    // Vérifier que l'user a accès au projet
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      console.log("❌ Project not found:", args.projectId);
      return [];
    }
    
    const hasAccess = project.members.some(member => 
      member.userId === identity.subject
    ) || project.isPublic || project.ownerId === identity.subject;

    if (!hasAccess) {
      console.log("🚫 User has no access to project:", identity.subject, args.projectId);
      return [];
    }

    console.log("✅ User has access, fetching interviews...");
    const interviews = await ctx.db
      .query("interviews")
      .filter(q => q.eq(q.field("projectId"), args.projectId))
      .collect();

    return interviews;
  },
});