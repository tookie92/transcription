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

// Récupérer une interview par son ID
export const getById = query({
  args: {
    interviewId: v.id("interviews"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const interview = await ctx.db.get(args.interviewId);
    if (!interview) return null;

    // Vérifier que l'user a accès au projet parent
    const project = await ctx.db.get(interview.projectId);
    if (!project) return null;

    const hasAccess = project.members.some(member => 
      member.userId === identity.subject
    ) || project.isPublic || project.ownerId === identity.subject;

    return hasAccess ? interview : null;
  },
});

// Dans convex/interviews.ts - AJOUTER CES MUTATIONS
export const generateSummary = mutation({
  args: {
    interviewId: v.id("interviews"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const interview = await ctx.db.get(args.interviewId);
    if (!interview) throw new Error("Interview not found");

    // Récupérer les insights de l'interview
    const insights = await ctx.db
      .query("insights")
      .filter(q => q.eq(q.field("interviewId"), args.interviewId))
      .collect();

    // Récupérer le contexte du projet
    const project = await ctx.db.get(interview.projectId);
    if (!project) throw new Error("Project not found");

    const projectContext = `Project: ${project.name}${project.description ? ` - ${project.description}` : ''}`;

    // Appeler l'API de résumé
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcription: interview.transcription,
        topic: interview.topic,
        insights: insights.map(insight => ({
          type: insight.type,
          text: insight.text,
          timestamp: insight.timestamp,
        })),
        projectContext,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Summary generation failed');
    }

    const data = await response.json();
    
    // Mettre à jour l'interview avec le résumé
    await ctx.db.patch(args.interviewId, {
      summary: data.summary,
    });

    return data.summary;
  },
});

export const updateSummary = mutation({
  args: {
    interviewId: v.id("interviews"),
    summary: v.object({
      executiveSummary: v.string(),
      keyPoints: v.array(v.string()),
      recommendations: v.array(v.string()),
      mainThemes: v.array(v.string()),
      criticalIssues: v.array(v.string()),
      generatedAt: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.interviewId, {
      summary: args.summary,
    });

    return { success: true };
  },
});

export const deleteInterview = mutation({
  args: {
    interviewId: v.id("interviews"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const interview = await ctx.db.get(args.interviewId);
    if (!interview) throw new Error("Interview not found");

    const project = await ctx.db.get(interview.projectId);
    if (!project) throw new Error("Project not found");

    const hasAccess = project.members.some(member => 
      member.userId === identity.subject
    ) || project.ownerId === identity.subject;

    if (!hasAccess) throw new Error("No access to delete this interview");

    await ctx.db.delete(args.interviewId);

    return { success: true };
  },
});