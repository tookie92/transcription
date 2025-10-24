"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Users, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

interface ProjectContentProps {
  projectId:  Id<"projects">;
}

export function ProjectContent({ projectId }: ProjectContentProps) {
  const router = useRouter();
  
  // Récupérer les données du projet
  const project = useQuery(api.projects.getById, { projectId });
  const interviews = useQuery(api.interviews.getProjectInterviews, { projectId });
  const allProjects = useQuery(api.projects.getUserProjects);

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-2xl font-bold">Project not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600 mt-1">{project.description}</p>
            )}
          </div>
        </div>
        
        <Button onClick={() => router.push("/")} className="gap-2">
          <Plus className="w-4 h-4" />
          New Interview
        </Button>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interviews?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.members.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {new Date(project.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Badge variant={project.isPublic ? "default" : "secondary"}>
              {project.isPublic ? "Public" : "Private"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {project.ownerId === "current-user-id" ? "Owner" : "Member"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interviews List */}
      <Card>
        <CardHeader>
          <CardTitle>Interviews</CardTitle>
          <CardDescription>
            All interviews conducted for this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {interviews && interviews.length > 0 ? (
            <div className="space-y-4">
              {interviews.map((interview) => (
                <Link 
                  key={interview._id} 
                  href={`/project/${projectId}/interview/${interview._id}`}
                  className="block"
                >
                  <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{interview.title}</h3>
                            <p className="text-sm text-gray-500">
                              {Math.floor(interview.duration / 60)}:
                              {String(Math.floor(interview.duration % 60)).padStart(2, '0')} min
                              {interview.topic && ` • ${interview.topic}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="mb-1">
                            {interview.status}
                          </Badge>
                          <p className="text-xs text-gray-500">
                            {new Date(interview.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">No interviews yet</h3>
              <p className="text-gray-500 mb-4">
                Start by uploading your first interview
              </p>
              <Button onClick={() => router.push("/")}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Interview
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}