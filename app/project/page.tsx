"use client";
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';
import { Bell, RefreshCcwIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react'

const ProjetPage = () => {
  const router = useRouter();

  const projects = useQuery(api.projects.getUserProjects);
  return (
    <div className='min-h-dvh w-full'>
       {projects && (
        <div className="flex flex-col gap-4 items-center justify-center">
          <h1 className="text-3xl font-bold">Your Projects</h1>
          {projects.map(project => (
            <div
              key={project._id}
              className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => router.push(`/project/${project._id}`)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {project.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <Empty className="from-muted/50 to-background h-full bg-linear-to-b from-30%">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bell />
              </EmptyMedia>
              <EmptyTitle>No Notifications</EmptyTitle>
              <EmptyDescription>
                You&apos;re all caught up. New notifications will appear here.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" size="sm">
                <RefreshCcwIcon />
                Refresh
              </Button>
            </EmptyContent>
          </Empty>
          )}
        </div>
      )}
    </div>
  )
}

export default ProjetPage