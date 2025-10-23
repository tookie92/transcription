import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Créer un projet
export const createProject = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated - cannot create project");
    }

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      ownerId: identity.subject,
      isPublic: false,
      members: [{
        userId: identity.subject,
        role: "owner" as const,
        joinedAt: Date.now(),
      }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return projectId;
  },
});

// Récupérer les projets de l'utilisateur
export const getUserProjects = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("🚫 No user identity - returning empty array");
      return [];
    }

    console.log("🔐 User authenticated:", identity.subject);

    // Récupérer tous les projets où l'user est membre
    const projects = await ctx.db
      .query("projects")
      .filter(q => 
        q.or(
          q.eq(q.field("ownerId"), identity.subject), // Propriétaire
          q.eq(q.field("isPublic"), true), // Ou projet public
          // Ou membre du projet - on vérifie manuellement
        )
      )
      .collect();

    // Filtrer manuellement pour les membres
    const userProjects = projects.filter(project => 
      project.ownerId === identity.subject || 
      project.isPublic ||
      project.members.some(member => member.userId === identity.subject)
    );

    console.log("📁 User projects found:", userProjects.length);
    return userProjects;
  },
});


// Dans la mutation d'invitation
export const inviteToProject = mutation({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
    role: v.union(v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    
    // Seul le owner peut inviter
    if (project.ownerId !== identity.subject) {
      throw new Error("Only project owner can invite users");
    }

    // Ajouter l'user aux membres
    // ...
  },
});