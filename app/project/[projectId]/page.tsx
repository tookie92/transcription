"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProjectContent } from "@/components/myComponents/ProjectContent";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface ProjectPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const router = useRouter();
  const projectIdPromise = params;
  const [projectId, setProjectId] = useState<string>("");

  const project = useQuery(api.projects.getById, {
    projectId: projectId as Id<"projects">,
  });

  useEffect(() => {
    void projectIdPromise.then(({ projectId: id }) => setProjectId(id));
  }, [projectIdPromise]);

  useEffect(() => {
    if (project === null) {
      router.push("/project");
    }
  }, [project, router]);

  if (!projectId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background kit-grain kit-mat">
        <p className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">
          Loading session…
        </p>
      </div>
    );
  }

  if (project === null) {
    return null;
  }

  return (
    <div className="min-h-dvh w-full bg-background text-foreground kit-grain kit-mat">
      <header className="sticky top-0 z-50 border-b border-border bg-background px-5 lg:px-12">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 py-3">
          <button
            type="button"
            onClick={() => router.push("/project")}
            className="flex min-w-0 cursor-pointer items-center gap-5"
          >
            <Image
              height={44}
              width={132}
              src="/logo.svg"
              alt="Skripta"
              className="h-9 w-auto"
              priority
            />
            <span className="hidden truncate font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground sm:inline">
              Field kit · session
            </span>
          </button>

          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/project")}
              className="font-mono text-xs uppercase tracking-widest"
            >
              Sessions
            </Button>
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>

      <main className="px-5 py-10 lg:px-12 lg:py-14">
        <div className="mx-auto w-full max-w-[1400px]">
          <ProjectContent projectId={projectId as Id<"projects">} />
        </div>
      </main>
    </div>
  );
}
