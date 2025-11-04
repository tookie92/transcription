"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GroupConnection, AffinityGroup } from "@/types";

interface ConnectionAnalyticsProps {
  groups: AffinityGroup[];
  connections: GroupConnection[];
}

interface ConnectedGroupStats {
  name: string;
  connections: number;
  color: string;
}

export function ConnectionAnalytics({ groups, connections }: ConnectionAnalyticsProps) {
  // Métriques principales
  const metrics = useMemo(() => {
    const totalConnections = connections.length;
    const connectedGroups = new Set(
      connections.flatMap(conn => [conn.sourceGroupId, conn.targetGroupId])
    ).size;
    
    const typeDistribution = connections.reduce((acc, conn) => {
      acc[conn.type] = (acc[conn.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageStrength = connections.length > 0 
      ? connections.reduce((sum, conn) => sum + (conn.strength || 3), 0) / connections.length
      : 0;

    return {
      totalConnections,
      connectedGroups,
      connectionRate: groups.length > 0 ? (connectedGroups / groups.length) * 100 : 0,
      typeDistribution,
      averageStrength: Math.round(averageStrength * 10) / 10,
    };
  }, [connections, groups]);

  // Groupes les plus connectés
  const mostConnectedGroups = useMemo((): ConnectedGroupStats[] => {
    const groupConnections = groups.map(group => {
      const connectionCount = connections.filter(
        conn => conn.sourceGroupId === group.id || conn.targetGroupId === group.id
      ).length;
      
      return {
        name: group.title,
        connections: connectionCount,
        color: group.color,
      };
    }).sort((a, b) => b.connections - a.connections).slice(0, 5);

    return groupConnections;
  }, [groups, connections]);

  // Distribution des types pour les barres simples
  const typeDistributionData = useMemo(() => {
    return Object.entries(metrics.typeDistribution).map(([type, count]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      count,
      percentage: (count / metrics.totalConnections) * 100,
      color: {
        'related': '#8B5CF6',
        'hierarchy': '#3B82F6', 
        'dependency': '#10B981',
        'contradiction': '#EF4444'
      }[type] || '#6B7280'
    }));
  }, [metrics.typeDistribution, metrics.totalConnections]);

  // Distribution de force
  const strengthDistribution = useMemo(() => {
    const distribution = [0, 0, 0, 0, 0]; // 1-5
    connections.forEach(conn => {
      const strength = conn.strength || 3;
      if (strength >= 1 && strength <= 5) {
        distribution[strength - 1]++;
      }
    });
    
    return distribution.map((count, index) => ({
      strength: index + 1,
      count,
      percentage: (count / metrics.totalConnections) * 100,
      stars: '★'.repeat(index + 1)
    }));
  }, [connections, metrics.totalConnections]);

  return (
    <div className="space-y-6 p-6">
      {/* Métriques principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalConnections}</div>
            <p className="text-xs text-gray-500">Across all groups</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Connected Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.connectedGroups}</div>
            <p className="text-xs text-gray-500">
              {Math.round(metrics.connectionRate)}% of total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Strength</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {'★'.repeat(Math.round(metrics.averageStrength))}
            </div>
            <p className="text-xs text-gray-500">
              {metrics.averageStrength}/5 average
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Connection Density</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groups.length > 0 ? (metrics.totalConnections / groups.length).toFixed(1) : '0'}
            </div>
            <p className="text-xs text-gray-500">Per group</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution des types - VERSION SIMPLIFIÉE */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Types</CardTitle>
            <CardDescription>Distribution of relationship types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {typeDistributionData.map((item) => (
                <div key={item.type} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{item.type}</span>
                    <span className="text-gray-500">
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress 
                    value={item.percentage} 
                    className="h-2"
                    style={{
                      backgroundColor: `${item.color}20`,
                      ['--progress-background' as string]: item.color
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Groupes les plus connectés */}
        <Card>
          <CardHeader>
            <CardTitle>Most Connected Groups</CardTitle>
            <CardDescription>Groups with most relationships</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mostConnectedGroups.map((group, index) => (
                <div key={group.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="font-medium text-sm">{group.name}</span>
                  </div>
                  <Badge variant="secondary">{group.connections} connections</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Distribution de force - VERSION SIMPLIFIÉE */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Strength</CardTitle>
            <CardDescription>Distribution of connection strengths</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {strengthDistribution.map((item) => (
                <div key={item.strength} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-yellow-600">{item.stars}</span>
                    <span className="text-gray-500">
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress 
                    value={item.percentage} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Insights patterns */}
        <Card>
          <CardHeader>
            <CardTitle>Pattern Insights</CardTitle>
            <CardDescription>Automated pattern detection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {connections.length >= 5 && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="font-medium text-blue-800">Cluster Detected</div>
                  <div className="text-blue-600 text-xs mt-1">
                    {Math.round(metrics.connectionRate)}% of groups are interconnected
                  </div>
                </div>
              )}
              
              {metrics.typeDistribution.contradiction > 0 && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="font-medium text-red-800">Contradictions Found</div>
                  <div className="text-red-600 text-xs mt-1">
                    {metrics.typeDistribution.contradiction} conflicting relationships identified
                  </div>
                </div>
              )}
              
              {metrics.typeDistribution.hierarchy > 0 && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="font-medium text-purple-800">Hierarchy Structure</div>
                  <div className="text-purple-600 text-xs mt-1">
                    {metrics.typeDistribution.hierarchy} parent-child relationships
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}