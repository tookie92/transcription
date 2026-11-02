import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { pickBestMap } from "./lib/pickBestMap";

function generateShareToken(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

const slipValidator = v.object({
  id: v.string(),
  text: v.string(),
  kind: v.optional(v.string()),
});

const clusterValidator = v.object({
  id: v.string(),
  title: v.string(),
  voteCount: v.number(),
  slips: v.array(slipValidator),
});

const castValidator = v.object({
  name: v.string(),
  occupation: v.optional(v.string()),
  quote: v.optional(v.string()),
  background: v.optional(v.string()),
  goals: v.optional(v.array(v.string())),
  frustrations: v.optional(v.array(v.string())),
});

const briefValidator = v.object({
  thesis: v.string(),
  framing: v.string(),
  priorityLead: v.string(),
});

const wallSnapshotValidator = v.object({
  capturedAt: v.number(),
  clusters: v.array(clusterValidator),
  traySlips: v.optional(v.array(slipValidator)),
  cast: v.optional(v.array(castValidator)),
  brief: v.optional(briefValidator),
});

type WallSlip = {
  id: string;
  text: string;
  kind?: string;
};

type WallCluster = {
  id: string;
  title: string;
  voteCount: number;
  slips: WallSlip[];
};

type WallCast = {
  name: string;
  occupation?: string;
  quote?: string;
  background?: string;
  goals?: string[];
  frustrations?: string[];
};

type WallBrief = {
  thesis: string;
  framing: string;
  priorityLead: string;
};

type WallSnapshot = {
  capturedAt: number;
  clusters: WallCluster[];
  traySlips: WallSlip[];
  cast: WallCast[];
  brief?: WallBrief;
};

type FigElement = {
  id?: string;
  type?: string;
  title?: string;
  text?: string;
  content?: string;
  color?: string;
  source?: string;
  clusterId?: string | null;
  parentSectionId?: string | null;
  sectionId?: string | null;
};

function slipOf(el: FigElement): WallSlip | null {
  const text = (el.content ?? "").trim();
  if (!text || !el.id) return null;
  const kind =
    el.source === "pain-point" ||
    el.source === "quote" ||
    el.source === "follow-up" ||
    el.source === "insight"
      ? el.source
      : el.color === "pain-point" ||
          el.color === "quote" ||
          el.color === "follow-up" ||
          el.color === "insight"
        ? el.color
        : undefined;
  return { id: el.id, text, kind };
}

function clusterIdOf(sticky: FigElement): string | null {
  return sticky.clusterId ?? sticky.parentSectionId ?? sticky.sectionId ?? null;
}

function packetTitle(el: FigElement): string {
  const raw = (el.text ?? el.title ?? "").trim();
  return raw || "Untitled theme";
}

async function buildWallSnapshot(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  capturedAt: number
): Promise<WallSnapshot | null> {
  const maps = await ctx.db
    .query("affinityMaps")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  const map = pickBestMap(maps);
  if (!map) return null;

  const elements = (map.figJamElements ?? {}) as Record<string, FigElement>;
  const list = Object.values(elements).filter(
    (el) => el && typeof el === "object" && el.id && !(el as { deleted?: boolean }).deleted
  );
  // Live wall packets are type "label" (ClusterLabel). Legacy "section" still supported.
  const packets = list.filter(
    (el) => el.type === "label" || el.type === "section"
  );
  const stickies = list.filter((el) => el.type === "sticky");

  const sessions = await ctx.db
    .query("dotVotingSessions")
    .withIndex("by_map", (q) => q.eq("mapId", map._id))
    .collect();
  const session = sessions.sort((a, b) => b.createdAt - a.createdAt)[0];

  const voteCountByTarget = new Map<string, number>();
  if (session) {
    const dots = await ctx.db
      .query("dotVotes")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();
    for (const dot of dots) {
      if (dot.targetType !== "group") continue;
      voteCountByTarget.set(
        dot.targetId,
        (voteCountByTarget.get(dot.targetId) ?? 0) + 1
      );
    }
  }

  const clusters: WallCluster[] = packets.map((packet) => {
    const id = packet.id as string;
    const slips = stickies
      .filter((sticky) => clusterIdOf(sticky) === id)
      .map(slipOf)
      .filter((slip): slip is WallSlip => slip !== null);
    return {
      id,
      title: packetTitle(packet),
      voteCount: voteCountByTarget.get(id) ?? 0,
      slips,
    };
  });

  clusters.sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return a.title.localeCompare(b.title);
  });

  const traySlips = stickies
    .filter((sticky) => !clusterIdOf(sticky))
    .map(slipOf)
    .filter((slip): slip is WallSlip => slip !== null);

  const personas = await ctx.db
    .query("personas")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  const cast: WallCast[] = personas.map((persona) => ({
    name: persona.name,
    occupation: persona.occupation,
    quote: persona.quote,
    background: persona.background,
    goals: persona.goals,
    frustrations: persona.frustrations,
  }));

  return {
    capturedAt,
    clusters,
    traySlips,
    cast,
  };
}

