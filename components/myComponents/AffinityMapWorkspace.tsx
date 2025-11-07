"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

import { Id } from "@/convex/_generated/dataModel";
import { AffinityGroup, Insight } from "@/types"; // ← Utiliser les types importés
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

  // État local
  const [isSilentMode, setIsSilentMode] = useState(true);
    const [optimisticPositions, setOptimisticPositions] = useState<Map<string, {x: number, y: number}>>(new Map());



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

  // Handlers
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

// 🆕 MISE À JOUR DE LA MUTATION moveGroup POUR SYNC RAPIDE

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
    toast.error("Failed to move group");
  }
};
  // Les groupes viennent directement de la query Convex
  const groups: AffinityGroup[] = affinityMap?.groups.map(group => ({
    id: group.id,
    title: group.title,
    color: group.color,
    position: group.position,
    insightIds: group.insightIds as string[]
  })) || [];
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

  // 🛠️ CORRECTION : Utiliser le type importé pour onGroupsReplace
  const handleGroupsReplace = async (newGroups: AffinityGroup[]) => {
    if (!affinityMap) return;
    
    try {
      // Convertir les groupes pour correspondre au schema Convex
      const convexGroups = newGroups.map(group => ({
        ...group,
        insightIds: group.insightIds as string[] // ← S'assurer que c'est string[]
      }));

      await replaceAllGroups({
        mapId: affinityMap._id,
        groups: convexGroups
      });
    } catch (error) {
      console.error("Failed to replace groups:", error);
      toast.error("Failed to undo/redo");
    }
  };



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
          projectId={projectId}
          mapId={affinityMap?._id || ""}
          onGroupMove={handleGroupMove}
          onGroupCreate={handleGroupCreate}
          onInsightDrop={handleInsightDrop}
          onInsightRemoveFromGroup={handleInsightRemoveFromGroup}
          onGroupDelete={handleGroupDelete}
          onGroupTitleUpdate={handleGroupTitleUpdate}
          onManualInsightCreate={handleManualInsightCreate}
          onGroupsReplace={handleGroupsReplace} // ← Maintenant compatible
        />
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
          {isSilentMode ? '🔇 Drag insights silently to find patterns' : '💬 Discuss and refine groups'}
        </div>
      </footer>
    </div>
  );
}