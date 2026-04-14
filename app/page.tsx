"use client";

import { useEffect, useState } from "react";
import { ClerkLoaded, SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowRight, Mic, Sparkles, FileText, Check } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

function SplitTextAnimation({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

export default function Home() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="flex items-center justify-between px-6 py-4 lg:px-16 lg:py-4">
          <Image height={80} width={80} src="/logo.svg" alt="Skripta" className="w-20 h-20" />

          <div className="flex items-center gap-4">
            <ClerkLoaded>
              {isSignedIn ? (
                <>
                  <Button variant="ghost" onClick={() => router.push("/project")} className="text-base font-medium text-gray-600 hover:text-gray-900">
                    Dashboard
                  </Button>
                  <UserButton />
                </>
              ) : (
                <>
                  <SignInButton mode="redirect">
                    <Button variant="ghost" size="sm" className="text-base font-medium text-gray-600">Sign In</Button>
                  </SignInButton>
                  <SignUpButton mode="redirect">
                    <Button size="sm" className="bg-[#4CA771] hover:bg-[#3F9A68] text-white text-base font-medium px-6">
                      Get Started
                    </Button>
                  </SignUpButton>
                </>
              )}
            </ClerkLoaded>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="min-h-screen flex items-center pt-32 pb-24 px-6 lg:px-16">
        <div className="max-w-5xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold leading-[0.92] tracking-tight mb-10 text-gray-900" style={{ fontFamily: "var(--font-display), sans-serif" }}>
              <SplitTextAnimation text="Turn Talks" />
              <br />
              <span className="block">
                <span className="text-[#4CA771]">into </span>
                <SplitTextAnimation text="Insights" className="text-[#4CA771]" />
              </span>
            </h1>
          </motion.div>

          <motion.p
            className="text-xl md:text-2xl text-gray-500 max-w-2xl mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          >
            Transform hours of interviews into clear, actionable insights. 
            No more manual note-taking—just intelligent analysis.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <ClerkLoaded>
              {isSignedIn ? (
                <Button size="lg" onClick={() => router.push("/project")} className="bg-[#4CA771] hover:bg-[#3F9A68] text-white h-14 px-8 text-lg font-medium">
                  Go to Dashboard
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              ) : (
                <SignUpButton mode="redirect">
                  <Button size="lg" className="bg-[#4CA771] hover:bg-[#3F9A68] text-white h-14 px-8 text-lg font-medium">
                    Start Free Trial
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </SignUpButton>
              )}
            </ClerkLoaded>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="flex gap-16 mt-20 pt-20 border-t border-gray-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            <div>
              <div className="text-4xl md:text-5xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display), sans-serif" }}>2,400+</div>
              <div className="text-gray-500 mt-2 text-lg">Researchers</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display), sans-serif" }}>50,000+</div>
              <div className="text-gray-500 mt-2 text-lg">Interviews</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display), sans-serif" }}>98%</div>
              <div className="text-gray-500 mt-2 text-lg">Satisfaction</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features - Orange background */}
      <section className="py-40 px-6 lg:px-16 bg-[#4CA771]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="mb-24"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-7xl font-bold text-white" style={{ fontFamily: "var(--font-display), sans-serif" }}>
              What you get
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-20">
            {[
              {
                icon: Mic,
                title: "Transcription",
                description: "AI-powered with speaker identification. Upload audio or video, get accurate transcripts in minutes."
              },
              {
                icon: Sparkles,
                title: "AI Insights",
                description: "Automatically extract key insights, pain points, and quotes from your interviews."
              },
              {
                icon: FileText,
                title: "Affinity Mapping",
                description: "Organize insights into themes with drag-and-drop. Collaborate with your team in real-time."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="w-12 h-[2px] bg-white/30" />
                </div>
                <h3 className="text-3xl font-bold mb-5 text-white" style={{ fontFamily: "var(--font-display), sans-serif" }}>
                  {feature.title}
                </h3>
                <p className="text-white/80 leading-relaxed text-lg">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - White */}
      <section className="py-40 px-6 lg:px-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="mb-24"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-7xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display), sans-serif" }}>
              How it works
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-16 md:gap-32">
            {[
              {
                step: "01",
                title: "Upload",
                description: "Drag and drop your audio or video file. We support MP4, MP3, WAV and more."
              },
              {
                step: "02",
                title: "Analyze",
                description: "Our AI transcribes, identifies speakers, and extracts key insights automatically."
              },
              {
                step: "03",
                title: "Organize",
                description: "Group insights into themes with affinity mapping and export beautiful reports."
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl font-bold text-[#4CA771]" style={{ fontFamily: "var(--font-display), sans-serif" }}>{item.step}</span>
                  <div className="flex-1 h-[2px] bg-gradient-to-r from-[#4CA771] to-transparent" />
                </div>
                <h3 className="text-4xl font-bold mb-6 text-gray-900" style={{ fontFamily: "var(--font-display), sans-serif" }}>
                  {item.title}
                </h3>
                <p className="text-gray-500 leading-relaxed text-lg">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing - Orange accent */}
      <section className="py-40 px-6 lg:px-16 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="mb-24"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-7xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display), sans-serif" }}>
              Simple Pricing
            </h2>
            <p className="text-xl text-gray-500 mt-6">Pay only for what you use. No credit card required.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Free */}
            <motion.div
              className="p-8 bg-white rounded-3xl border border-gray-200"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-2xl font-bold mb-2 text-gray-900" style={{ fontFamily: "var(--font-display), sans-serif" }}>Free</h3>
              <p className="text-gray-500 mb-6 text-sm">For students & learning</p>
              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display), sans-serif" }}>€0</span>
                <span className="text-gray-500 text-lg ml-2">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["150 credits/month", "3 projects", "AI clustering", "Basic personas", "Dot voting"].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-gray-600">
                    <Check className="w-4 h-4 text-[#4CA771]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <ClerkLoaded>
                {isSignedIn ? (
                  <Button variant="outline" className="w-full h-12 border-2 border-gray-300 text-lg font-medium" disabled>Current Plan</Button>
                ) : (
                  <SignUpButton mode="modal">
                    <Button variant="outline" className="w-full h-12 border-2 border-gray-300 text-gray-900 text-lg font-medium">Get Started</Button>
                  </SignUpButton>
                )}
              </ClerkLoaded>
            </motion.div>

            {/* Starter */}
            <motion.div
              className="p-8 bg-white rounded-3xl border-2 border-[#4CA771] shadow-xl"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <span className="inline-block bg-[#4CA771] text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">Most Popular</span>
              <h3 className="text-2xl font-bold mb-2 text-gray-900" style={{ fontFamily: "var(--font-display), sans-serif" }}>Starter</h3>
              <p className="text-gray-500 mb-6 text-sm">For individual researchers</p>
              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display), sans-serif" }}>€19</span>
                <span className="text-gray-500 text-lg ml-2">/month</span>
              </div>
              <div className="mb-4">
                <span className="text-sm text-[#4CA771] font-medium">€0.15 per additional credit</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["500 credits/month", "Unlimited projects", "Priority AI features", "Advanced personas", "Team collaboration", "Export PDF/CSV"].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-gray-600">
                    <Check className="w-4 h-4 text-[#4CA771]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <ClerkLoaded>
                {isSignedIn ? (
                  <Button className="w-full h-12 bg-[#4CA771] text-white font-bold text-lg">
                    Upgrade
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                ) : (
                  <SignUpButton mode="modal">
                    <Button className="w-full h-12 bg-[#4CA771] text-white font-bold text-lg">
                      Start Trial
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </SignUpButton>
                )}
              </ClerkLoaded>
            </motion.div>

            {/* Pro */}
            <motion.div
              className="p-8 bg-gray-900 rounded-3xl text-white"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-display), sans-serif" }}>Pro</h3>
              <p className="text-gray-400 mb-6 text-sm">For agencies & teams</p>
              <div className="mb-6">
                <span className="text-5xl font-bold" style={{ fontFamily: "var(--font-display), sans-serif" }}>€35</span>
                <span className="text-gray-400 text-lg ml-2">/user/month</span>
              </div>
              <div className="mb-4">
                <span className="text-sm text-gray-400">Everything in Starter +</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Unlimited credits", "Unlimited projects", "API access", "Custom branding", "Priority support", "Dedicated account manager"].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-gray-300">
                    <Check className="w-4 h-4" />
                    {feature}
                  </li>
                ))}
              </ul>
              <ClerkLoaded>
                {isSignedIn ? (
                  <Button className="w-full h-12 bg-white text-gray-900 font-bold text-lg">
                    Contact Sales
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                ) : (
                  <SignUpButton mode="modal">
                    <Button className="w-full h-12 bg-white text-gray-900 font-bold text-lg">
                      Start Trial
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </SignUpButton>
                )}
              </ClerkLoaded>
            </motion.div>
          </div>

          {/* Credits Info */}
          <motion.div
            className="mt-16 p-8 bg-white rounded-3xl border border-gray-200"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h4 className="text-xl font-bold text-gray-900 mb-6">How credits work</h4>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#4CA771] mb-2">20</div>
                <div className="text-gray-600">Transcription (per audio)</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#4CA771] mb-2">10</div>
                <div className="text-gray-600">AI Grouping (per cluster)</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#4CA771] mb-2">5</div>
                <div className="text-gray-600">AI Rename (per action)</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA - Orange */}
      <section className="py-40 px-6 lg:px-16 bg-[#4CA771]">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-7xl font-bold mb-8 text-white" style={{ fontFamily: "var(--font-display), sans-serif" }}>
              Ready to start?
            </h2>
            <p className="text-xl text-white/80 mb-12">Join thousands of researchers who save hours every week.</p>

            <ClerkLoaded>
              {isSignedIn ? (
                <Button size="lg" onClick={() => router.push("/project")} className="bg-white text-[#4CA771] hover:bg-white/90 h-16 px-12 text-xl font-medium">
                  Go to Dashboard
                  <ArrowRight className="ml-3 w-6 h-6" />
                </Button>
              ) : (
                <SignUpButton mode="modal">
                  <Button size="lg" className="bg-white text-[#4CA771] hover:bg-white/90 h-16 px-12 text-xl font-medium">
                    Start Free Trial
                    <ArrowRight className="ml-3 w-6 h-6" />
                  </Button>
                </SignUpButton>
              )}
            </ClerkLoaded>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 lg:px-16 border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <Image height={32} width={32} src="/logo.svg" alt="Skripta" className="w-8 h-8" />
            <span className="text-lg text-gray-500">© 2024 Skripta</span>
          </div>
          <div className="flex items-center gap-10 text-lg text-gray-400">
            <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}