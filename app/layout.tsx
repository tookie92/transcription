import { Toaster } from "@/components/ui/sonner";

import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ThemeProvider } from "next-themes";
import { shadcn } from '@clerk/themes'
import { TooltipProvider } from "@/components/ui/tooltip";


const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://skripta.app"),
  title: {
    default: "Skripta - AI-Powered Interview Research Platform",
    template: "%s | Skripta",
  },
  description: "Transform your interview research with AI-powered transcription, affinity mapping, and collaborative insights. Build affinity diagrams and discover themes in minutes.",
  keywords: ["interview research", "transcription", "affinity mapping", "UX research", "user research", "AI insights", "qualitative analysis", "research tools"],
  authors: [{ name: "Skripta" }],
  creator: "Skripta",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://skripta.app",
    siteName: "Skripta",
    title: "Skripta - AI-Powered Interview Research Platform",
    description: "Transform your interview research with AI-powered transcription, affinity mapping, and collaborative insights.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Skripta - Interview Research Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Skripta - AI-Powered Interview Research Platform",
    description: "Transform your interview research with AI-powered transcription and affinity mapping.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
      <body className={`${jakarta.variable} ${outfit.variable} font-sans bg-background antialiased`}>
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
            <TooltipProvider>
              <ConvexClientProvider>
                  <main className="w-full min-h-dvh flex-1">
                    {children}
                  </main>
                <Toaster/>
              </ConvexClientProvider>
            </TooltipProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
