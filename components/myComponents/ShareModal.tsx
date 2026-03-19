"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  Lock, 
  Globe,
  X,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ShareModalProps {
  interviewId: Id<"interviews">;
}

export function ShareModal({ interviewId }: ShareModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  
  const shareStatus = useQuery(api.sharing.getShareStatus, { interviewId });
  const createLink = useMutation(api.sharing.createShareableLink);
  const revokeLink = useMutation(api.sharing.revokeShareableLink);
  
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateLink = async () => {
    setIsCreating(true);
    try {
      await createLink({
        interviewId,
        password: usePassword ? password : undefined,
      });
      toast.success("Shareable link created!");
    } catch (error) {
      toast.error("Failed to create link");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeLink = async () => {
    try {
      await revokeLink({ interviewId });
      toast.success("Link revoked");
    } catch (error) {
      toast.error("Failed to revoke link");
    }
  };

  const handleCopyLink = () => {
    if (shareStatus?.shareUrl) {
      navigator.clipboard.writeText(window.location.origin + shareStatus.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const fullUrl = shareStatus?.shareUrl ? `${baseUrl}${shareStatus.shareUrl}` : "";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Interview</DialogTitle>
          <DialogDescription>
            Create a public link to share insights with stakeholders
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {shareStatus?.isShared ? (
            // Link already exists
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                <Globe className="w-4 h-4" />
                <span>This interview is publicly shared</span>
              </div>
              
              <div className="flex gap-2">
                <Input 
                  value={fullUrl} 
                  readOnly 
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {shareStatus.hasPassword && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <Lock className="w-4 h-4" />
                  <span>Password protected</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => window.open(fullUrl, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Link
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1"
                  onClick={handleRevokeLink}
                >
                  <X className="w-4 h-4 mr-2" />
                  Revoke
                </Button>
              </div>
            </div>
          ) : (
            // Create new link
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Link Settings</label>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="usePassword"
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="usePassword" className="text-sm flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password protect
                  </label>
                </div>

                {usePassword && (
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}
              </div>

              <Button 
                className="w-full" 
                onClick={handleCreateLink}
                disabled={isCreating || (usePassword && !password)}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Create Shareable Link
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
