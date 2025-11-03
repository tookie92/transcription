"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

import { Id } from "@/convex/_generated/dataModel";
import { AffinityGroup, Insight, GroupConnection } from "@/types";
import { toast } from "sonner";
import AffinityCanvas from "./AffinityCanvas";

interface AffinityMapWorkspaceProps {
  projectId: Id<"projects">;
}

export function AffinityMapWorkspace({ projectId }: AffinityMapWorkspaceProps) {
  const router = useRouter();
  
  // Data
  const project = useQuery(api.projects.getById, { projectId });
  const insightsData = useQuery(api.insights.getByProject, { projectId });
  const affinityMap = useQuery(api.affinityMaps.getCurrent, { projectId });
  
  // 🆕 CONNECTIONS CONVEX
  const connectionsData = useQuery(api.connections.getByMap, {
    mapId: affinityMap?._id as Id<"affinityMaps"> || "" as Id<"affinityMaps">
  });

  // Mutations existantes
  const createAffinityMap = useMutation(api.affinityMaps.create);
  const addGroup = useMutation(api.affinityMaps.addGroup);
  const moveGroup = useMutation(api.affinityMaps.moveGroup);
  const addInsightToGroup = useMutation(api.affinityMaps.addInsightToGroup);
  const updateGroupTitle = useMutation(api.affinityMaps.updateGroupTitle);
  const removeGroup = useMutation(api.affinityMaps.removeGroup);
  const removeInsightFromGroup = useMutation(api.affinityMaps.removeInsightFromGroup);
  const replaceAllGroups = useMutation(api.affinityMaps.replaceAllGroups);
  const createManualInsight = useMutation(api.affinityMaps.createManualInsight);

  // 🆕 MUTATIONS POUR LES CONNECTIONS
  const createConnection = useMutation(api.connections.createConnection);
  const deleteConnection = useMutation(api.connections.deleteConnection);
  const updateConnection = useMutation(api.connections.updateConnection);

  // État local
  const [isSilentMode, setIsSilentMode] = useState(true);

  // 🆕 ADAPTER LES DONNÉES CONNECTIONS POUR L'UI
  const connections: GroupConnection[] = connectionsData?.map(conn => ({
    id: conn._id,
    mapId: conn.mapId,
    sourceGroupId: conn.sourceGroupId,
    targetGroupId: conn.targetGroupId,
    type: conn.type,
    label: conn.label,
    strength: conn.strength,
    createdBy: conn.createdBy,
    createdAt: conn.createdAt,
    updatedAt: conn.updatedAt,
  })) || [];

  
// 🆕 HANDLER POUR CRÉER UNE CONNECTION (version corrigée)
const handleConnectionCreate = useCallback(async (
  sourceId: string, 
  targetId: string, 
  type: GroupConnection['type']
) => {
  if (!affinityMap) {
    toast.error("No affinity map found");
    return;
  }

  // 🎯 Vérifier que ce n'est pas la même source et target
  if (sourceId === targetId) {
    toast.error("Cannot connect a group to itself", {
      description: "Please select a different group to connect to"
    });
    return;
  }

  try {
    await createConnection({
      mapId: affinityMap._id,
      sourceGroupId: sourceId,
      targetGroupId: targetId,
      type: type,
    });

    // 🎯 Récupérer les titres et couleurs pour le toast
    const sourceGroup = affinityMap.groups.find(g => g.id === sourceId);
    const targetGroup = affinityMap.groups.find(g => g.id === targetId);
    
    const typeConfig = {
      'related': { icon: '🔗', description: 'Related connection' },
      'hierarchy': { icon: '📊', description: 'Hierarchy connection' },
      'dependency': { icon: '⚡', description: 'Dependency connection' },
      'contradiction': { icon: '⚠️', description: 'Contradiction connection' },
    }[type];

    toast.success(`${typeConfig.icon} Connection created`, {
      description: `${sourceGroup?.title} → ${targetGroup?.title}\n${typeConfig.description}`,
      duration: 4000,
    });

  } catch (error: unknown) {
    console.error("Failed to create connection:", error);
    
    // 🎯 TOASTS D'ERREUR SPÉCIFIQUES (sans any)
    let errorMessage = "Failed to create connection";
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    if (errorMessage.includes("already exists")) {
      toast.error("Connection already exists", {
        description: "These groups are already connected. Try a different connection type.",
        duration: 5000,
        action: {
          label: "View",
          onClick: () => {
            // TODO: Scroll vers la connection existante
            console.log("Show existing connection");
          },
        },
      });
    } else if (errorMessage.includes("not found")) {
      toast.error("Group not found", {
        description: "One of the groups no longer exists in this map.",
        duration: 4000,
      });
    } else if (errorMessage.includes("too many connections")) {
      toast.error("Too many connections", {
        description: "This group has reached the maximum number of connections (10).",
        duration: 4000,
      });
    } else if (errorMessage.includes("Cannot connect a group to itself")) {
      toast.error("Cannot connect to itself", {
        description: "Please select a different group to connect to.",
        duration: 4000,
      });
    } else {
      toast.error("Connection failed", {
        description: errorMessage,
        duration: 4000,
      });
    }
  }
}, [affinityMap, createConnection]);

// 🆕 CORRECTION DU HANDLER DELETE POUR UTILISER LE BON TYPE
const handleConnectionDelete = useCallback(async (connectionId: Id<"groupConnections">) => {
  try {
    await deleteConnection({ connectionId });
    toast.success("Connection deleted");
  } catch (error: unknown) {
    console.error("Failed to delete connection:", error);
    
    let errorMessage = "Failed to delete connection";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    toast.error("Delete failed", {
      description: errorMessage,
    });
  }
}, [deleteConnection]);

// 🆕 CORRECTION DU HANDLER UPDATE POUR UTILISER LE BON TYPE
const handleConnectionUpdate = useCallback(async (
  connectionId: Id<"groupConnections">,
  updates: Partial<GroupConnection>
) => {
  try {
    await updateConnection({
      connectionId,
      updates: {
        type: updates.type,
        label: updates.label,
        strength: updates.strength,
      }
    });
    toast.success("Connection updated");
  } catch (error: unknown) {
    console.error("Failed to update connection:", error);
    
    let errorMessage = "Failed to update connection";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    toast.error("Update failed", {
      description: errorMessage,
    });
  }
}, [updateConnection]);

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

  // Handlers existants pour le canvas (inchangés)
  const handleGroupCreate = async (position: { x: number; y: number }) => {
    if (!affinityMap) return;
    
    try {
      await addGroup({
        mapId: affinityMap._id,
        title: "New Theme",
        color: "#F59E0B",
        position
      });
    } catch (error) {
      console.error("Failed to create group:", error);
    }
  };

  const handleGroupMove = async (groupId: string, position: { x: number; y: number }) => {
    if (!affinityMap) return;
    
    try {
      await moveGroup({
        mapId: affinityMap._id,
        groupId,
        position
      });
    } catch (error) {
      console.error("Failed to move group:", error);
    }
  };

  const handleInsightDrop = async (insightId: string, groupId: string) => {
    if (!affinityMap) return;
    
    try {
      await addInsightToGroup({
        mapId: affinityMap._id,
        groupId,
        insightId: insightId as Id<"insights">
      });
    } catch (error) {
      console.error("Failed to add insight to group:", error);
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
      toast.success("Manual insight created!");
    } catch (error) {
      console.error("Failed to create manual insight:", error);
      toast.error("Failed to create insight");
    }
  };

  const handleGroupTitleUpdate = async (groupId: string, title: string) => {
    if (!affinityMap) return;
    
    try {
      await updateGroupTitle({
        mapId: affinityMap._id,
        groupId,
        title
      });
    } catch (error) {
      console.error("Failed to update group title:", error);
    }
  };

  const handleGroupDelete = async (groupId: string) => {
    if (!affinityMap) return;
    
    try {
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
    
    try {
      await removeInsightFromGroup({
        mapId: affinityMap._id,
        groupId,
        insightId: insightId as Id<"insights">
      });
    } catch (error) {
      console.error("Failed to remove insight from group:", error);
    }
  };

  const handleGroupsReplace = async (newGroups: AffinityGroup[]) => {
    if (!affinityMap) return;
    
    try {
      await replaceAllGroups({
        mapId: affinityMap._id,
        groups: newGroups
      });
    } catch (error) {
      console.error("Failed to replace groups:", error);
      toast.error("Failed to undo/redo");
    }
  };

  // Adapter les données pour le canvas
  const groups = affinityMap?.groups || [];
  const insights = insightsData?.map(insight => ({
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
          {/* Silent Mode Toggle */}
          <button
            onClick={() => setIsSilentMode(!isSilentMode)}
            className={`px-3 py-2 rounded-lg border ${
              isSilentMode 
                ? 'bg-yellow-100 border-yellow-400 text-yellow-800' 
                : 'bg-gray-100 border-gray-300'
            }`}
          >
            {isSilentMode ? '🔇 Silent Mode' : '💬 Discussion Mode'}
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
          onGroupMove={handleGroupMove}
          onGroupCreate={handleGroupCreate}
          onInsightDrop={handleInsightDrop}
          onInsightRemoveFromGroup={handleInsightRemoveFromGroup}
          onGroupDelete={handleGroupDelete}
          onGroupTitleUpdate={handleGroupTitleUpdate}
          onManualInsightCreate={handleManualInsightCreate}
          onGroupsReplace={handleGroupsReplace}
          // 🆕 INTÉGRATION DES CONNECTIONS CONVEX
          connections={connections}
          onConnectionCreate={handleConnectionCreate}
          onConnectionDelete={handleConnectionDelete}
          onConnectionUpdate={handleConnectionUpdate}
        />
      </div>

      {/* Status Bar */}
      <footer className="px-4 py-2 bg-white border-t text-sm text-gray-600 flex justify-between">
        <div>
          {affinityMap ? (
            <span>
              {affinityMap.groups.length} groups, 
              {insightsData?.length || 0} insights,
              {connections.length} connections
            </span>
          ) : (
            <span>Creating affinity map...</span>
          )}
        </div>
        <div>
          {isSilentMode ? '🔇 Drag insights silently to find patterns' : '💬 Discuss and refine groups'}
        </div>
      </footer>
    </div>
  );
}