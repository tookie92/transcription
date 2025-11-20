// hooks/useTyping.ts - VERSION COMPLÈTEMENT CORRIGÉE

"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";

interface UseTypingReturn {
  typingUsers: string[];
  startTyping: () => void;
  stopTyping: () => void;
  isTyping: boolean;
}

export function useTyping(
  mapId: Id<"affinityMaps">, 
  groupId: string, 
  userName: string
): UseTypingReturn {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [localIsTyping, setLocalIsTyping] = useState(false);

  // 🎯 MUTATIONS
  const startTypingMutation = useMutation(api.typingIndicators.startTyping);
  const stopTypingMutation = useMutation(api.typingIndicators.stopTyping);
  const cleanupMutation = useMutation(api.typingIndicators.cleanupOldIndicators);

  // 🎯 QUERY POUR LES UTILISATEURS EN TRAIN D'ÉCRIRE
  const typingData = useQuery(api.typingIndicators.getTypingUsers, {
    mapId,
    groupId,
  });

  // 🆕 CORRECTION : DÉCLARER stopTyping AVANT de l'utiliser
  // 🎯 ARRÊTER LE TYPING - VERSION CORRIGÉE
  const stopTyping = useCallback(async () => {
    console.log("⏹️ stopTyping appelé", { 
      userName, 
      groupId,
      hasTimeout: !!typingTimeoutRef.current,
      localIsTyping 
    });

    // 🆕 Nettoyer le timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
      console.log("🧹 Timeout nettoyé");
    }

    // 🆕 Mettre à jour l'état local seulement si nécessaire
    if (localIsTyping) {
      setLocalIsTyping(false);
      console.log("🔴 Fin du typing - état local mis à jour");
    }

    try {
      await stopTypingMutation({ mapId });
      console.log("✅ stopTyping mutation réussie");
    } catch (error) {
      console.error("❌ Échec de stopTyping mutation:", error);
    }
  }, [mapId, stopTypingMutation, localIsTyping]);

  // 🎯 DÉMARRER LE TYPING - VERSION CORRIGÉE ET OPTIMISÉE
  const startTyping = useCallback(async () => {
    const now = Date.now();
    
    // 🆕 Éviter les appels trop fréquents (seulement toutes les 500ms)
    if (now - lastTypingRef.current < 500) {
      console.log("⏭️ startTyping ignoré (trop fréquent)");
      return;
    }
    
    lastTypingRef.current = now;
    
    // 🆕 Mettre à jour l'état local immédiatement pour un feedback rapide
    if (!localIsTyping) {
      setLocalIsTyping(true);
      console.log("🟢 Début du typing - état local mis à jour");
    }

    console.log("▶️ startTyping appelé", { 
      userName, 
      groupId,
      timeSinceLast: now - lastTypingRef.current
    });

    try {
      await startTypingMutation({
        mapId,
        groupId,
        userName,
      });
      console.log("✅ startTyping mutation réussie");
    } catch (error) {
      console.error("❌ Échec de startTyping mutation:", error);
      setLocalIsTyping(false); // 🆕 Reset en cas d'erreur
    }

    // 🎯 RESET ET CONFIGURATION DU TIMEOUT
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      console.log("🔄 Timeout existant effacé");
    }

    typingTimeoutRef.current = setTimeout(() => {
      console.log("⏰ Timeout - arrêt automatique du typing après 3s");
      stopTyping();
    }, 3000);

  }, [mapId, groupId, userName, startTypingMutation, stopTyping, localIsTyping]);

  // 🆕 CORRECTION : UTILISER useMemo POUR typingUsers
  // 🎯 TRANSFORMER ET FILTRER LES DONNÉES AVEC useMemo
  const typingUsers = useMemo(() => {
    return typingData
      ?.filter(user => {
        const isRecent = Date.now() - user.lastActivity < 5000; // 🎯 Seulement les 5 dernières secondes
        const isTyping = user.isTyping;
        const isNotCurrentUser = user.userName !== userName; // 🎯 Exclure l'utilisateur courant
        
        const isValid = isRecent && isTyping && isNotCurrentUser;
        
        if (isValid) {
          console.log(`👤 ${user.userName} - Typing valide`, {
            isRecent,
            isTyping,
            isNotCurrentUser,
            timeDiff: Date.now() - user.lastActivity
          });
        }
        
        return isValid;
      })
      .map(user => user.userName) || [];
  }, [typingData, userName]); // 🎯 Dépendances stables

  const isTyping = typingUsers.length > 0;

  // 🆕 DEBUG AMÉLIORÉ - LOGS COMPLETS
  useEffect(() => {
    if (typingData) {
      console.log("🔍 useTyping - MISE À JOUR DES DONNÉES:", {
        mapId: mapId,
        groupId: groupId,
        currentUser: userName,
        totalIndicators: typingData.length,
        indicators: typingData.map(t => ({
          userName: t.userName,
          isTyping: t.isTyping,
          lastActivity: new Date(t.lastActivity).toLocaleTimeString(),
          isRecent: Date.now() - t.lastActivity < 5000,
          timeDiff: Date.now() - t.lastActivity
        })),
        filteredTypingUsers: typingUsers, // 🎯 Utilise la version memoized
        localIsTyping
      });
    } else {
      console.log("🔍 useTyping - Aucune donnée typingData");
    }
  }, [typingData, mapId, groupId, userName, localIsTyping, typingUsers]); // 🎯 Ajout de typingUsers aux dépendances

  // 🎯 NETTOYAGE PÉRIODIQUE DES INDICATEURS OBSOLÈTES
  useEffect(() => {
    console.log("🔄 Mise en place du nettoyage périodique");

    cleanupIntervalRef.current = setInterval(() => {
      console.log("🧹 Nettoyage périodique des indicateurs de typing");
      cleanupMutation({ mapId })
        .then(result => {
          console.log(`✅ Nettoyage réussi: ${result?.deleted || 0} indicateurs supprimés`);
        })
        .catch(error => {
          console.error("❌ Échec du nettoyage:", error);
        });
    }, 30000); // 🎯 Toutes les 30 secondes

    return () => {
      if (cleanupIntervalRef.current) {
        console.log("🧹 Arrêt du nettoyage périodique");
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }
    };
  }, [mapId, cleanupMutation]);

  // 🎯 NETTOYAGE À LA DÉMONTAGE DU COMPOSANT
  useEffect(() => {
    return () => {
      console.log("🧹 Nettoyage du hook useTyping (démontage)");
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }
      
      // 🆕 S'assurer d'arrêter le typing à la fermeture
      stopTyping();
    };
  }, [stopTyping]);

  // 🆕 LOG FINAL POUR CONFIRMER L'ÉTAT
  useEffect(() => {
    console.log("🎯 useTyping - ÉTAT FINAL:", {
      typingUsers,
      isTyping,
      localIsTyping,
      hasData: !!typingData,
      dataLength: typingData?.length || 0
    });
  }, [typingUsers, isTyping, localIsTyping, typingData]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
    isTyping,
  };
}