import { Toaster } from "@/components/ui/sonner";

import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { ThemeProvider } from "next-themes";
import { shadcn } from '@clerk/themes'


const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Skripta",
  description: "Your AI-powered transcription and affinity mapping tool",
  icons: {
    icon: [
      { url: "/logomark.svg", type: "image/svg+xml" },
    ],
    shortcut: "/logomark.svg",
    apple: "/logomark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jakarta.variable} font-sans bg-myBackground antialiased`}>
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
                <main className="w-full min-h-dvh flex-1">
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
