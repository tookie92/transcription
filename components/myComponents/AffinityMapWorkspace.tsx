// components/AffinityMapWorkspace.tsx - CORRECTION
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { AffinityGroup, Insight } from "@/types";
import { toast } from "sonner";
import AffinityCanvas from "./AffinityCanvas";
import { useAuth, useUser } from "@clerk/nextjs";

// 🆕 IMPORTS POUR L'HISTORIQUE
import { useActivity } from "@/hooks/useActivity";
import { ActivityPanel } from "./ActivityPanel";
import { NotificationBell } from "./NotificationBell";
import { SilentSortingSession } from "./SilentSortingSession"; // 🆕 AJOUTER
import { SilentSortingCommand } from "./SilentSortingCommand";

interface AffinityMapWorkspaceProps {
  projectId: Id<"projects">;
}

export function AffinityMapWorkspace({ projectId }: AffinityMapWorkspaceProps) {
  const router = useRouter();
  
  // Data
  const project = useQuery(api.projects.getById, { projectId });
  const insightsData = useQuery(api.insights.getByProject, { projectId });
  const affinityMap = useQuery(api.affinityMaps.getCurrent, { projectId });
  
  // Mutations
  const createAffinityMap = useMutation(api.affinityMaps.create);
  const addGroup = useMutation(api.affinityMaps.addGroup);
  const moveGroup = useMutation(api.affinityMaps.moveGroup);
  const addInsightToGroup = useMutation(api.affinityMaps.addInsightToGroup);
  const updateGroupTitle = useMutation(api.affinityMaps.updateGroupTitle);
  const removeGroup = useMutation(api.affinityMaps.removeGroup);
  const removeInsightFromGroup = useMutation(api.affinityMaps.removeInsightFromGroup);
  const replaceAllGroups = useMutation(api.affinityMaps.replaceAllGroups);
  const createManualInsight = useMutation(api.affinityMaps.createManualInsight);
  
  const { userId } = useAuth();
  const { user } = useUser();

  // 🆕 ÉTATS POUR L'HISTORIQUE
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [showSilentSorting, setShowSilentSorting] = useState(false); // 🆕 AJOUTER

  // 🆕 INITIALISER LE HOOK D'ACTIVITÉ
  const activity = useActivity();

  const broadcastGroupCreated = useMutation(api.notificationService.broadcastGroupCreated);
  const broadcastCommentAdded = useMutation(api.notificationService.broadcastCommentAdded);
  const broadcastInsightMoved = useMutation(api.notificationService.broadcastInsightMoved);

  // 🆕 CORRECTION : ACTIVITÉS SEULEMENT SI MAP EXISTE
  const activities = useQuery(
    api.activityLog.getActivityForMap, 
    affinityMap ? { 
      mapId: affinityMap._id, 
      limit: 10 
    } : "skip" // 🎯 IMPORTANT : "skip" quand pas de mapId
  );

  // Créer une map automatiquement si elle n'existe pas
  useEffect(() => {
    if (project && !affinityMap) {
      createAffinityMap({
        projectId: projectId as Id<"projects">,
        name: `${project.name} Affinity Map`,
        description: `Affinity map for ${project.name}`
      }).catch(console.error);
    }
  }, [project, affinityMap, projectId, createAffinityMap]);

  // 🆕 HANDLERS AVEC LOGGING D'ACTIVITÉ
  const handleGroupCreate = async (position: { x: number; y: number }) => {
    if (!affinityMap || !user) return;
    
    try {
      const groupId = await addGroup({
        mapId: affinityMap._id,
        title: "New Theme",
        color: "#F59E0B",
        position
      });
      
      // 🆕 LOG ACTIVITÉ
      activity.logGroupCreated(affinityMap._id, groupId, "New Theme");
      
      // 🆕 BROADCAST NOTIFICATION
      await broadcastGroupCreated({
        mapId: affinityMap._id,
        groupId,
        groupTitle: "New Theme",
        createdByUserId: userId!,
        createdByUserName: user.fullName || user.firstName || "Un utilisateur",
      });
      
    } catch (error) {
      console.error("Failed to create group:", error);
    }
  };

  const handleGroupMove = async (groupId: string, position: { x: number; y: number }) => {
    if (!affinityMap) return;
    
    // 🆕 TROUVER LE GROUPE ET SA POSITION ACTUELLE POUR LE LOG
    const group = affinityMap.groups.find(g => g.id === groupId);
    const oldPosition = group?.position;
    
    try {
      await moveGroup({
        mapId: affinityMap._id,
        groupId,
        position
      });
      
      // 🆕 LOG ACTIVITÉ
      if (group && oldPosition) {
        activity.logGroupMoved(
          affinityMap._id,
          groupId,
          group.title,
          oldPosition,
          position
        );
      }
      
    } catch (error) {
      console.error("Failed to move group:", error);
      toast.error("Failed to move group");
    }
  };

  const handleInsightDrop = async (insightId: string, targetGroupId: string) => {
    if (!affinityMap || !user) return;
    
    const targetGroup = affinityMap.groups.find(g => g.id === targetGroupId);
    const sourceGroup = affinityMap.groups.find(g => g.insightIds.includes(insightId));
    
    try {
      await addInsightToGroup({
        mapId: affinityMap._id,
        groupId: targetGroupId,
        insightId: insightId as Id<"insights">
      });
      
      // 🆕 LOG ACTIVITÉ
      if (targetGroup) {
        if (sourceGroup && sourceGroup.id !== targetGroupId) {
          activity.logInsightMoved(
            affinityMap._id,
            sourceGroup.id,
            targetGroupId,
            sourceGroup.title,
            targetGroup.title,
            insightId
          );
          
          // 🆕 BROADCAST NOTIFICATION POUR MOUVEMENT
          await broadcastInsightMoved({
            mapId: affinityMap._id,
            fromGroupId: sourceGroup.id,
            toGroupId: targetGroupId,
            fromGroupTitle: sourceGroup.title,
            toGroupTitle: targetGroup.title,
            movedByUserId: userId!,
            movedByUserName: user.fullName || user.firstName || "Un utilisateur",
          });
        } else {
          activity.logInsightAdded(
            affinityMap._id,
            targetGroupId,
            targetGroup.title,
            insightId
          );
        }
      }
      
    } catch (error) {
      console.error("Failed to add insight to group:", error);
      toast.error("Failed to add insight to group");
    }
  };

  const handleManualInsightCreate = async (text: string, type: Insight['type']) => {
    if (!project) return;
    
    try {
      await createManualInsight({
        projectId: projectId as Id<"projects">,
        text,
        type
      });
      
      // 🆕 NOTE: L'activité sera loggée quand l'insight sera ajouté à un groupe
      toast.success("Manual insight created!");
      
    } catch (error) {
      console.error("Failed to create manual insight:", error);
      toast.error("Failed to create insight");
    }
  };

  const handleGroupTitleUpdate = async (groupId: string, title: string) => {
    if (!affinityMap) return;
    
    // 🆕 TROUVER L'ANCIEN TITRE POUR LE LOG
    const group = affinityMap.groups.find(g => g.id === groupId);
    const oldTitle = group?.title;
    
    try {
      await updateGroupTitle({
        mapId: affinityMap._id,
        groupId,
        title
      });
      
      // 🆕 LOG ACTIVITÉ
      if (oldTitle && oldTitle !== title) {
        activity.logGroupRenamed(
          affinityMap._id,
          groupId,
          oldTitle,
          title
        );
      }
      
    } catch (error) {
      console.error("Failed to update group title:", error);
    }
  };

  const handleGroupDelete = async (groupId: string) => {
    if (!affinityMap) return;
    
    // 🆕 TROUVER LE GROUPE POUR LE LOG
    const group = affinityMap.groups.find(g => g.id === groupId);
    
    try {
      // 🆕 LOG ACTIVITÉ AVANT SUPPRESSION
      if (group) {
        activity.logGroupDeleted(
          affinityMap._id,
          groupId,
          group.title
        );
      }
      
      await removeGroup({
        mapId: affinityMap._id,
        groupId
      });
      
    } catch (error) {
      console.error("Failed to delete group:", error);
    }
  };

  const handleInsightRemoveFromGroup = async (insightId: string, groupId: string) => {
    if (!affinityMap) return;
    
    // 🆕 TROUVER LE GROUPE POUR LE LOG
    const group = affinityMap.groups.find(g => g.id === groupId);
    
    try {
      await removeInsightFromGroup({
        mapId: affinityMap._id,
        groupId,
        insightId: insightId as Id<"insights">
      });
      
      // 🆕 LOG ACTIVITÉ
      if (group) {
        activity.logInsightRemoved(
          affinityMap._id,
          groupId,
          group.title,
          insightId
        );
      }
      
    } catch (error) {
      console.error("Failed to remove insight from group:", error);
    }
  };

  const handleGroupsReplace = async (newGroups: AffinityGroup[]) => {
    if (!affinityMap) return;
    
    try {
      const convexGroups = newGroups.map(group => ({
        ...group,
        insightIds: group.insightIds as string[]
      }));

      await replaceAllGroups({
        mapId: affinityMap._id,
        groups: convexGroups
      });
      
      // 🆕 NOTE: Pas de log spécifique pour undo/redo car chaque action est déjà loggée
      
    } catch (error) {
      console.error("Failed to replace groups:", error);
      toast.error("Failed to undo/redo");
    }
  };

  const groups: AffinityGroup[] = affinityMap?.groups.map(group => ({
    id: group.id,
    title: group.title,
    color: group.color,
    position: group.position,
    insightIds: group.insightIds as string[]
  })) || [];

  const insights: Insight[] = insightsData?.map(insight => ({
    id: insight._id,
    interviewId: insight.interviewId,
    projectId: insight.projectId,
    type: insight.type,
    text: insight.text,
    timestamp: insight.timestamp,
    source: insight.source,
    createdBy: insight.createdBy,
    createdAt: new Date(insight.createdAt).toISOString(),
    tags: insight.tags,
    priority: insight.priority,
  })) || [];

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Project not found</h1>
          <button 
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Bar */}
      <header className="flex items-center justify-between p-4 bg-white border-b shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push(`/project/${projectId}`)}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50"
          >
            ← Back to Project
          </button>
          
          <div>
            <h1 className="text-xl font-bold">
              {affinityMap?.name || "Affinity Map"}
            </h1>
            <p className="text-sm text-gray-600">{project.name}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          {/* 🆕 BELL NOTIFICATIONS */}
          <NotificationBell />
          
          {/* 🆕 BOUTON SILENT SORTING
          <button
            onClick={() => setShowSilentSorting(!showSilentSorting)}
            className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${
              showSilentSorting 
                ? 'bg-orange-100 border-orange-400 text-orange-800' 
                : 'bg-gray-100 border-gray-300'
            }`}
          >
            <span>🔇</span>
            Silent Sorting
          </button> */}

          {/* 🆕 PANEL SILENT SORTING */}
          {affinityMap && userId && (
            <SilentSortingCommand 
              mapId={affinityMap._id} 
              currentUserId={userId} 
            />
          )}

          {/* 🆕 BOUTON ACTIVITÉ */}
          <button
            onClick={() => setShowActivityPanel(!showActivityPanel)}
            className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${
              showActivityPanel 
                ? 'bg-blue-100 border-blue-400 text-blue-800' 
                : 'bg-gray-100 border-gray-300'
            }`}
          >
            <span>📋</span>
            Activity
            {activities && activities.length > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {activities.length}
              </span>
            )}
          </button>

          {/* Export */}
          <button className="px-3 py-2 border rounded-lg hover:bg-gray-50">
            Export
          </button>
        </div>
      </header>

      {/* Main Workspace avec le Canvas */}
      <div className="flex-1 relative bg-white overflow-hidden">
        <AffinityCanvas
          groups={groups}
          insights={insights}
          projectId={projectId}
          projectInfo={project ? {
            name: project.name,
            description: project.description
          } : undefined}
          mapId={affinityMap?._id || ""}
          onGroupMove={handleGroupMove}
          onGroupCreate={handleGroupCreate}
          onInsightDrop={handleInsightDrop}
          onInsightRemoveFromGroup={handleInsightRemoveFromGroup}
          onGroupDelete={handleGroupDelete}
          onGroupTitleUpdate={handleGroupTitleUpdate}
          onManualInsightCreate={handleManualInsightCreate}
          onGroupsReplace={handleGroupsReplace}
        />
        
        
        
        {/* 🆕 PANEL ACTIVITÉ */}
        {showActivityPanel && affinityMap && (
          <ActivityPanel
            mapId={affinityMap._id}
            isOpen={showActivityPanel}
            onClose={() => setShowActivityPanel(false)}
          />
        )}
      </div>

      {/* Status Bar */}
      <footer className="px-4 py-2 bg-white border-t text-sm text-gray-600 flex justify-between">
        <div>
          {affinityMap ? (
            <span>
              {affinityMap.groups.length} groups, 
              {insightsData?.length || 0} insights
            </span>
          ) : (
            <span>Creating affinity map...</span>
          )}
        </div>
        <div>
          Drag insights to groups to organize patterns
        </div>
      </footer>
    </div>
  );
}