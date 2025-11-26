
import { AppSidebar } from '@/components/ui/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import React from 'react'


const Projectlayout = ({children}:{children:React.ReactNode}) => {
  return (  
                <main className="flex w-full min-h-dvh">
                  {children}
                </main>
  )
}

export default Projectlayout