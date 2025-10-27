"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { Id } from "@/convex/_generated/dataModel";
import { AffinityGroup, Insight } from "@/types";
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

  // Dans AffinityMapWorkspace.tsx, ajouter :
const updateGroupTitle = useMutation(api.affinityMaps.updateGroupTitle);

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

const removeGroup = useMutation(api.affinityMaps.removeGroup);
const removeInsightFromGroup = useMutation(api.affinityMaps.removeInsightFromGroup);

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



  // Ajouter cette mutation pour les insights indépendants
const createIndependentInsight = useMutation(api.affinityMaps.createIndependentInsight);

const handleIndependentInsightCreate = async (position: { x: number; y: number }) => {
  if (!affinityMap) return;
  
  try {
    await createIndependentInsight({
      mapId: affinityMap._id,
      position,
      text: "New insight...", // L'user éditera après
      type: "insight" as const
    });
  } catch (error) {
    console.error("Failed to create independent insight:", error);
  }
};

  // État local
  const [isSilentMode, setIsSilentMode] = useState(true);

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

  // Handlers pour le canvas
  const handleGroupCreate = async (position: { x: number; y: number }) => {
    if (!affinityMap) return;
    
    try {
      await addGroup({
        mapId: affinityMap._id,
        title: "New Theme",
        color: "#F59E0B", // Orange par défaut
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
  if (!affinityMap) {
    console.error('No affinity map found');
    return;
  }
  
  console.log('🔄 Adding insight to group:', { insightId, groupId, mapId: affinityMap._id });
  
  try {
    await addInsightToGroup({
      mapId: affinityMap._id,
      groupId,
      insightId: insightId as Id<"insights">
    });
    console.log('✅ Insight added to group successfully');
  } catch (error) {
    console.error('❌ Failed to add insight to group:', error);
  }
};

// Ajouter la mutation
const createManualInsight = useMutation(api.affinityMaps.createManualInsight);

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

const reorderInsights = useMutation(api.affinityMaps.reorderInsights);

const handleInsightReorder = async (groupId: string, insightIds: string[]) => {
  if (!affinityMap) return;
  
  try {
    await reorderInsights({
      mapId: affinityMap._id,
      groupId,
      insightIds: insightIds as Id<"insights">[]
    });
  } catch (error) {
    console.error("Failed to reorder insights:", error);
  }
};



  // Adapter les données pour le canvas - CORRIGÉ
  const groups = affinityMap?.groups || [];
const insights = insightsData?.map(insight => ({
  id: insight._id,
  interviewId: insight.interviewId, // ← Peut être undefined maintenant
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
          // onIndependentInsightCreate={handleIndependentInsightCreate}
          onManualInsightCreate={handleManualInsightCreate}
        />

        {/* Insights Panel */}
        {/* <div className="absolute right-4 top-4 w-80 bg-white rounded-lg shadow-lg border z-20">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Available Insights</h3>
            <p className="text-sm text-gray-500">
              {insightsData?.length || 0} insights to organize
            </p>
          </div>
          <div className="p-2 max-h-96 overflow-y-auto">
            {insightsData?.map(insight => (
              <div 
                key={insight._id}
                className="p-3 mb-2 bg-white border rounded-lg cursor-move hover:shadow-md"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', insight._id);
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs px-2 py-1 rounded ${
                    insight.type === 'pain-point' ? 'bg-red-100 text-red-800' :
                    insight.type === 'quote' ? 'bg-blue-100 text-blue-800' :
                    insight.type === 'insight' ? 'bg-purple-100 text-purple-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {insight.type}
                  </span>
                </div>
                <p className="text-sm">{insight.text}</p>
              </div>
            ))}
          </div>
        </div> */}
      </div>

      {/* Status Bar */}
      <footer className="px-4 py-2 bg-white border-t text-sm text-gray-600 flex justify-between">
        <div>
          {affinityMap ? (
            <span>{affinityMap.groups.length} groups, {insightsData?.length || 0} insights</span>
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