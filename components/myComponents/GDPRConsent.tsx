"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, Shield, Database, Lock } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

interface GDPRConsentProps {
  operation: "transcription" | "aiGrouping" | "aiRename";
  onConsent: () => void;
}

export function GDPRConsent({ operation, onConsent }: GDPRConsentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const initializeCredits = useMutation(api.credits.initializeCredits);
  const deductCredits = useMutation(api.credits.deductCredits);
  const setConsent = useMutation(api.credits.setConsent);
  const getConsent = useQuery(api.credits.getConsent);

  useEffect(() => {
    if (getConsent === false) {
      setIsOpen(true);
    } else if (getConsent === true) {
      setHasConsented(true);
    }
  }, [getConsent]);

  const handleConsent = async () => {
    setIsLoading(true);
    try {
      await setConsent({ 
        gdprConsent: true,
        consentDate: Date.now(),
      });
      
      setHasConsented(true);
      setIsOpen(false);
      onConsent();
    } catch (error) {
      toast.error("Failed to save consent");
    } finally {
      setIsLoading(false);
    }
  };

  const getOperationLabel = () => {
    switch (operation) {
      case "transcription": return "Transcription";
      case "aiGrouping": return "AI Grouping";
      case "aiRename": return "AI Rename";
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && setIsOpen(true)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Privacy & Consent
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                You are about to use <strong>{getOperationLabel()}</strong>. 
                Please read and accept our privacy terms to continue.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Data Usage</p>
                  <p className="text-xs text-muted-foreground">
                    Your audio/transcription data is processed securely and stored only for your project. 
                    We do not use your data to train AI models or share with third parties.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">GDPR Compliance</p>
                  <p className="text-xs text-muted-foreground">
                    You have the right to access, delete, or export your data at any time. 
                    Your data is stored in EU-compliant data centers.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setIsOpen(false);
                  toast.info("Feature requires GDPR consent");
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Decline
              </Button>
              <Button 
                className="flex-1"
                onClick={handleConsent}
                disabled={isLoading}
              >
                <Check className="w-4 h-4 mr-2" />
                {isLoading ? "Processing..." : "Accept & Continue"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export async function checkConsentAndCredits(operation: "transcription" | "aiGrouping" | "aiRename") {
  // Initialize credits first
  const initMutation = api.credits.initializeCredits;
  
  // This would be called from the component to trigger the flow
  return { needsConsent: false, hasCredits: true };
}