export const getWallBrief = query({
  args: { projectId: v.id("projects") },
  returns: v.union(
    v.null(),
    v.object({
      projectName: v.string(),
      description: v.optional(v.string()),
      sittingCount: v.number(),
      wall: wallSnapshotValidator,
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    const wall = await buildWallSnapshot(ctx, args.projectId, 0);
    if (!wall) return null;

    const sittings = await ctx.db
      .query("interviews")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return {
      projectName: project.name,
      description: project.description,
      sittingCount: sittings.length,
      wall,
    };
  },
});

export const createIssueFromWall = mutation({
  args: {
    projectId: v.id("projects"),
    password: v.optional(v.string()),
    brief: v.optional(briefValidator),
  },
  returns: v.object({
    linkId: v.id("projectShareLinks"),
    shareToken: v.string(),
    shareUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const isOwner = project.ownerId === identity.subject;
    const isMember = project.members.some(
      (m) =>
        m.userId === identity.subject ||
        m.userId === identity.email ||
        m.email === identity.email
    );
    if (!isOwner && !isMember) throw new Error("Unauthorized");

    const wall = await buildWallSnapshot(ctx, args.projectId, Date.now());
    if (!wall) throw new Error("No wall yet — open the affinity map first");
    if (wall.clusters.length === 0 && wall.traySlips.length === 0) {
      throw new Error("Wall is empty — cluster some pins first");
    }

    const snapshot: WallSnapshot = args.brief
      ? {
          ...wall,
          brief: {
            thesis: args.brief.thesis.trim().slice(0, 400),
            framing: args.brief.framing.trim().slice(0, 240),
            priorityLead: args.brief.priorityLead.trim().slice(0, 280),
          },
        }
      : wall;

    const shareToken = generateShareToken();
    const linkId = await ctx.db.insert("projectShareLinks", {
      projectId: args.projectId,
      shareToken,
      password: args.password?.trim() ? args.password.trim() : undefined,
      createdBy: identity.subject,
      createdAt: Date.now(),
      config: {
        interviewIds: [],
        includeCrossThemes: false,
        interviewConfig: {},
        personaIds: [],
        includeAffinityMap: true,
        wallSnapshot: snapshot,
      },
      isTemplate: false,
    });

    return {
      linkId,
      shareToken,
      shareUrl: `/share/project/${shareToken}`,
    };
  },
});

/** @deprecated Prefer createIssueFromWall — kept for older clients. */
export const createProjectShareLink = mutation({
  args: {
    projectId: v.id("projects"),
    interviewIds: v.array(v.id("interviews")),
    includeCrossThemes: v.boolean(),
    interviewConfig: v.optional(
      v.record(
        v.id("interviews"),
        v.object({
          showSummary: v.boolean(),
          showInsights: v.boolean(),
          showTranscriptExcerpts: v.boolean(),
          maxExcerpts: v.number(),
        })
      )
    ),
    password: v.optional(v.string()),
    expiresInDays: v.optional(v.number()),
    saveAsTemplate: v.optional(v.boolean()),
    templateName: v.optional(v.string()),
    personaIds: v.optional(v.array(v.id("personas"))),
    includeAffinityMap: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const shareToken = generateShareToken();
    const expiresAt = args.expiresInDays
      ? Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
      : undefined;

    const defaultInterviewConfig: Record<
      string,
      {
        showSummary: boolean;
        showInsights: boolean;
        showTranscriptExcerpts: boolean;
        maxExcerpts: number;
      }
    > = {};

    for (const interviewId of args.interviewIds) {
      if (args.interviewConfig && args.interviewConfig[interviewId]) {
        defaultInterviewConfig[interviewId] = args.interviewConfig[interviewId];
      } else {
        defaultInterviewConfig[interviewId] = {
          showSummary: true,
          showInsights: true,
          showTranscriptExcerpts: false,
          maxExcerpts: 0,
        };
      }
    }

    const wall =
      args.includeAffinityMap === true
        ? await buildWallSnapshot(ctx, args.projectId, Date.now())
        : null;

    const linkId = await ctx.db.insert("projectShareLinks", {
      projectId: args.projectId,
      shareToken,
      password: args.password,
      expiresAt,
      createdBy: "user",
      createdAt: Date.now(),
      config: {
        interviewIds: args.interviewIds,
        includeCrossThemes: args.includeCrossThemes,
        interviewConfig: defaultInterviewConfig,
        personaIds: args.personaIds ?? [],
        includeAffinityMap: args.includeAffinityMap ?? false,
        wallSnapshot: wall ?? undefined,
      },
      isTemplate: args.saveAsTemplate || false,
      templateName: args.templateName,
    });

    return { linkId, shareToken, shareUrl: `/share/project/${shareToken}` };
  },
});

export const revokeProjectShareLink = mutation({
  args: { shareToken: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const link = await ctx.db
      .query("projectShareLinks")
      .withIndex("by_token", (q) => q.eq("shareToken", args.shareToken))
      .first();

    if (link) {
      await ctx.db.delete(link._id);
    }
    return null;
  },
});

export const getProjectShareData = query({
  args: { shareToken: v.string(), password: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("projectShareLinks")
      .withIndex("by_token", (q) => q.eq("shareToken", args.shareToken))
      .first();

    if (!link) {
      return { error: "not_found" as const };
    }

    if (link.expiresAt && link.expiresAt < Date.now()) {
      return { error: "expired" as const };
    }

    if (link.password && link.password !== args.password) {
      return { error: "password_required" as const };
    }

    const project = await ctx.db.get(link.projectId);
    if (!project) {
      return { error: "not_found" as const };
    }

    const wall = link.config.wallSnapshot ?? null;

    // Wall Issue (preferred)
    if (wall) {
      return {
        project: {
          name: project.name,
          description: project.description,
        },
        wall,
        interviews: [],
        crossThemes: null,
        personas: wall.cast ?? [],
        config: link.config,
      };
    }

    // Legacy sitting-based share
    const interviews = await Promise.all(
      link.config.interviewIds.map(async (interviewId) => {
        const interview = await ctx.db.get(interviewId);
        if (!interview) return null;

        const config = link.config.interviewConfig[interviewId];
        const insights = await ctx.db
          .query("insights")
          .withIndex("by_interview", (q) => q.eq("interviewId", interviewId))
          .collect();

        return {
          id: interview._id,
          title: interview.title,
          topic: interview.topic,
          summary: config?.showSummary ? interview.summary : null,
          insights: config?.showInsights ? insights : [],
          // Never dump raw first-N transcript lines — they aren't pins.
          transcriptExcerpts: [],
        };
      })
    );

    let personas = null;
    if (link.config.personaIds && link.config.personaIds.length > 0) {
      personas = (
        await Promise.all(
          link.config.personaIds.map(async (personaId) => {
            return await ctx.db.get(personaId);
          })
        )
      ).filter(Boolean);
    }

    return {
      project: {
        name: project.name,
        description: project.description,
      },
      wall: null,
      interviews: interviews.filter(Boolean),
      crossThemes: null,
      config: link.config,
      personas,
      affinityMap: null,
    };
  },
});

export const getProjectShareStatus = query({
  args: { projectId: v.id("projects") },
  returns: v.array(
    v.object({
      id: v.id("projectShareLinks"),
      shareToken: v.string(),
      shareUrl: v.string(),
      hasPassword: v.boolean(),
      expiresAt: v.optional(v.number()),
      createdAt: v.number(),
      interviewCount: v.number(),
      clusterCount: v.number(),
      isWallIssue: v.boolean(),
      isTemplate: v.boolean(),
      templateName: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("projectShareLinks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return links.map((link) => ({
      id: link._id,
      shareToken: link.shareToken,
      shareUrl: `/share/project/${link.shareToken}`,
      hasPassword: !!link.password,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      interviewCount: link.config.interviewIds.length,
      clusterCount: link.config.wallSnapshot?.clusters.length ?? 0,
      isWallIssue: Boolean(link.config.wallSnapshot),
      isTemplate: link.isTemplate,
      templateName: link.templateName,
    }));
  },
});

export const getShareTemplates = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const templates = await ctx.db
      .query("projectShareLinks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return templates
      .filter((t) => t.isTemplate)
      .map((t) => ({
        id: t._id,
        name: t.templateName,
        interviewCount: t.config.interviewIds.length,
        includeCrossThemes: t.config.includeCrossThemes,
      }));
  },
});
