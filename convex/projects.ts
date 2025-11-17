import { mutation, query } from "./_generated/server";
import { v } from "convex/values";



export const claimInvite = mutation({
  args: {
    projectId: v.id("projects"),
    email: v.string(), // l’email qu’on a utilisé pour inviter
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    // Trouve l’invitation par email
    const invited = project.members.find(m => m.userId === args.email);
    if (!invited) {
      throw new Error("You were not invited");
    }

    // Remplace l’email par le vrai userId
    const updatedMembers = project.members.map(m =>
      m.userId === args.email
        ? { ...m, userId: identity.subject }
        : m
    );

    await ctx.db.patch(args.projectId, {
      members: updatedMembers,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

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


// Récupérer un projet par son ID
export const getById = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    // Vérifier les permissions
    const hasAccess = project.members.some(member => 
      member.userId === identity.subject
    ) || project.isPublic || project.ownerId === identity.subject;

    return hasAccess ? project : null;
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

export const inviteUser = mutation({
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

    // Seul le propriétaire peut inviter
    if (project.ownerId !== identity.subject) {
      throw new Error("Only the project owner can invite users");
    }

    // Vérifie que l’email n’est pas déjà membre
    const alreadyMember = project.members.some(m => m.userId === args.email);
    if (alreadyMember) {
      throw new Error("User already a member");
    }

    // Ajoute l’utilisateur (on utilise l’email comme userId temporaire)
    const updatedMembers = [
      ...project.members,
      {
        userId: args.email, // ✅ on utilisera l’email comme identifiant temporaire
        role: args.role,
        joinedAt: Date.now(),
      },
    ];

    await ctx.db.patch(args.projectId, {
      members: updatedMembers,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});