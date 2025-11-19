import { mutation, query } from "./_generated/server";
import { v } from "convex/values";



// convex/projects.ts
export const claimInvite = mutation({
  args: { projectId: v.id("projects"), email: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    // 🔒 on cherche l’email dans la liste des membres
    const invited = project.members.find(m => m.userId === args.email);
    if (!invited) throw new Error("You were not invited");

    // on remplace l’email par le vrai userId Clerk
    await ctx.db.patch(args.projectId, {
      members: project.members.map(m =>
        m.userId === args.email ? { ...m, userId: identity.subject } : m
      ),
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


// convex/projects.ts
export const getByIdWithEmail = query({
  args: {
    projectId: v.id("projects"),
    userEmail: v.string(), // ← email de l’utilisateur connecté
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    const hasAccess =
      project.members.some((m) => m.userId === identity.subject) ||
      project.members.some((m) => m.userId === args.userEmail) || // ✅ email invité
      project.isPublic ||
      project.ownerId === identity.subject;

    return hasAccess ? project : null;
  },
});

// Récupérer un projet par son ID
// convex/projects.ts
export const getById = query({
  args: {
    projectId: v.id("projects"),
    withNames: v.optional(v.boolean()), // ← nouveau flag
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    const hasAccess =
      project.members.some((m) => m.userId === identity.subject) ||
      project.isPublic ||
      project.ownerId === identity.subject;

    if (!hasAccess) return null;

    // Si on veut les noms, on les récupère via Clerk
    if (args.withNames) {
      const membersWithNames = await Promise.all(
        project.members.map(async (m) => {
          // on va chercher les métadatas Clerk
          const user = await ctx.auth.getUserIdentity(); // ⚠️ pas dispo direct
          // On passe donc par un petit helper côté client (voir étape 2)
          // On renvoie juste l’email pour l’instant
          return {
            ...m,
            email: m.userId, // email utilisé lors de l’invitation
          };
        })
      );
      return { ...project, members: membersWithNames };
    }

    return project;
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
    name: v.string(),

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
        name: args.name,
        email: args.email,
      },
    ];

    await ctx.db.patch(args.projectId, {
      members: updatedMembers,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});


// convex/projects.ts
export const updateMemberRole = mutation({
  args: { projectId: v.id("projects"), userId: v.string(), newRole: v.union(v.literal("owner"), v.literal("editor"), v.literal("viewer")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const proj = await ctx.db.get(args.projectId);
    if (!proj) throw new Error("Project not found");
    if (proj.ownerId !== identity.subject) throw new Error("Only owner can change roles");

    await ctx.db.patch(args.projectId, {
      members: proj.members.map(m =>
        m.userId === args.userId ? { ...m, role: args.newRole } : m
      ),
      updatedAt: Date.now(),
    });
  },
});

export const removeMember = mutation({
  args: { projectId: v.id("projects"), userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const proj = await ctx.db.get(args.projectId);
    if (!proj) throw new Error("Project not found");
    if (proj.ownerId !== identity.subject) throw new Error("Only owner can remove members");

    await ctx.db.patch(args.projectId, {
      members: proj.members.filter(m => m.userId !== args.userId),
      updatedAt: Date.now(),
    });
  },
});