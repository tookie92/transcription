"use client"
import { SignInButton, SignUpButton ,SignedIn,SignedOut, UserButton, useClerk, useUser } from '@clerk/nextjs'
// import { Unauthenticated } from 'convex/react'
import React from 'react'
import { Button } from '../ui/button'
import Image from 'next/image'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { CreateProjectDialog } from './CreatProjectDialog'


const ButtonFooter = () => {
    const {user} = useUser()
    const {signOut, openUserProfile} = useClerk()

     const handleSignOut = async () => {
    try {
      await signOut();
      console.log("✅ Signed out successfully");
    } catch (error) {
      console.error("❌ Sign out failed:", error);
    }
  };
  return (
    <div className=' flex-col items-start'>
        <SignedOut>
            <SignInButton mode="modal">
                <Button variant="outline" className='w-full'>
                    Sign In
                </Button>
            </SignInButton>
            <SignUpButton mode="modal">
                <Button variant="ghost" className='w-full mt-2'>
                    Sign Up
                </Button>
            </SignUpButton>
        </SignedOut>
        <SignedIn >
            <div className="w-full flex flex-col gap-2">
              <CreateProjectDialog/>  
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className='flex  gap-3  py-6 rounded-lg bg-sidebar-accent'>
                            {user?.imageUrl ? 

                            <div className='h-8 w-8'>
                                <Image
                                    src={user?.imageUrl || ""}
                                    alt="Profile Image"
                                    width={40}
                                    height={40}
                                    className="rounded-full"
                                />
                            </div>
                            :
                            <div className="w-8 h-8 bg-sidebar-primary rounded-full flex items-center justify-center text-sidebar-primary-foreground text-sm font-medium">
                            {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress.charAt(0) || "U"}
                            </div>
                        }
                           

                            <div className="flex-1 min-w-0 px-0 text-start">
                            <p className="text-sm font-medium truncate">{user?.fullName || user?.username || "User"}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.emailAddresses[0]?.emailAddress}</p>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openUserProfile()}>
                            Manage Account
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSignOut()}>
                            Sign Out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </SignedIn>
    </div>
  )
}

export default ButtonFooter