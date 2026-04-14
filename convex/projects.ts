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

    const inviterName = identity.name || identity.email?.split('@')[0] || "Team member";
    
    const updatedMembers = [
      ...project.members,
      {
        userId: args.email,
        role: args.role,
        joinedAt: Date.now(),
        name: args.name,
        email: args.email,
        invitedBy: inviterName,
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

// Delete a project (only owner can delete) - WITH CASCADE
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

    // 1. Get all interviews for this project
    const interviews = await ctx.db
      .query("interviews")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // 2. For each interview, delete related data
    for (const interview of interviews) {
      const insights = await ctx.db
        .query("insights")
        .withIndex("by_interview", (q) => q.eq("interviewId", interview._id))
        .collect();
      for (const insight of insights) {
        await ctx.db.delete(insight._id);
      }

      const liveNotes = await ctx.db
        .query("liveNotes")
        .withIndex("by_interview", (q) => q.eq("interviewId", interview._id))
        .collect();
      for (const note of liveNotes) {
        await ctx.db.delete(note._id);
      }
    }

    // 3. Delete all interviews
    for (const interview of interviews) {
      await ctx.db.delete(interview._id);
    }

    // 4. Get all affinity maps for this project
    const maps = await ctx.db
      .query("affinityMaps")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // 5. For each map, delete related data
    for (const map of maps) {
      const presence = await ctx.db
        .query("presence")
        .withIndex("by_map", (q) => q.eq("mapId", map._id))
        .collect();
      for (const p of presence) await ctx.db.delete(p._id);

      const movements = await ctx.db
        .query("elementMovements")
        .withIndex("by_map", (q) => q.eq("mapId", map._id))
        .collect();
      for (const m of movements) await ctx.db.delete(m._id);

      const locks = await ctx.db
        .query("elementLocks")
        .withIndex("by_map", (q) => q.eq("mapId", map._id))
        .collect();
      for (const l of locks) await ctx.db.delete(l._id);

      const activities = await ctx.db
        .query("activityLog")
        .withIndex("by_map", (q) => q.eq("mapId", map._id))
        .collect();
      for (const a of activities) await ctx.db.delete(a._id);

      const comments = await ctx.db
        .query("comments")
        .withIndex("by_map", (q) => q.eq("mapId", map._id))
        .collect();
      for (const c of comments) await ctx.db.delete(c._id);

      const votingSessions = await ctx.db
        .query("dotVotingSessions")
        .withIndex("by_map", (q) => q.eq("mapId", map._id))
        .collect();
      for (const session of votingSessions) {
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect();
        for (const v of votes) await ctx.db.delete(v._id);

        const history = await ctx.db
          .query("votingHistory")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect();
        for (const h of history) await ctx.db.delete(h._id);

        await ctx.db.delete(session._id);
      }

      const typing = await ctx.db
        .query("typingIndicators")
        .withIndex("by_map_group", (q) => q.eq("mapId", map._id))
        .collect();
      for (const t of typing) await ctx.db.delete(t._id);

      const suggestions = await ctx.db
        .query("aiGroupingSuggestions")
        .withIndex("by_map", (q) => q.eq("mapId", map._id))
        .collect();
      for (const s of suggestions) await ctx.db.delete(s._id);
    }

    // 6. Delete all affinity maps
    for (const map of maps) {
      await ctx.db.delete(map._id);
    }

    // 7. Delete project share links
    const allShareLinks = await ctx.db
      .query("projectShareLinks")
      .collect();
    const projectShareLinks = allShareLinks.filter(l => l.projectId === args.projectId);
    for (const link of projectShareLinks) {
      await ctx.db.delete(link._id);
    }

    // 8. Delete the project
    await ctx.db.delete(args.projectId);

    return { success: true };
  },
});

