import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MONTHLY_CREDITS = 150;
const CREDIT_COSTS = {
  transcription: 20,
  aiGrouping: 10,
  aiRename: 5,
};

export const getUserCredits = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    const existingCredits = await ctx.db
      .query("userCredits")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!existingCredits) {
      return {
        credits: MONTHLY_CREDITS,
        monthlyCredits: MONTHLY_CREDITS,
        totalCredits: MONTHLY_CREDITS,
        costs: CREDIT_COSTS,
      };
    }

    // Check if we need to reset for a new month (read-only check)
    const shouldReset = now - existingCredits.lastResetAt >= oneMonth;
    
    if (shouldReset) {
      // Return calculated values (mutation will handle actual reset)
      const newMonthlyCredits = MONTHLY_CREDITS;
      const newCredits = existingCredits.credits + (newMonthlyCredits - existingCredits.monthlyCredits);
      
      return {
        credits: newCredits,
        monthlyCredits: newMonthlyCredits,
        totalCredits: existingCredits.totalCredits + newMonthlyCredits,
        costs: CREDIT_COSTS,
        needsReset: true,
      };
    }

    return {
      credits: existingCredits.credits,
      monthlyCredits: existingCredits.monthlyCredits,
      totalCredits: existingCredits.totalCredits,
      costs: CREDIT_COSTS,
    };
  },
});

// Initialize or ensure user has credits (called on first use)
export const initializeCredits = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    const existingCredits = await ctx.db
      .query("userCredits")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!existingCredits) {
      await ctx.db.insert("userCredits", {
        clerkId: identity.subject,
        credits: MONTHLY_CREDITS,
        totalCredits: MONTHLY_CREDITS,
        monthlyCredits: MONTHLY_CREDITS,
        lastResetAt: now,
        createdAt: now,
        updatedAt: now,
      });
      return { credits: MONTHLY_CREDITS };
    }

    // Check for monthly reset
    if (now - existingCredits.lastResetAt >= oneMonth) {
      const newMonthlyCredits = MONTHLY_CREDITS;
      const newCredits = existingCredits.credits + (newMonthlyCredits - existingCredits.monthlyCredits);
      
      await ctx.db.patch(existingCredits._id, {
        credits: newCredits,
        monthlyCredits: newMonthlyCredits,
        lastResetAt: now,
        updatedAt: now,
      });
      return { credits: newCredits };
    }

    return { credits: existingCredits.credits };
  },
});

export const deductCredits = mutation({
  args: {
    operation: v.union(
      v.literal("transcription"),
      v.literal("aiGrouping"),
      v.literal("aiRename")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // First ensure credits are initialized
    await ctx.db.insert("userCredits", {
      clerkId: identity.subject,
      credits: MONTHLY_CREDITS,
      totalCredits: MONTHLY_CREDITS,
      monthlyCredits: MONTHLY_CREDITS,
      lastResetAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    const cost = CREDIT_COSTS[args.operation];
    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    const existingCredits = await ctx.db
      .query("userCredits")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!existingCredits) {
      // Create with initial credits minus cost
      const newCredits = MONTHLY_CREDITS - cost;
      await ctx.db.insert("userCredits", {
        clerkId: identity.subject,
        credits: newCredits,
        totalCredits: MONTHLY_CREDITS,
        monthlyCredits: MONTHLY_CREDITS,
        lastResetAt: now,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, remainingCredits: newCredits, operation: args.operation, cost };
    }

    let currentCredits = existingCredits.credits;
    let currentMonthlyCredits = existingCredits.monthlyCredits;

    // Handle monthly reset if needed
    if (now - existingCredits.lastResetAt >= oneMonth) {
      currentMonthlyCredits = MONTHLY_CREDITS;
      currentCredits = existingCredits.credits + (MONTHLY_CREDITS - existingCredits.monthlyCredits);
      
      await ctx.db.patch(existingCredits._id, {
        credits: currentCredits,
        monthlyCredits: currentMonthlyCredits,
        lastResetAt: now,
      });
    }

    if (currentCredits < cost) {
      throw new Error(`Not enough credits. Need ${cost} credits for ${args.operation}, but only have ${currentCredits}.`);
    }

    const newCredits = currentCredits - cost;
    const newMonthlyCredits = currentMonthlyCredits - cost;

    await ctx.db.patch(existingCredits._id, {
      credits: newCredits,
      monthlyCredits: newMonthlyCredits,
      updatedAt: now,
    });

    return { success: true, remainingCredits: newCredits, operation: args.operation, cost };
  },
});

export const addCredits = mutation({
  args: {
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existingCredits = await ctx.db
      .query("userCredits")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!existingCredits) {
      await ctx.db.insert("userCredits", {
        clerkId: identity.subject,
        credits: args.amount,
        totalCredits: args.amount,
        monthlyCredits: args.amount,
        lastResetAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(existingCredits._id, {
        credits: existingCredits.credits + args.amount,
        totalCredits: existingCredits.totalCredits + args.amount,
        monthlyCredits: existingCredits.monthlyCredits + args.amount,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const getConsent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const existingCredits = await ctx.db
      .query("userCredits")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    return existingCredits?.gdprConsent ?? false;
  },
});

export const setConsent = mutation({
  args: {
    gdprConsent: v.boolean(),
    consentDate: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existingCredits = await ctx.db
      .query("userCredits")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!existingCredits) {
      await ctx.db.insert("userCredits", {
        clerkId: identity.subject,
        credits: MONTHLY_CREDITS,
        totalCredits: MONTHLY_CREDITS,
        monthlyCredits: MONTHLY_CREDITS,
        gdprConsent: args.gdprConsent,
        gdprConsentDate: args.consentDate,
        lastResetAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(existingCredits._id, {
        gdprConsent: args.gdprConsent,
        gdprConsentDate: args.consentDate,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Admin: Clean up duplicate userCredits entries
// Keeps only the most recent entry per clerkId
export const cleanupDuplicateCredits = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get all userCredits entries
    const allCredits = await ctx.db
      .query("userCredits")
      .collect();

    // Group by clerkId
    const byClerkId = new Map<string, typeof allCredits>();
    for (const entry of allCredits) {
      const existing = byClerkId.get(entry.clerkId) || [];
      existing.push(entry);
      byClerkId.set(entry.clerkId, existing);
    }

    let deleted = 0;
    for (const [clerkId, entries] of byClerkId) {
      if (entries.length <= 1) continue;

      // Sort by updatedAt descending, keep the first (most recent)
      entries.sort((a, b) => b.updatedAt - a.updatedAt);

      // Delete duplicates (keep the first)
      for (let i = 1; i < entries.length; i++) {
        await ctx.db.delete(entries[i]._id);
        deleted++;
      }
    }

    return { deleted, uniqueUsers: byClerkId.size };
  },
});