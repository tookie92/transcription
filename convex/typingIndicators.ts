// convex/typingIndicators.ts - VERSION CORRIGÉE AVEC TYPES STRICTS

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const stopTyping = mutation({
  args: {
    mapId: v.id("affinityMaps"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_user_map", q => 
        q.eq("userId", identity.subject).eq("mapId", args.mapId)
      )
      .first();

    if (existing) {
      console.log("🛑 stopTyping - Mise à jour indicateur existant:", {
        userId: identity.subject,
        userName: existing.userName,
        mapId: args.mapId
      });
      
      await ctx.db.patch(existing._id, {
        isTyping: false,
        lastActivity: Date.now(),
      });
    } else {
      console.log("ℹ️ stopTyping - Aucun indicateur trouvé pour:", {
        userId: identity.subject,
        mapId: args.mapId
      });
    }
  },
});

export const cleanupOldIndicators = mutation({
  args: {
    mapId: v.id("affinityMaps"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // 🎯 NETTOYER LES INDICATEURS ANCIENS (plus de 10 secondes)
    const tenSecondsAgo = Date.now() - 10000;
    const oldIndicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_last_activity", q => q.lt("lastActivity", tenSecondsAgo))
      .collect();

    console.log("🧹 cleanupOldIndicators - Indicateurs à nettoyer:", {
      totalIndicators: oldIndicators.length,
      mapId: args.mapId,
      cutoffTime: new Date(tenSecondsAgo).toLocaleTimeString()
    });

    for (const indicator of oldIndicators) {
      console.log("🗑️ Suppression indicateur obsolète:", {
        userName: indicator.userName,
        lastActivity: new Date(indicator.lastActivity).toLocaleTimeString(),
        isTyping: indicator.isTyping
      });
      await ctx.db.delete(indicator._id);
    }

    return { deleted: oldIndicators.length };
  },
});

// convex/typingIndicators.ts - AVEC LOGS DÉTAILLÉS

export const startTyping = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    groupId: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    console.log("🟢 startTyping mutation appelée:", {
      userId: identity.subject,
      userName: args.userName,
      mapId: args.mapId,
      groupId: args.groupId,
      timestamp: new Date().toLocaleTimeString()
    });

    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_user_map", q => 
        q.eq("userId", identity.subject).eq("mapId", args.mapId)
      )
      .first();

    if (existing) {
      console.log("📝 Mise à jour indicateur existant:", {
        existingId: existing._id,
        previousState: {
          isTyping: existing.isTyping,
          groupId: existing.groupId,
          lastActivity: new Date(existing.lastActivity).toLocaleTimeString()
        },
        newState: {
          isTyping: true,
          groupId: args.groupId,
          lastActivity: new Date().toLocaleTimeString()
        }
      });
      
      await ctx.db.patch(existing._id, {
        groupId: args.groupId,
        isTyping: true,
        lastActivity: Date.now(),
      });
    } else {
      console.log("🆕 Création nouvel indicateur:", {
        userId: identity.subject,
        userName: args.userName,
        mapId: args.mapId,
        groupId: args.groupId
      });
      
      await ctx.db.insert("typingIndicators", {
        mapId: args.mapId,
        groupId: args.groupId,
        userId: identity.subject,
        userName: args.userName,
        isTyping: true,
        lastActivity: Date.now(),
      });
    }

    console.log("✅ startTyping mutation terminée avec succès");
  },
});

export const getTypingUsers = query({
  args: {
    mapId: v.id("affinityMaps"),
    groupId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    console.log("🔍 getTypingUsers query appelée:", {
      mapId: args.mapId,
      groupId: args.groupId,
      currentUser: identity.subject,
      timestamp: new Date().toLocaleTimeString()
    });

    const allIndicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_map_group", q => 
        q.eq("mapId", args.mapId).eq("groupId", args.groupId)
      )
      .collect();

    const now = Date.now();
    const fiveSecondsAgo = now - 5000;
    
    console.log("📊 getTypingUsers - Tous les indicateurs trouvés:", allIndicators.length);
    
    // 🎯 INTERFACE POUR LE LOGGING TYPÉ
    interface IndicatorLog {
      userName: string;
      isRecent: boolean;
      isTyping: boolean;
      isNotCurrentUser: boolean;
      lastActivity: string;
      timeDiff: number;
      isValid: boolean;
    }
    
    const indicatorLogs: IndicatorLog[] = allIndicators.map(indicator => {
      const isRecent = indicator.lastActivity >= fiveSecondsAgo;
      const isTyping = indicator.isTyping;
      const isNotCurrentUser = indicator.userId !== identity.subject;
      const isValid = isRecent && isTyping && isNotCurrentUser;
      
      return {
        userName: indicator.userName,
        isRecent,
        isTyping,
        isNotCurrentUser,
        lastActivity: new Date(indicator.lastActivity).toLocaleTimeString(),
        timeDiff: now - indicator.lastActivity,
        isValid
      };
    });
    
    console.log("👤 Détail des indicateurs:", indicatorLogs);
    
    const validTypingUsers = allIndicators.filter(indicator => {
      const isRecent = indicator.lastActivity >= fiveSecondsAgo;
      const isTyping = indicator.isTyping;
      const isNotCurrentUser = indicator.userId !== identity.subject;
      
      return isRecent && isTyping && isNotCurrentUser;
    });

    console.log("✅ getTypingUsers - Utilisateurs valides:", {
      totalValid: validTypingUsers.length,
      validUsers: validTypingUsers.map(u => ({
        userName: u.userName,
        lastActivity: new Date(u.lastActivity).toLocaleTimeString()
      }))
    });
    
    return validTypingUsers;
  },
});