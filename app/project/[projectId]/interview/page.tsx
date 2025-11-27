"use client";
import MediaManager from '@/components/myComponents/MediaManager';
import TranscriptionManager from '@/components/myComponents/TranscriptionManager';
import { Id } from '@/convex/_generated/dataModel';
import { useCurrentProject } from '@/hooks/useCurrentProject';
import { useParams } from 'next/navigation';
import React, { useEffect } from 'react'

const InterviewHome = () => {
    const {projectId} = useParams();
    const  currentProjectId  = projectId as Id<"projects">

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
        
        {/* Message si projet sélectionné ← OPTIONNEL */}
        {currentProjectId && (
          <div className="mt-4 text-center">
            <p className="text-gray-600">
              Working on project. <a href={`/project/${currentProjectId}`} className="text-blue-600 hover:underline">View project page</a>
            </p>
          </div>
        )}
        
        <div className='mt-8 flex flex-col gap-6 sm:flex-row'>
          <MediaManager currentProjectId={currentProjectId as Id<"projects">} />
          {/* <TranscriptionManager /> */}
        </div>
      </div>
    </section>
  )
}

export default InterviewHome