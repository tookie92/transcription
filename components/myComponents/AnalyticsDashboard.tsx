// components/AnalyticsDashboard.tsx - VERSION AMÉLIORÉE
"use client";

import { useMemo } from "react";
import { BarChart3, TrendingUp, Users, Clock, Target, PieChart, BarChart, X } from "lucide-react";
import { AffinityGroup, Insight } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface AnalyticsDashboardProps {
  groups: AffinityGroup[];
  insights: Insight[];
  projectName: string;
  onClose?: () => void;
}

export function AnalyticsDashboard({ groups, insights, projectName, onClose }: AnalyticsDashboardProps) {
  const metrics = useMemo(() => {
    const totalInsights = insights.length;
    const groupedInsights = groups.reduce((sum, group) => sum + group.insightIds.length, 0);
    const ungroupedInsights = totalInsights - groupedInsights;
    
    const insightTypes = insights.reduce((acc, insight) => {
      acc[insight.type] = (acc[insight.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgGroupSize = groups.length > 0 ? groupedInsights / groups.length : 0;

    const groupSizes = groups.reduce((acc, group) => {
      const size = group.insightIds.length;
      if (size <= 3) acc.small++;
      else if (size <= 7) acc.medium++;
      else acc.large++;
      return acc;
    }, { small: 0, medium: 0, large: 0 });

    const popularGroups = [...groups]
      .sort((a, b) => b.insightIds.length - a.insightIds.length)
      .slice(0, 5);

    return {
      totalInsights,
      groupedInsights,
      ungroupedInsights,
      completionRate: totalInsights > 0 ? (groupedInsights / totalInsights) * 100 : 0,
      insightTypes,
      avgGroupSize,
      groupSizes,
      groupCount: groups.length,
      popularGroups
    };
  }, [groups, insights]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header avec bouton fermer */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Analytics Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">{projectName}</p>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="insights" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Insights
            </TabsTrigger>
            <TabsTrigger 
              value="groups" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Groups
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 m-0">
            {/* KPI Cards - Plus espacées */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">Total Insights</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">{metrics.totalInsights}</p>
                    </div>
                    <Target className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-900">Organization</p>
                      <p className="text-2xl font-bold text-green-900 mt-1">{metrics.completionRate.toFixed(0)}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-900">Theme Groups</p>
                      <p className="text-2xl font-bold text-purple-900 mt-1">{metrics.groupCount}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-900">Ungrouped</p>
                      <p className="text-2xl font-bold text-orange-900 mt-1">{metrics.ungroupedInsights}</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PieChart className="w-5 h-5" />
                  Organization Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium text-green-700">Grouped Insights</span>
                      <p className="text-sm text-gray-600">Successfully organized</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-green-700">{metrics.groupedInsights}</span>
                      <p className="text-sm text-gray-600">{metrics.completionRate.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-green-500 h-4 rounded-full transition-all duration-500" 
                      style={{ width: `${metrics.completionRate}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium text-orange-700">Ungrouped Insights</span>
                      <p className="text-sm text-gray-600">Waiting for organization</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-orange-700">{metrics.ungroupedInsights}</span>
                      <p className="text-sm text-gray-600">{(100 - metrics.completionRate).toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-orange-500 h-4 rounded-full transition-all duration-500" 
                      style={{ width: `${100 - metrics.completionRate}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Group Size Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart className="w-5 h-5" />
                  Group Size Distribution
                </CardTitle>
                <CardDescription>How insights are distributed across groups</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { 
                    label: 'Small Groups', 
                    sublabel: '1-3 insights', 
                    count: metrics.groupSizes.small, 
                    color: 'bg-green-500',
                    textColor: 'text-green-700'
                  },
                  { 
                    label: 'Medium Groups', 
                    sublabel: '4-7 insights', 
                    count: metrics.groupSizes.medium, 
                    color: 'bg-yellow-500',
                    textColor: 'text-yellow-700'
                  },
                  { 
                    label: 'Large Groups', 
                    sublabel: '8+ insights', 
                    count: metrics.groupSizes.large, 
                    color: 'bg-red-500',
                    textColor: 'text-red-700'
                  }
                ].map(({ label, sublabel, count, color, textColor }) => (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className={`font-medium ${textColor}`}>{label}</span>
                        <p className="text-sm text-gray-600">{sublabel}</p>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${textColor}`}>{count}</span>
                        <p className="text-sm text-gray-600">
                          {metrics.groupCount > 0 ? Math.round((count / metrics.groupCount) * 100) : 0}%
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${color} transition-all duration-500`}
                        style={{ 
                          width: `${metrics.groupCount > 0 ? (count / metrics.groupCount) * 100 : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6 m-0">
            <Card>
              <CardHeader>
                <CardTitle>Insight Types Analysis</CardTitle>
                <CardDescription>Distribution across different insight categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics.insightTypes).map(([type, count]) => {
                    const percentage = (count / metrics.totalInsights) * 100;
                    const colorMap = {
                      'pain-point': 'bg-red-500 text-red-700',
                      'quote': 'bg-blue-500 text-blue-700',
                      'insight': 'bg-purple-500 text-purple-700',
                      'follow-up': 'bg-green-500 text-green-700',
                      'custom': 'bg-gray-500 text-gray-700'
                    };
                    
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${colorMap[type as keyof typeof colorMap]?.split(' ')[0] || 'bg-gray-500'}`} />
                            <span className="font-medium capitalize">{type.replace('-', ' ')}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold">{count}</span>
                            <span className="text-sm text-gray-600 ml-2">({percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full ${colorMap[type as keyof typeof colorMap]?.split(' ')[0] || 'bg-gray-500'} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-6 m-0">
            <Card>
              <CardHeader>
                <CardTitle>Top Groups by Size</CardTitle>
                <CardDescription>Most populated theme groups</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.popularGroups.map((group, index) => (
                    <div 
                      key={group.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: group.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{group.title}</div>
                          <div className="text-sm text-gray-600">
                            {group.insightIds.length} insight{group.insightIds.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="flex-shrink-0">
                        #{index + 1}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recommendations Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>AI Recommendations</CardTitle>
            <CardDescription>Actionable insights to improve your analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.ungroupedInsights > 10 && (
                <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Target className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-800 text-lg">Focus on Ungrouped Insights</p>
                    <p className="text-yellow-700 mt-1">
                      You have <strong>{metrics.ungroupedInsights} ungrouped insights</strong>. 
                      Consider using the auto-clustering feature or reviewing these insights to identify new patterns.
                    </p>
                  </div>
                </div>
              )}
              
              {metrics.avgGroupSize > 8 && (
                <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Users className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800 text-lg">Split Large Groups</p>
                    <p className="text-blue-700 mt-1">
                      Your average group size is <strong>{metrics.avgGroupSize.toFixed(1)} insights</strong>. 
                      Large groups might contain multiple themes - consider splitting them for better clarity.
                    </p>
                  </div>
                </div>
              )}
              
              {metrics.groupSizes.small > metrics.groupCount * 0.6 && (
                <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <TrendingUp className="w-6 h-6 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-purple-800 text-lg">Merge Small Groups</p>
                    <p className="text-purple-700 mt-1">
                      <strong>{metrics.groupSizes.small} of your {metrics.groupCount} groups</strong> are small (1-3 insights). 
                      Consider merging related small groups to form stronger thematic clusters.
                    </p>
                  </div>
                </div>
              )}

              {metrics.completionRate > 80 && (
                <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <BarChart3 className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-800 text-lg">Great Progress! 🎉</p>
                    <p className="text-green-700 mt-1">
                      You{`'`}ve organized <strong>{metrics.completionRate.toFixed(1)}% of your insights</strong>. 
                      Consider moving to the voting phase to prioritize the most important themes.
                    </p>
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