// types/analytics.ts

export interface ConnectionMetrics {
  totalConnections: number;
  connectedGroups: number;
  connectionRate: number;
  typeDistribution: Record<string, number>;
  averageStrength: number;
  density: number;
}

export interface GroupConnectionStats {
  groupId: string;
  title: string;
  color: string;
  connectionCount: number;
  insightsCount: number;
}

export interface ClusterAnalysis {
  groupIds: string[];
  size: number;
  connectionCount: number;
  centroid: { x: number; y: number };
}

export interface ConnectionRecommendation {
  sourceGroupId: string;
  targetGroupId: string;
  score: number;
  reason: string;
  suggestedType: "related" | "hierarchy" | "dependency" | "contradiction";
}

export interface AnalyticsData {
  metrics: ConnectionMetrics;
  mostConnectedGroups: GroupConnectionStats[];
  clusters: ClusterAnalysis[];
  recommendations: ConnectionRecommendation[];
}

export interface SavedAnalytics {
  mapId: string;
  metrics: ConnectionMetrics;
  clusters: ClusterAnalysis[];
  recommendations: ConnectionRecommendation[];
  generatedAt: number;
  expiresAt: number;
}