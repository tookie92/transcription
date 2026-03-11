"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboardingStore, ONBOARDING_STEPS } from "@/stores/useOnboardingStore";

interface TourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AffinityTour({ isOpen, onClose }: TourProps) {
  const { currentStep, nextStep, prevStep, completeTour } = useOnboardingStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      completeTour();
      onClose();
    } else {
      nextStep();
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      prevStep();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Tour Card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-background border border-border rounded-xl shadow-2xl overflow-hidden mx-4">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Welcome to Affinity Mapping</h3>
                    <p className="text-xs text-muted-foreground">
                      Step {currentStep + 1} of {ONBOARDING_STEPS.length}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-4">
                <h4 className="font-medium text-lg mb-2">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.content}</p>

                {/* Progress Dots */}
                <div className="flex items-center gap-1.5 mt-4">
                  {ONBOARDING_STEPS.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentStep
                          ? "w-6 bg-primary"
                          : index < currentStep
                          ? "w-1.5 bg-primary/50"
                          : "w-1.5 bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-4 border-t bg-muted/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  disabled={isFirstStep}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button size="sm" onClick={handleNext} className="gap-1">
                  {isLastStep ? (
                    <>
                      Get Started
                      <Sparkles className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function useAffinityTour() {
  const { hasSeenTour, tourCompleted, setHasSeenTour } = useOnboardingStore();
  const [isOpen, setIsOpen] = useState(false);

  const openTour = () => {
    if (!hasSeenTour || !tourCompleted) {
      setIsOpen(true);
    }
  };

  const closeTour = () => {
    setIsOpen(false);
    setHasSeenTour(true);
  };

  const resetAndOpenTour = () => {
    useOnboardingStore.getState().resetTour();
    setIsOpen(true);
  };

  return {
    isOpen,
    openTour,
    closeTour,
    resetAndOpenTour,
    hasSeenTour,
    tourCompleted,
  };
}
