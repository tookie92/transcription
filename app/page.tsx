"use client";

import { useEffect, useState } from "react";
import { useCurrentProject } from "@/hooks/useCurrentProject";
import { ClerkLoaded, SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowRight, Mic, Sparkles, FileText, Users, BarChart3, Zap, ChevronDown, Play, Quote, Shield, Clock, Star, Check, Minus, ChevronUp } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      className="border-b border-border last:border-b-0"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between gap-4 text-left group"
      >
        <span className="text-lg font-medium group-hover:text-primary transition-colors">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <p className="pb-6 text-muted-foreground leading-relaxed">
          {answer}
        </p>
      </motion.div>
    </motion.div>
  );
}

function AnimatedShape({ className }: { className?: string }) {
  return (
    <div className={`absolute rounded-full blur-3xl opacity-30 ${className}`} />
  );
}

function FloatingDot({ delay = 0, size = "w-2 h-2" }: { delay?: number; size?: string }) {
  return (
    <motion.div
      className={`absolute ${size} rounded-full bg-primary/40`}
      animate={{
        y: [0, -20, 0],
        opacity: [0.4, 0.8, 0.4],
      }}
      transition={{
        duration: 4,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

function AbstractVisual() {
  return (
    <div className="relative w-full h-full">
      {/* Main shapes */}
      <motion.div
        className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-primary/20 to-transparent"
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 10, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute bottom-1/4 right-1/3 w-48 h-48 rounded-2xl bg-gradient-to-tr from-[var(--warm-terracotta)]/20 to-transparent"
        style={{ transform: "rotate(15deg)" }}
        animate={{
          scale: [1, 1.05, 1],
          y: [0, -10, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Sticky note representations */}
      <motion.div
        className="absolute top-12 right-20 w-32 h-32 rounded-lg shadow-lg"
        style={{ backgroundColor: "#FFF9C4", transform: "rotate(-5deg)" }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-24 right-8 w-28 h-28 rounded-lg shadow-lg"
        style={{ backgroundColor: "#F8BBD9", transform: "rotate(8deg)" }}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.div
        className="absolute top-40 right-32 w-24 h-24 rounded-lg shadow-lg"
        style={{ backgroundColor: "#C8E6C9", transform: "rotate(-12deg)" }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <motion.path
          d="M 60% 20% Q 70% 40% 80% 30%"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          className="text-primary"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.path
          d="M 70% 40% Q 75% 50% 85% 45%"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          className="text-[var(--warm-terracotta)]"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        />
      </svg>

      {/* Floating dots */}
      <FloatingDot delay={0} size="w-3 h-3" />
      <FloatingDot delay={1} size="w-2 h-2" />
      <FloatingDot delay={2} size="w-4 h-4" />
      <FloatingDot delay={0.5} size="w-2 h-2" />
      <FloatingDot delay={1.5} size="w-3 h-3" />
    </div>
  );
}

export default function Home() {
  const { currentProjectId } = useCurrentProject();
  const router = useRouter();
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  const headerBg = useTransform(scrollY, [0, 100], ["rgba(250, 248, 245, 0)", "rgba(250, 248, 245, 0.95)"]);
  const headerBorder = useTransform(scrollY, [0, 100], [0, 1]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: Mic,
      number: "01",
      title: "Smart Transcription",
      description: "AI-powered transcription with speaker diarization for accurate interview records"
    },
    {
      icon: Sparkles,
      number: "02",
      title: "AI Insights",
      description: "Automatically extract key insights, pain points, and quotes from your interviews"
    },
    {
      icon: FileText,
      number: "03",
      title: "Affinity Mapping",
      description: "Organize insights into themes with drag-and-drop affinity diagrams"
    },
    {
      icon: Users,
      number: "04",
      title: "Team Collaboration",
      description: "Work together in real-time with your team on the same project"
    },
    {
      icon: BarChart3,
      number: "05",
      title: "Analytics",
      description: "Track progress and gain valuable insights from your research data"
    },
    {
      icon: Zap,
      number: "06",
      title: "Quick Export",
      description: "Export your findings in multiple formats for presentations and reports"
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <AnimatedShape className="w-[800px] h-[800px] -top-64 -right-64 bg-[var(--pale-sage)]/30" />
        <AnimatedShape className="w-[600px] h-[600px] bottom-0 left-0 bg-[var(--warm-terracotta)]/10" />
      </div>

      {/* Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          backgroundColor: headerBg,
          borderBottomWidth: headerBorder,
          borderBottomStyle: "solid",
          borderBottomColor: "var(--border)",
        }}
      >
        <motion.div
          className="container mx-auto px-6 lg:px-12"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Image
                height={40}
                width={40}
                src="/logo.svg"
                alt="Skripta"
                className="w-10 h-10"
              />
              <span 
                className="text-xl font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
              >
                Skripta
              </span>
            </motion.div>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <motion.a
                href="#features"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
                whileHover={{ y: -1 }}
              >
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </motion.a>
              <motion.a
                href="#how-it-works"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
                whileHover={{ y: -1 }}
              >
                How it Works
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </motion.a>
              <motion.a
                href="#pricing"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
                whileHover={{ y: -1 }}
              >
                Pricing
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </motion.a>
            </nav>

            {/* Auth */}
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
                <div className="flex items-center gap-3">
                  <SignInButton mode="redirect">
                    <Button variant="ghost" size="sm">Sign In</Button>
                  </SignInButton>
                  <SignUpButton mode="redirect">
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      Get Started
                    </Button>
                  </SignUpButton>
                </div>
              </SignedOut>
            </ClerkLoaded>
          </div>
        </motion.div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left - Text Content */}
            <motion.div
              className="relative z-10"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            >
              {/* Overline */}
              <motion.div
                className="inline-flex items-center gap-2 mb-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <span className="w-8 h-px bg-primary" />
                <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  AI-Powered Research
                </span>
              </motion.div>

              {/* Headline */}
              <h1 
                className="text-5xl md:text-6xl lg:text-7xl font-normal leading-[1.1] tracking-tight mb-6"
                style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
              >
                Turn Talks{" "}
                <motion.span
                  className="text-primary italic"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  into Insights
                </motion.span>
              </h1>

              {/* Subheadline */}
              <motion.p
                className="text-lg md:text-xl text-muted-foreground max-w-lg mb-10 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                Transform hours of interviews into clear, actionable insights. 
                No more manual note-taking—just intelligent analysis that surfaces what matters.
              </motion.p>

              {/* CTAs */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
              >
                <ClerkLoaded>
                  <SignedIn>
                    <Button
                      size="lg"
                      onClick={() => router.push("/project")}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8 text-base"
                    >
                      Go to Dashboard
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </SignedIn>
                  <SignedOut>
                    <SignUpButton mode="redirect">
                      <Button 
                        size="lg" 
                        className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8 text-base"
                      >
                        Start Free Trial
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </SignUpButton>
                    <SignInButton mode="modal">
                      <Button 
                        size="lg" 
                        variant="outline" 
                        className="h-12 px-8 text-base border-2"
                      >
                        Watch Demo
                      </Button>
                    </SignInButton>
                  </SignedOut>
                </ClerkLoaded>
              </motion.div>

              {/* Trust indicators */}
              <motion.div
                className="flex items-center gap-6 mt-10 pt-10 border-t border-border"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.2 }}
              >
                <div className="flex -space-x-2">
                  {["#E8F0ED", "#D4A574", "#C8E6C9", "#F8BBD9"].map((color, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-background"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">2,400+</span> researchers trust Skripta
                </p>
              </motion.div>
            </motion.div>

            {/* Right - Abstract Visual */}
            <motion.div
              className="relative h-[500px] lg:h-[600px]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
            >
              <AbstractVisual />
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.5 }}
        >
          <motion.div
            className="flex flex-col items-center gap-2 text-muted-foreground cursor-pointer"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
          >
            <span className="text-xs font-medium uppercase tracking-widest">Scroll</span>
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 lg:py-32 relative">
        <div className="container mx-auto px-6 lg:px-12">
          {/* Section header */}
          <motion.div
            className="max-w-2xl mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs font-medium uppercase tracking-widest text-primary mb-4 block">
              Features
            </span>
            <h2 
              className="text-4xl md:text-5xl font-normal mb-6"
              style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
            >
              Everything you need for{" "}
              <span className="italic text-primary">interview research</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              From transcription to actionable insights—all in one place. 
              Stop juggling multiple tools and focus on what matters: understanding your users.
            </p>
          </motion.div>

          {/* Features grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="group relative p-8 bg-card rounded-2xl border border-border hover:border-primary/30 transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                {/* Number */}
                <span 
                  className="text-6xl font-normal absolute top-4 right-6 opacity-[0.05] select-none"
                  style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
                >
                  {feature.number}
                </span>

                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover accent line */}
                <div className="absolute bottom-0 left-8 right-8 h-px bg-primary/0 group-hover:bg-primary/30 transition-colors" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 lg:py-32 relative bg-card">
        <div className="container mx-auto px-6 lg:px-12">
          {/* Section header */}
          <motion.div
            className="max-w-2xl mx-auto text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs font-medium uppercase tracking-widest text-primary mb-4 block">
              How It Works
            </span>
            <h2 
              className="text-4xl md:text-5xl font-normal mb-6"
              style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
            >
              From interview to insight in{" "}
              <span className="italic text-primary">three steps</span>
            </h2>
          </motion.div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            {[
              {
                step: "01",
                title: "Upload Your Interview",
                description: "Simply drag and drop your audio or video file. We support MP4, MP3, WAV, and most video formats.",
                icon: Mic,
              },
              {
                step: "02",
                title: "AI Analysis",
                description: "Our AI transcribes, identifies speakers, and automatically extracts key insights, quotes, and pain points.",
                icon: Sparkles,
              },
              {
                step: "03",
                title: "Organize & Share",
                description: "Group insights into themes with affinity mapping, vote on priorities, and export beautiful reports.",
                icon: FileText,
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                className="relative text-center group"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
              >
                {/* Step number */}
                <div 
                  className="w-12 h-12 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center mx-auto mb-6 relative z-10 group-hover:border-primary/60 group-hover:bg-primary/5 transition-all duration-300"
                >
                  <span 
                    className="text-sm font-semibold text-primary"
                    style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
                  >
                    {item.step}
                  </span>
                </div>

                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Demo video teaser */}
          <motion.div
            className="mt-16 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-foreground/5 border border-border group cursor-pointer">
              {/* Thumbnail placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 text-white ml-1" fill="white" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Watch 2-min demo</p>
                </div>
              </div>
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        {/* Background accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--pale-sage)]/20 via-transparent to-transparent" />
        
        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          {/* Section header */}
          <motion.div
            className="max-w-2xl mx-auto text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs font-medium uppercase tracking-widest text-primary mb-4 block">
              Testimonials
            </span>
            <h2 
              className="text-4xl md:text-5xl font-normal"
              style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
            >
              Loved by{" "}
              <span className="italic text-primary">researchers</span>
            </h2>
          </motion.div>

          {/* Testimonials grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                quote: "Skripta has completely transformed how we conduct user research. What used to take days now takes hours. The AI insights are remarkably accurate.",
                author: "Sarah Chen",
                role: "Head of Research",
                company: "Figma",
                avatar: "#E8F0ED",
              },
              {
                quote: "The affinity mapping feature alone is worth it. Our team finally agrees on insights instead of arguing about sticky notes on a wall.",
                author: "Marcus Rodriguez",
                role: "UX Lead",
                company: "Stripe",
                avatar: "#D4A574",
              },
              {
                quote: "I was skeptical about AI transcription, but Skripta exceeds every expectation. Even with accents, it's incredibly accurate.",
                author: "Emma Larsson",
                role: "Senior Researcher",
                company: "Spotify",
                avatar: "#C8E6C9",
              },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                className="relative p-8 bg-card rounded-2xl border border-border hover:border-primary/30 transition-all duration-300 group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                {/* Quote icon */}
                <Quote className="w-8 h-8 text-primary/20 mb-4" />

                {/* Quote */}
                <p className="text-foreground leading-relaxed mb-6">
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-foreground/70"
                    style={{ backgroundColor: testimonial.avatar }}
                  >
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}, {testimonial.company}</p>
                  </div>
                </div>

                {/* Hover accent */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/0 group-hover:bg-primary/20 transition-colors rounded-b-2xl" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges Section */}
      <section className="py-16 border-y border-border bg-card/50">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Trust badges */}
            <div className="flex items-center gap-8 lg:gap-12 flex-wrap justify-center">
              {[
                { icon: Shield, label: "SOC 2 Compliant" },
                { icon: Clock, label: "99.9% Uptime" },
                { icon: Star, label: "4.9 Rating" },
              ].map((badge, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-3 text-muted-foreground"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <badge.icon className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{badge.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Company logos placeholder */}
            <div className="flex items-center gap-8 lg:gap-12 opacity-50">
              {["Figma", "Stripe", "Spotify", "Airbnb", "Notion"].map((company, index) => (
                <span 
                  key={index}
                  className="text-sm font-semibold text-muted-foreground tracking-tight"
                  style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
                >
                  {company}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-primary/5">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {[
              { value: "2,400+", label: "Active Researchers" },
              { value: "50,000+", label: "Interviews Analyzed" },
              { value: "98%", label: "Satisfaction Rate" },
              { value: "15min", label: "Avg. Time to Insight" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div 
                  className="text-4xl lg:text-5xl font-normal mb-2 text-primary"
                  style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
                >
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground font-medium">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-foreground" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 
              className="text-4xl md:text-5xl lg:text-6xl font-normal mb-6"
              style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
            >
              Ready to transform your{" "}
              <span className="italic text-primary">research workflow?</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
              Join thousands of researchers who have cut their analysis time in half 
              with Skripta's AI-powered platform.
            </p>

            <ClerkLoaded>
              <SignedIn>
                <Button
                  size="lg"
                  onClick={() => router.push("/project")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-10 text-lg"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </SignedIn>
              <SignedOut>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <SignUpButton mode="modal">
                    <Button 
                      size="lg" 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-10 text-lg"
                    >
                      Start Free Trial
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </SignUpButton>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="h-14 px-10 text-lg border-2"
                  >
                    Schedule Demo
                  </Button>
                </div>
              </SignedOut>
            </ClerkLoaded>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 lg:py-32 relative">
        <div className="container mx-auto px-6 lg:px-12">
          {/* Section header */}
          <motion.div
            className="max-w-2xl mx-auto text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs font-medium uppercase tracking-widest text-primary mb-4 block">
              Pricing
            </span>
            <h2 
              className="text-4xl md:text-5xl font-normal mb-6"
              style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
            >
              Simple, transparent{" "}
              <span className="italic text-primary">pricing</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Start free, upgrade when you need more. No hidden fees.
            </p>
          </motion.div>

          {/* Pricing cards */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
            <motion.div
              className="relative p-8 bg-card rounded-2xl border border-border hover:border-primary/30 transition-all duration-300 group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -4 }}
            >
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Starter</h3>
                <p className="text-sm text-muted-foreground">Perfect for individual researchers</p>
              </div>
              <div className="mb-6">
                <span 
                  className="text-4xl font-normal text-foreground"
                  style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
                >
                  $0
                </span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "3 interviews/month",
                  "60 min audio per interview",
                  "Basic transcription",
                  "Manual affinity mapping",
                  "Export to PDF",
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
                {["Unlimited interviews", "Priority support"].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm text-muted-foreground/50">
                    <Minus className="w-4 h-4 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <ClerkLoaded>
                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button variant="outline" className="w-full h-11">
                      Get Started Free
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Button variant="outline" className="w-full h-11" disabled>
                    Current Plan
                  </Button>
                </SignedIn>
              </ClerkLoaded>
            </motion.div>

            {/* Pro Tier - Featured */}
            <motion.div
              className="relative p-8 bg-primary rounded-2xl text-primary-foreground group md:-mt-4 md:mb-[-16px]"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -4 }}
            >
              {/* Popular badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[var(--warm-terracotta)] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Pro</h3>
                <p className="text-sm text-primary-foreground/70">For growing research teams</p>
              </div>
              <div className="mb-6">
                <span 
                  className="text-4xl font-normal"
                  style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
                >
                  $49
                </span>
                <span className="text-primary-foreground/70">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Unlimited interviews",
                  "Unlimited audio length",
                  "AI transcription & diarization",
                  "Smart affinity mapping",
                  "Team collaboration",
                  "Export to PDF, CSV, Notion",
                  "Priority support",
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <ClerkLoaded>
                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button variant="secondary" className="w-full h-11 bg-white text-foreground hover:bg-white/90">
                      Start Free Trial
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Button variant="secondary" className="w-full h-11 bg-white text-foreground hover:bg-white/90">
                    Upgrade to Pro
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </SignedIn>
              </ClerkLoaded>
            </motion.div>

            {/* Enterprise Tier */}
            <motion.div
              className="relative p-8 bg-card rounded-2xl border border-border hover:border-primary/30 transition-all duration-300 group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -4 }}
            >
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Enterprise</h3>
                <p className="text-sm text-muted-foreground">For large organizations</p>
              </div>
              <div className="mb-6">
                <span 
                  className="text-4xl font-normal text-foreground"
                  style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
                >
                  Custom
                </span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Everything in Pro",
                  "Unlimited team seats",
                  "SSO / SAML",
                  "Custom integrations",
                  "Dedicated account manager",
                  "SLA & compliance",
                  "On-premise option",
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full h-11">
                Contact Sales
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 lg:py-32 bg-card relative">
        <div className="container mx-auto px-6 lg:px-12">
          {/* Section header */}
          <motion.div
            className="max-w-2xl mx-auto text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs font-medium uppercase tracking-widest text-primary mb-4 block">
              FAQ
            </span>
            <h2 
              className="text-4xl md:text-5xl font-normal"
              style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
            >
              Frequently asked{" "}
              <span className="italic text-primary">questions</span>
            </h2>
          </motion.div>

          {/* FAQ items */}
          <div className="max-w-3xl mx-auto">
            {[
              {
                question: "How accurate is the AI transcription?",
                answer: "Our AI transcription achieves 95%+ accuracy for clear audio in English. With speaker diarization, it can identify and separate different speakers with 90%+ accuracy. Accents and background noise may affect accuracy slightly.",
              },
              {
                question: "What audio formats do you support?",
                answer: "We support MP4, MP3, WAV, M4A, AAC, OGG, and most common audio/video formats. There's no limit on audio length for Pro and Enterprise users. Free tier supports up to 60 minutes per interview.",
              },
              {
                question: "Can I collaborate with my team?",
                answer: "Absolutely! Pro and Enterprise plans include real-time collaboration. You can invite team members, assign insights, vote on priorities, and leave comments—all in real-time.",
              },
              {
                question: "Is my data secure?",
                answer: "Yes. We're SOC 2 Type II compliant. All data is encrypted at rest and in transit. We never use your data to train our models. Enterprise users can opt for on-premise deployment.",
              },
              {
                question: "Can I export my data?",
                answer: "You own your data. Export anytime in PDF, CSV, or directly to Notion, Linear, or Jira. We believe you should never be locked in.",
              },
              {
                question: "What happens if I cancel?",
                answer: "No penalties. Cancel anytime from your dashboard. Your data remains accessible for 30 days after cancellation, and we'll help you export everything before you go.",
              },
            ].map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <Image
                  height={32}
                  width={32}
                  src="/logo.svg"
                  alt="Skripta"
                  className="w-8 h-8"
                />
                <span 
                  className="text-lg font-semibold"
                  style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
                >
                  Skripta
                </span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                AI-powered platform for user research teams. Transform interviews into insights.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4 text-sm">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              © 2024 Skripta. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground mt-2 md:mt-0">
              Made with care by{" "}
              <a href="#" className="text-primary hover:underline">Rehovision</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
