import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";



// convex/projects.ts
// Dans projects.ts - AJOUTER des logs pour debug
export const claimInvite = mutation({
  args: { projectId: v.id("projects"), email: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const invited = project.members.find(m => m.userId === args.email);
    if (!invited) {
      throw new Error("You were not invited with this email");
    }

    await ctx.db.patch(args.projectId, {
      members: project.members.map(m =>
        m.userId === args.email ? { 
          ...m, 
          userId: identity.subject,
          email: identity.email || m.email,
          name: identity.name || m.name || args.email.split('@')[0],
        } : m
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
        name: identity.name || identity.email?.split('@')[0] || "Owner",
        email: identity.email,
      }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return projectId;
  },
});

export const getUserProjects = query({
  args: { userEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const allProjects = await ctx.db
      .query("projects")
      .collect();

    const userEmail = args.userEmail || identity.email;
    const userProjects = allProjects.filter(project => 
      project.ownerId === identity.subject || 
      project.isPublic ||
      project.members.some(member => 
        member.userId === identity.subject ||
        (userEmail && member.userId === userEmail)
      )
    );

    return userProjects;
  },
});

export const getProjectForInvite = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    return project;
  },
});

export const getByIdWithEmail = query({
  args: {
    projectId: v.id("projects"),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    const hasAccess =
      project.members.some((m) => m.userId === identity.subject) ||
      project.members.some((m) => m.userId === args.userEmail) ||
      project.isPublic ||
      project.ownerId === identity.subject;

    return hasAccess ? project : null;
  },
});

export const getById = query({
  args: {
    projectId: v.id("projects"),
    withNames: v.optional(v.boolean()),
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

    if (args.withNames) {
      const membersWithNames = await Promise.all(
        project.members.map(async (m) => {
          return {
            ...m,
            name: m.name || m.userId,
            email: m.email || m.userId,
          };
        })
      );
      return { ...project, members: membersWithNames };
    }

    return project;
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

    if (project.ownerId !== identity.subject) {
      throw new Error("Only the project owner can invite users");
    }

    const alreadyMember = project.members.some(m => m.userId === args.email);
    if (alreadyMember) {
      throw new Error("User already a member");
    }

    const updatedMembers = [
      ...project.members,
      {
        userId: args.email,
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

    try {
      await ctx.scheduler.runAt(
        Date.now() + 1000,
        api.notifications.createNotification,
        {
          userId: args.email,
          type: "invite_received",
          title: "New Project Invitation",
          message: `You have been invited to join "${project.name}" as a ${args.role}. Click to view the project.`,
          relatedId: args.projectId,
          relatedType: "project",
          actionUrl: `/project/${args.projectId}`,
        }
      );
    } catch (notificationError) {
      console.log("Note: Notification could not be sent", notificationError);
    }

    return { success: true };
  },
});

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

    const updatedMembers = proj.members.filter(m => m.email !== args.userId);

    await ctx.db.patch(args.projectId, {
      members: updatedMembers,
      updatedAt: Date.now(),
    });
  },
});

export const declineInvite = mutation({
  args: { projectId: v.id("projects"), email: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const proj = await ctx.db.get(args.projectId);
    if (!proj) throw new Error("Project not found");

    const invitedMember = proj.members.find(m => m.userId === args.email);
    const inviterName = invitedMember?.name || "Someone";

    await ctx.db.patch(args.projectId, {
      members: proj.members.filter(m => m.userId !== args.email),
      updatedAt: Date.now(),
    });

    try {
      await ctx.scheduler.runAt(
        Date.now() + 500,
        api.notifications.createNotification,
        {
          userId: proj.ownerId,
          type: "invite_declined",
          title: "Invitation Declined",
          message: `${inviterName} (${args.email}) declined the invitation to join "${proj.name}".`,
          relatedId: args.projectId,
          relatedType: "project",
          actionUrl: `/project/${args.projectId}`,
        }
      );
    } catch (notificationError) {
      console.log("Note: Notification could not be sent", notificationError);
    }

    return { success: true };
  },
});

export const migrateMembersInfo = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const allProjects = await ctx.db.query("projects").collect();
    let updatedCount = 0;
    
    for (const project of allProjects) {
      let needsUpdate = false;
      const updatedMembers = project.members.map(m => {
        if (m.name && !m.name.includes('@') && m.name !== m.userId) return m;
        
        needsUpdate = true;
        const extractedName = m.userId.includes('@') 
          ? m.userId.split('@')[0] 
          : m.userId;
        
        return {
          ...m,
          name: m.name || extractedName,
          email: m.email || (m.userId.includes('@') ? m.userId : undefined),
        };
      });
      
      if (needsUpdate) {
        await ctx.db.patch(project._id, {
          members: updatedMembers,
          updatedAt: Date.now(),
        });
        updatedCount++;
      }
    }
    
    return { success: true, updatedProjects: updatedCount };
  },
});

export const fixCurrentUserMember = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    
    const memberIndex = project.members.findIndex(m => m.userId === identity.subject);
    if (memberIndex === -1) throw new Error("Not a member of this project");
    
    const updatedMembers = [...project.members];
    updatedMembers[memberIndex] = {
      ...updatedMembers[memberIndex],
      userId: identity.subject,
      name: identity.name || identity.email?.split('@')[0] || "Unknown",
      email: identity.email,
    };
    
    await ctx.db.patch(args.projectId, {
      members: updatedMembers,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Delete a project (only owner can delete)
export const deleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    if (project.ownerId !== identity.subject) {
      throw new Error("Only project owner can delete the project");
    }

    await ctx.db.delete(args.projectId);

    return { success: true };
  },
});