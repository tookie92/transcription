"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Sparkles, MessageCircle, Users, LayoutGrid, Vote, MousePointer2, ZoomIn, Move, Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboardingStore, ONBOARDING_STEPS } from "@/stores/useOnboardingStore";

interface SpotlightTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SpotlightTour({ isOpen, onClose }: SpotlightTourProps) {
  const { currentStep, nextStep, prevStep, completeTour } = useOnboardingStore();
  const [mounted, setMounted] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !mounted) return;

    const step = ONBOARDING_STEPS[currentStep];
    const targetId = step?.target;

    if (targetId) {
      const element = document.querySelector(`[data-tour="${targetId}"]`);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    }
  }, [currentStep, isOpen, mounted]);

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

  const handleSkip = () => {
    completeTour();
    onClose();
  };

  const getTargetIcon = (target: string) => {
    switch (target) {
      case 'toolbar': return <LayoutGrid className="w-4 h-4" />;
      case 'insights-panel': return <MessageCircle className="w-4 h-4" />;
      case 'groups': return <LayoutGrid className="w-4 h-4" />;
      case 'dot-voting': return <Vote className="w-4 h-4" />;
      case 'collaboration': return <Users className="w-4 h-4" />;
      default: return <MousePointer2 className="w-4 h-4" />;
    }
  };

  const getFeatureTips = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2">
            <p className="text-xs font-medium flex items-center gap-2">
              <ZoomIn className="w-3 h-3" /> Quick Actions:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Scroll to zoom in/out</li>
              <li>• Hold Space + drag to pan</li>
              <li>• Press N to add new insight</li>
              <li>• Press G to create new group</li>
            </ul>
          </div>
        );
      case 1:
        return (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2">
            <p className="text-xs font-medium flex items-center gap-2">
              <Plus className="w-3 h-3" /> Here you can:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• View all ungrouped insights</li>
              <li>• Drag insights to the canvas</li>
              <li>• Create manual insights</li>
              <li>• Use AI to auto-group</li>
            </ul>
          </div>
        );
      case 2:
        return (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2">
            <p className="text-xs font-medium flex items-center gap-2">
              <Move className="w-3 h-3" /> Group Actions:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Double-click canvas to create group</li>
              <li>• Drag to reposition groups</li>
              <li>• Double-click title to rename</li>
              <li>• Right-click for more options</li>
            </ul>
          </div>
        );
      case 3:
        return (
          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800 space-y-2">
            <p className="text-xs font-medium text-orange-800 dark:text-orange-200 flex items-center gap-2">
              <Vote className="w-3 h-3" /> Team Voting:
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Start dot voting to prioritize insights with your team in real-time.
            </p>
          </div>
        );
      case 4:
        return (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
            <p className="text-xs font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
              <Eye className="w-3 h-3" /> Collaborate:
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              See your team members cursors and selections in real-time as they work on the canvas.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dark Overlay with Spotlight effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{
              background: targetRect 
                ? `radial-gradient(circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent 0px, transparent ${Math.max(targetRect.width, targetRect.height) * 0.5}px, rgba(0, 0, 0, 0.5) ${Math.max(targetRect.width, targetRect.height) * 0.7}px, rgba(0, 0, 0, 0.75) 100%)`
                : 'rgba(0, 0, 0, 0.5)',
            }}
          />

          {/* Spotlight Border Animation - Subtle */}
          {targetRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed pointer-events-none z-40"
              style={{
                left: targetRect.left - 4,
                top: targetRect.top - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
              }}
            >
              <div className="absolute inset-0 rounded-lg border-2 border-primary/40 shadow-[0_0_15px_rgba(34,197,94,0.25)]" />
              <motion.div
                animate={{ 
                  boxShadow: ['0 0 5px rgba(34,197,94,0.15)', '0 0 12px rgba(34,197,94,0.25)', '0 0 5px rgba(34,197,94,0.15)']
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-lg border-2 border-primary/40"
              />
            </motion.div>
          )}

          {/* Click on spotlight to advance */}
          {targetRect && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed z-40 cursor-pointer bg-transparent border-none"
              style={{
                left: targetRect.left - 6,
                top: targetRect.top - 6,
                width: targetRect.width + 12,
                height: targetRect.height + 12,
              }}
              onClick={handleNext}
              aria-label="Next step"
            />
          )}

          {/* Tour Card - Always centered at bottom */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed z-50 bottom-8 left-1/2 -translate-x-1/2"
          >
            <div className="bg-background border border-border rounded-2xl shadow-2xl overflow-hidden w-[420px] mx-4">
              {/* Progress Bar */}
              <div className="h-1 bg-muted flex">
                {ONBOARDING_STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`flex-1 transition-colors ${
                      index <= currentStep ? "bg-primary" : "bg-muted"
                    }`}
                    style={{
                      borderRadius: index === 0 ? '4px 0 0 0' : index === ONBOARDING_STEPS.length - 1 ? '0 4px 0 0' : '0',
                    }}
                  />
                ))}
              </div>

              {/* Header */}
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    {getTargetIcon(step?.target || '')}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{step?.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      Step {currentStep + 1} of {ONBOARDING_STEPS.length}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleSkip}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="px-5 pb-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step?.content}
                </p>
                
                {/* Feature Tips */}
                {getFeatureTips(currentStep)}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-4 border-t bg-muted/20 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  disabled={isFirstStep}
                  className="gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                  >
                    Skip
                  </Button>
                  <Button size="sm" onClick={handleNext} className="gap-1.5 min-w-[100px]">
                    {isLastStep ? (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Finish
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function useSpotlightTour() {
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
