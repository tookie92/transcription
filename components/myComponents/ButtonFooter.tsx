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
    <div>
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
            <div className="w-full flex flex-col gap-3">
              <CreateProjectDialog/>  
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className='flex items-center gap-3 w-full justify-start h-auto py-2'>
                            <Image
                                src={user?.imageUrl || ""}
                                alt="Profile Image"
                                width={40}
                                height={40}
                                className="rounded-full"
                            />
                            <div className="flex flex-col items-start overflow-hidden">
                                <p className="font-medium truncate w-full">
                                    {user?.fullName || user?.firstName}
                                </p>
                                <p className="text-sm text-muted-foreground truncate w-full">
                                    {user?.emailAddresses[0]?.emailAddress}
                                </p>
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