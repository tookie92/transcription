"use client";

import { useCurrentProject } from '@/hooks/useCurrentProject';
import { useEffect } from 'react';
import MediaManager from "@/components/myComponents/MediaManager";
import TranscriptionManager from "@/components/myComponents/TranscriptionManager";
import { ClerkLoaded, SignedIn, SignedOut } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { currentProjectId } = useCurrentProject();
  const route = useRouter()

  // Redirection automatique si projet sélectionné ← OPTIONNEL
  useEffect(() => {
    if (currentProjectId) {
      // Tu peux choisir de rediriger ou non
      // router.push(`/project/${currentProjectId}`);
    }
  }, [currentProjectId]);

  return (
    <section className='py-24 h-screen w-full flex items-center justify-center '>
      <div className='container max-w-7xl px-4'>
        <div className='flex flex-col items-center justify-center w-full '>
          <h1 className='text-5xl font-extrabold tracking-tight sm:text-7xl text-myGreen-500'>
            Transkripschon
          </h1>
          <p className='mt-1 ml-3'>made for our interview(no need to comment about the name of the app 🤪)</p>
        </div>
        
       <div className="flex">
        <ClerkLoaded>
            <SignedIn>
                <div className='mt-8 flex  justify-center w-full flex-col gap-3 sm:flex-row'>
                  <Button onClick={()=> route.push("/project")} >
                    Get Started
                  </Button>
                 
                </div>
            </SignedIn>
            <SignedOut>
                <p>Signed out</p>
            </SignedOut>
        </ClerkLoaded>
       </div>

      </div>
    </section>
  );
}