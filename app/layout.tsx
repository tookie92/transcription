import { Toaster } from "@/components/ui/sonner";

import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { ThemeProvider } from "next-themes";
import { shadcn } from '@clerk/themes'


const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "transkripschon",
  description: "Transkripieren + schon - Your AI-powered transcription and affinity mapping tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${playfair.variable} ${inter.variable} font-sans bg-myBackground antialiased`}>
        <ThemeProvider
          attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
          <ClerkProvider
             appearance={{
                baseTheme: shadcn,
              }}
          >
            <ConvexClientProvider>
                <main className="flex w-full min-h-dvh ">
                  {children}
                </main>
              <Toaster/>
            </ConvexClientProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
