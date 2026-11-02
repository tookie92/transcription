import { Toaster } from "@/components/ui/sonner";

import type { Metadata } from "next";
import { JetBrains_Mono, Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ThemeProvider } from "next-themes";
import { shadcn } from "@clerk/themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SoftErrorBoundary } from "@/components/ConvexErrorBoundary";
import { SignalWidget } from "@/components/myComponents/SignalWidget";

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

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://skripta.app"),
  title: {
    default: "Skripta — Field kit for interview research",
    template: "%s | Skripta",
  },
  description:
    "Record interviews, pin Quote / Pain / Follow-up, packet the wall, Round Stick Flip, publish the Issue. Field kit for one study.",
  keywords: [
    "interview research",
    "transcription",
    "affinity mapping",
    "UX research",
    "user research",
    "qualitative analysis",
    "workshop voting",
  ],
  authors: [{ name: "Skripta" }],
  creator: "Skripta",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://skripta.app",
    siteName: "Skripta",
    title: "Skripta — Field kit for interview research",
    description:
      "Tape → pins → packets → Round → Issue. Built for researchers who still sit with people.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Skripta — interview research field kit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Skripta — Field kit for interview research",
    description:
      "Tape → pins → packets → Round → Issue. Built for researchers who still sit with people.",
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
    icon: [{ url: "/logomark.svg", type: "image/svg+xml" }],
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
      <body
        className={`${jakarta.variable} ${outfit.variable} ${jetbrains.variable} font-sans bg-background antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider
            appearance={{
              baseTheme: shadcn,
            }}
            signInFallbackRedirectUrl="/project"
            signUpFallbackRedirectUrl="/project?new=1"
            afterSignOutUrl="/"
          >
            <TooltipProvider>
              <ConvexClientProvider>
                <main className="w-full min-h-dvh flex-1">{children}</main>
                <SoftErrorBoundary>
                  <SignalWidget />
                </SoftErrorBoundary>
                <Toaster />
              </ConvexClientProvider>
            </TooltipProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
