"use client";

import { useCurrentProject } from '@/hooks/useCurrentProject';
import { useEffect } from 'react';
import { ClerkLoaded, SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  Mic, 
  FileText, 
  Sparkles, 
  Users, 
  ArrowRight, 
  BarChart3,
  Zap
} from 'lucide-react';

export default function Home() {
  const { currentProjectId } = useCurrentProject();
  const router = useRouter();

  useEffect(() => {
    if (currentProjectId) {
      // Optional: auto-redirect
    }
  }, [currentProjectId]);

  const features = [
    {
      icon: Mic,
      title: "Smart Transcription",
      description: "AI-powered transcription with speaker diarization for accurate interview records"
    },
    {
      icon: Sparkles,
      title: "AI Insights",
      description: "Automatically extract key insights, pain points, and quotes from your interviews"
    },
    {
      icon: FileText,
      title: "Affinity Mapping",
      description: "Organize insights into themes with drag-and-drop affinity diagrams"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Work together in real-time with your team on the same project"
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "Track progress and gain valuable insights from your research data"
    },
    {
      icon: Zap,
      title: "Quick Export",
      description: "Export your findings in multiple formats for presentations and reports"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex  w-32 items-center gap-3">
              <img 
                src="/logo.svg" 
                alt="Skripta" 
                className="w-full h-full "
              />
            </div>
            
            <div className="flex items-center gap-4">
              <ClerkLoaded>
                <SignedIn>
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="ghost" 
                      onClick={() => router.push("/project")}
                      className="hidden sm:flex"
                    >
                      Dashboard
                    </Button>
                    <UserButton />
                  </div>
                </SignedIn>
                <SignedOut>
                  <div className="flex items-center gap-2">
                    <SignInButton mode="redirect">
                      <Button variant="ghost">Sign In</Button>
                    </SignInButton>
                    <SignUpButton mode="redirect" >
                      <Button>Get Started</Button>
                    </SignUpButton>
                  </div>
                </SignedOut>
              </ClerkLoaded>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 sm:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
              Transform Your{' '}
              <span className="text-primary">Interview Research</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Transcribe, analyze, and organize user interviews with AI-powered insights. 
              Build affinity maps and discover themes in minutes, not hours.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <ClerkLoaded>
                <SignedIn>
                  <Button 
                    size="lg" 
                    onClick={() => router.push("/project")}
                    className="text-lg px-8"
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </SignedIn>
                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button size="lg" className="text-lg px-8">
                      Start Free
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </SignUpButton>
                  <SignInButton mode="modal">
                    <Button size="lg" variant="outline" className="text-lg px-8">
                      Sign In
                    </Button>
                  </SignInButton>
                </SignedOut>
              </ClerkLoaded>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              The AI-powered platform for user research teams
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">
              Everything You Need for Interview Research
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From transcription to actionable insights in one platform
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-background p-6 rounded-xl border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-primary rounded-2xl p-8 sm:p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to transform your research?
            </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of researchers who use Skripta to uncover insights faster.
            </p>
            <ClerkLoaded>
              <SignedIn>
                <Button 
                  size="lg" 
                  variant="secondary"
                  onClick={() => router.push("/project")}
                  className="text-lg px-8"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </SignedIn>
              <SignedOut>
                <SignUpButton mode="modal">
                  <Button 
                    size="lg" 
                    variant="secondary"
                    className="text-lg px-8"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </SignUpButton>
              </SignedOut>
            </ClerkLoaded>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Skripta © 2024</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Made with love by <a href="https://www.shadcn.com" target="_blank" rel="noreferrer">Rehovision</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
