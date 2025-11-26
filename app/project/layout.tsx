import React from 'react'

const ProjectLayout = ({children}:{children:React.ReactNode}) => {
  return (
    <main className="flex w-full min-h-dvh" suppressHydrationWarning>
        {children}
    </main>
  )
}

export default ProjectLayout