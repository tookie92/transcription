// components/AnalyticsDashboard.tsx
"use client";

import { useMemo } from "react";
import { BarChart3, TrendingUp, Users, Clock, Target } from "lucide-react";
import { AffinityGroup, Insight } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AnalyticsDashboardProps {
  groups: AffinityGroup[];
  insights: Insight[];
  projectName: string;
}

export function AnalyticsDashboard({ groups, insights, projectName }: AnalyticsDashboardProps) {
  const metrics = useMemo(() => {
    const totalInsights = insights.length;
    const groupedInsights = groups.reduce((sum, group) => sum + group.insightIds.length, 0);
    const ungroupedInsights = totalInsights - groupedInsights;
    
    // Distribution par type d'insight
    const insightTypes = insights.reduce((acc, insight) => {
      acc[insight.type] = (acc[insight.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Taille moyenne des groupes
    const avgGroupSize = groups.length > 0 ? groupedInsights / groups.length : 0;

    // Groupes par taille
    const groupSizes = groups.reduce((acc, group) => {
      const size = group.insightIds.length;
      if (size <= 3) acc.small++;
      else if (size <= 7) acc.medium++;
      else acc.large++;
      return acc;
    }, { small: 0, medium: 0, large: 0 });

    return {
      totalInsights,
      groupedInsights,
      ungroupedInsights,
      completionRate: totalInsights > 0 ? (groupedInsights / totalInsights) * 100 : 0,
      insightTypes,
      avgGroupSize,
      groupSizes,
      groupCount: groups.length
    };
  }, [groups, insights]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Project: {projectName}</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <BarChart3 className="w-4 h-4 mr-1" />
          Real-time Analytics
        </Badge>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Insights</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalInsights}</div>
            <p className="text-xs text-muted-foreground">
              Across all interviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organization Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.groupedInsights} of {metrics.totalInsights} grouped
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Theme Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.groupCount}</div>
            <p className="text-xs text-muted-foreground">
              Average {metrics.avgGroupSize.toFixed(1)} insights/group
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analysis Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">~2.5h</div>
            <p className="text-xs text-muted-foreground">
              Estimated completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insight Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Insight Types</CardTitle>
            <CardDescription>Distribution across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.insightTypes).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm font-medium capitalize">{type.replace('-', ' ')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ 
                          width: `${(count / metrics.totalInsights) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Group Size Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Group Sizes</CardTitle>
            <CardDescription>Distribution of insights per group</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Small (1-3 insights)', count: metrics.groupSizes.small, color: 'bg-green-500' },
                { label: 'Medium (4-7 insights)', count: metrics.groupSizes.medium, color: 'bg-yellow-500' },
                { label: 'Large (8+ insights)', count: metrics.groupSizes.large, color: 'bg-red-500' }
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${color}`}
                        style={{ 
                          width: `${(count / metrics.groupCount) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>AI Recommendations</CardTitle>
          <CardDescription>Suggestions to improve your analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.ungroupedInsights > 10 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <Target className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Focus on Ungrouped Insights</p>
                  <p className="text-sm text-yellow-700">
                    You have {metrics.ungroupedInsights} insights that {`haven't`} been grouped yet. 
                    Consider using auto-clustering to identify patterns.
                  </p>
                </div>
              </div>
            )}
            
            {metrics.avgGroupSize > 8 && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">Consider Splitting Large Groups</p>
                  <p className="text-sm text-blue-700">
                    Some groups are quite large (avg: {metrics.avgGroupSize.toFixed(1)} insights). 
                    Large groups might contain multiple themes that should be separated.
                  </p>
                </div>
              </div>
            )}
            
            {metrics.groupSizes.small > metrics.groupCount * 0.6 && (
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-purple-800">Merge Small Groups</p>
                  <p className="text-sm text-purple-700">
                    Many groups have only 1-3 insights. Consider merging related small groups 
                    to form stronger thematic clusters.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}