// components/AutoClusteringPanel.tsx
"use client";

import { useState } from "react";
import { Brain, Sparkles, Group, Target } from "lucide-react";
import { Insight, AffinityGroup } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface AutoClusteringPanelProps {
  insights: Insight[];
  onClustersGenerated: (clusters: AffinityGroup[]) => void;
  existingGroups: AffinityGroup[];
}

type ClusteringAlgorithm = 'semantic' | 'thematic' | 'hybrid';

export function AutoClusteringPanel({ 
  insights, 
  onClustersGenerated, 
  existingGroups 
}: AutoClusteringPanelProps) {
  const [isClustering, setIsClustering] = useState(false);
  const [sensitivity, setSensitivity] = useState([0.7]);
  const [algorithm, setAlgorithm] = useState<ClusteringAlgorithm>('hybrid');
  
  const handleAutoCluster = async () => {
    if (insights.length < 3) {
      toast.error("Need at least 3 insights for clustering");
      return;
    }

    setIsClustering(true);
    
    try {
      // Simulation du clustering - À REMPLACER par l'implémentation réelle
      const mockClusters = generateMockClusters(insights, sensitivity[0]);
      
      // Fusionner avec les groupes existants
      const mergedGroups = mergeClustersWithExisting(mockClusters, existingGroups);
      
      onClustersGenerated(mergedGroups);
      toast.success(`Generated ${mockClusters.length} clusters automatically`);
    } catch (error) {
      toast.error("Clustering failed");
      console.error(error);
    } finally {
      setIsClustering(false);
    }
  };

  const generateMockClusters = (insights: Insight[], sensitivity: number): AffinityGroup[] => {
    // Logique de clustering simulée
    const clusterCount = Math.max(2, Math.floor(insights.length * sensitivity / 3));
    
    return Array.from({ length: clusterCount }, (_, i) => ({
      id: `auto-cluster-${Date.now()}-${i}`,
      title: `Theme ${i + 1}`,
      color: getClusterColor(i),
      position: {
        x: Math.random() * 800,
        y: Math.random() * 600
      },
      insightIds: insights
        .filter((_, index) => index % clusterCount === i)
        .map(insight => insight.id)
    })).filter(group => group.insightIds.length > 0);
  };

  const getClusterColor = (index: number): string => {
    const colors = [
      "#F59E0B", "#EF4444", "#10B981", "#3B82F6", 
      "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"
    ];
    return colors[index % colors.length];
  };

  const mergeClustersWithExisting = (
    newClusters: AffinityGroup[], 
    existing: AffinityGroup[]
  ): AffinityGroup[] => {
    // Éviter les doublons d'insights
    const usedInsightIds = new Set(existing.flatMap(g => g.insightIds));
    const filteredClusters = newClusters.map(cluster => ({
      ...cluster,
      insightIds: cluster.insightIds.filter(id => !usedInsightIds.has(id))
    })).filter(cluster => cluster.insightIds.length > 0);
    
    return [...existing, ...filteredClusters];
  };

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Auto Clustering
        </CardTitle>
        <CardDescription>
          Automatically group similar insights using AI
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Algorithm Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Algorithm</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'semantic', label: 'Semantic', icon: Sparkles },
              { value: 'thematic', label: 'Thematic', icon: Target },
              { value: 'hybrid', label: 'Hybrid', icon: Group }
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setAlgorithm(value as ClusteringAlgorithm)}
                className={`p-2 border rounded-lg text-xs transition-colors ${
                  algorithm === value
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 mx-auto mb-1" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sensitivity Slider */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium">Sensitivity</label>
            <span className="text-sm text-gray-500">
              {sensitivity[0] > 0.8 ? 'High' : sensitivity[0] > 0.5 ? 'Medium' : 'Low'}
            </span>
          </div>
          <Slider
            value={sensitivity}
            onValueChange={setSensitivity}
            max={1}
            min={0.1}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-semibold text-gray-900">{insights.length}</div>
            <div className="text-gray-500">Insights</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-semibold text-gray-900">{existingGroups.length}</div>
            <div className="text-gray-500">Groups</div>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleAutoCluster}
          disabled={isClustering || insights.length < 3}
          className="w-full"
        >
          {isClustering ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Clustering...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Clusters
            </>
          )}
        </Button>

        {insights.length < 3 && (
          <p className="text-xs text-gray-500 text-center">
            Need at least 3 insights for clustering
          </p>
        )}
      </CardContent>
    </Card>
  );
}