// Créer un projet démo avec données pré-remplies pour user testing
export const createDemoProject = mutation({
  args: {},
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Créer le projet démo
    const projectId = await ctx.db.insert("projects", {
      name: "Demo Project",
      description: "A sample project to explore Skripta's features",
      ownerId: identity.subject,
      isPublic: false,
      isDemo: true,
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

    // Créer un interview démo
    const interviewId = await ctx.db.insert("interviews", {
      projectId,
      title: "Sample Interview",
      topic: "Product feedback demo",
      language: "en",
      transcription: "So tell me about your experience with our product. Well, I've been using it for about three months now. Overall, it's been pretty helpful but there are some things that could be better. Interesting. Can you give me an example of something that works well? Definitely. The dashboard is really intuitive. I can see all my metrics at a glance without having to dig around. That's been a huge time saver. That's great to hear. And what about something that could be improved? The export feature is a bit clunky. It takes too many clicks to get a simple report. I wish it was more streamlined. I see. How about the mobile experience? Do you use it on your phone? Honestly, I rarely use it on mobile. The interface feels too cramped and hard to navigate. I prefer the desktop version. Got it. One more question - would you recommend this product to a colleague? Yes, absolutely. Despite the minor issues, it's solved a real problem for our team. The benefits definitely outweigh the drawbacks.",
      segments: [
        { id: 0, start: 0, end: 5, text: "So tell me about your experience with our product.", speaker: "Interviewer" },
        { id: 1, start: 5, end: 12, text: "Well, I've been using it for about three months now. Overall, it's been pretty helpful but there are some things that could be better.", speaker: "Participant" },
        { id: 2, start: 12, end: 18, text: "Interesting. Can you give me an example of something that works well?", speaker: "Interviewer" },
        { id: 3, start: 18, end: 25, text: "Definitely. The dashboard is really intuitive. I can see all my metrics at a glance without having to dig around. That's been a huge time saver.", speaker: "Participant" },
        { id: 4, start: 25, end: 32, text: "That's great to hear. And what about something that could be improved?", speaker: "Interviewer" },
        { id: 5, start: 32, end: 40, text: "The export feature is a bit clunky. It takes too many clicks to get a simple report. I wish it was more streamlined.", speaker: "Participant" },
        { id: 6, start: 40, end: 48, text: "I see. How about the mobile experience? Do you use it on your phone?", speaker: "Interviewer" },
        { id: 7, start: 48, end: 56, text: "Honestly, I rarely use it on mobile. The interface feels too cramped and hard to navigate. I prefer the desktop version.", speaker: "Participant" },
        { id: 8, start: 56, end: 62, text: "Got it. One more question - would you recommend this product to a colleague?", speaker: "Interviewer" },
        { id: 9, start: 62, end: 70, text: "Yes, absolutely. Despite the minor issues, it's solved a real problem for our team. The benefits definitely outweigh the drawbacks.", speaker: "Participant" },
      ],
      duration: 70,
      audioUrl: "",
      status: "ready",
      createdAt: Date.now(),
    });

    // Créer des insights démo
    const demoInsights = [
      { type: "insight" as const, text: "Users appreciate the intuitive dashboard that saves time", timestamp: 18000 },
      { type: "pain-point" as const, text: "Export feature is clunky and requires too many clicks", timestamp: 32000 },
      { type: "pain-point" as const, text: "Mobile interface is too cramped and hard to navigate", timestamp: 48000 },
      { type: "quote" as const, text: "The dashboard is really intuitive. I can see all my metrics at a glance.", timestamp: 18000 },
      { type: "quote" as const, text: "I wish it was more streamlined", timestamp: 40000 },
      { type: "insight" as const, text: "Users prefer desktop over mobile for complex tasks", timestamp: 48000 },
      { type: "insight" as const, text: "Overall positive recommendation despite minor issues", timestamp: 62000 },
      { type: "follow-up" as const, text: "What specific features would make export more streamlined?", timestamp: 40000 },
      { type: "follow-up" as const, text: "How could we improve the mobile experience?", timestamp: 48000 },
      { type: "quote" as const, text: "The benefits definitely outweigh the drawbacks", timestamp: 70000 },
    ];

    for (const insight of demoInsights) {
      await ctx.db.insert("insights", {
        interviewId,
        projectId,
        type: insight.type,
        text: insight.text,
        timestamp: insight.timestamp,
        source: "demo" as const,
        createdBy: identity.subject,
        createdByName: "Demo Data",
        createdAt: Date.now(),
      });
    }

    return projectId;
  },
});