"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Globe,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  Settings2,
  FileText,
  Lightbulb,
  Sparkles,
  BookmarkPlus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareProjectModalProps {
  projectId: Id<"projects">;
  projectName: string;
}

interface InterviewConfig {
  showSummary: boolean;
  showInsights: boolean;
  showTranscriptExcerpts: boolean;
  maxExcerpts: number;
}

export function ShareProjectModal({ projectId, projectName }: ShareProjectModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [includeCrossThemes, setIncludeCrossThemes] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Interview selection
  const [selectedInterviews, setSelectedInterviews] = useState<Set<Id<"interviews">>>(new Set());
  const [interviewConfigs, setInterviewConfigs] = useState<Record<string, InterviewConfig>>({});

  const interviews = useQuery(api.interviews.getProjectInterviews, { projectId });
  const shareStatus = useQuery(api.projectSharing.getProjectShareStatus, { projectId });
  const templates = useQuery(api.projectSharing.getShareTemplates, { projectId });
  const createLink = useMutation(api.projectSharing.createProjectShareLink);
  const revokeLink = useMutation(api.projectSharing.revokeProjectShareLink);

  // Auto-select all completed interviews
  useMemo(() => {
    if (interviews && selectedInterviews.size === 0) {
      const completedIds = interviews
        .filter((i) => i.status === "ready" || i.status === "completed")
        .map((i) => i._id);
      setSelectedInterviews(new Set(completedIds));

      // Set default configs
      const configs: Record<string, InterviewConfig> = {};
      completedIds.forEach((id) => {
        configs[id] = {
          showSummary: true,
          showInsights: true,
          showTranscriptExcerpts: true,
          maxExcerpts: 5,
        };
      });
      setInterviewConfigs(configs);
    }
  }, [interviews]);

  const handleCreateLink = async () => {
    if (selectedInterviews.size === 0) {
      toast.error("Select at least one interview");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createLink({
        projectId,
        interviewIds: Array.from(selectedInterviews),
        includeCrossThemes,
        interviewConfig: interviewConfigs,
        password: usePassword ? password : undefined,
        saveAsTemplate: saveAsTemplate && templateName ? true : undefined,
        templateName: templateName || undefined,
      });
      toast.success("Shareable link created!");
      setIsOpen(false);
      // Refresh status
    } catch (error) {
      toast.error("Failed to create link");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeLink = async (shareToken: string) => {
    try {
      await revokeLink({ shareToken });
      toast.success("Link revoked");
    } catch (error) {
      toast.error("Failed to revoke link");
    }
  };

  const handleCopyLink = (shareUrl: string) => {
    navigator.clipboard.writeText(window.location.origin + shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleInterview = (interviewId: Id<"interviews">) => {
    setSelectedInterviews((prev) => {
      const next = new Set(prev);
      if (next.has(interviewId)) {
        next.delete(interviewId);
      } else {
        next.add(interviewId);
        // Add default config if new
        if (!interviewConfigs[interviewId]) {
          setInterviewConfigs((configs) => ({
            ...configs,
            [interviewId]: {
              showSummary: true,
              showInsights: true,
              showTranscriptExcerpts: true,
              maxExcerpts: 5,
            },
          }));
        }
      }
      return next;
    });
  };

  const updateInterviewConfig = (interviewId: string, config: Partial<InterviewConfig>) => {
    setInterviewConfigs((prev) => ({
      ...prev,
      [interviewId]: {
        ...prev[interviewId],
        ...config,
      },
    }));
  };

  const selectAll = () => {
    if (interviews) {
      setSelectedInterviews(new Set(interviews.map((i) => i._id)));
    }
  };

  const selectNone = () => {
    setSelectedInterviews(new Set());
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Share Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share {projectName}
          </DialogTitle>
          <DialogDescription>
            Create a shareable dashboard for stakeholders with selected interviews and insights
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Existing Links */}
          {shareStatus && shareStatus.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-green-500" />
                    Active Links
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="text-xs"
                  >
                    <BookmarkPlus className="w-3 h-3 mr-1" />
                    Templates
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {shareStatus.map((link) => (
                  <div
                    key={link.shareToken}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm truncate">{link.shareUrl}</span>
                        {link.hasPassword && <Lock className="w-3 h-3 text-amber-500" />}
                        <Badge variant="secondary" className="text-xs">
                          {link.interviewCount} interviews
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(link.createdAt).toLocaleDateString()}
                        {link.expiresAt && ` • Expires ${new Date(link.expiresAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCopyLink(link.shareUrl)}
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(link.shareUrl, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleRevokeLink(link.shareToken)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Templates Section */}
          {showTemplates && templates && templates.length > 0 && (
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  <BookmarkPlus className="w-4 h-4 inline mr-2" />
                  Saved Templates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <span className="text-sm">{template.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {template.interviewCount} interviews
                      </Badge>
                      {template.includeCrossThemes && (
                        <Badge variant="outline" className="text-xs">
                          Cross-themes
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Interview Selection */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Select Interviews
                  <Badge variant="secondary">{selectedInterviews.size} selected</Badge>
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={selectNone} className="text-xs">
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
              {interviews?.map((interview) => (
                <div
                  key={interview._id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg transition-colors",
                    selectedInterviews.has(interview._id)
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={selectedInterviews.has(interview._id)}
                    onCheckedChange={() => toggleInterview(interview._id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{interview.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {interview.status === "ready" || interview.status === "completed"
                        ? "Ready to share"
                        : interview.status}
                    </p>
                  </div>
                  {selectedInterviews.has(interview._id) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAdvanced(true);
                      }}
                    >
                      <Settings2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="crossThemes"
                  checked={includeCrossThemes}
                  onCheckedChange={(checked) => setIncludeCrossThemes(checked as boolean)}
                />
                <div className="flex-1">
                  <label htmlFor="crossThemes" className="text-sm font-medium cursor-pointer">
                    Include cross-interview themes
                  </label>
                  <p className="text-xs text-muted-foreground">
                    AI-generated themes that appear across multiple interviews
                  </p>
                </div>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="password"
                  checked={usePassword}
                  onCheckedChange={(checked) => setUsePassword(checked as boolean)}
                />
                <div className="flex-1">
                  <label htmlFor="password" className="text-sm font-medium cursor-pointer">
                    Password protection
                  </label>
                </div>
                <Lock className="w-4 h-4 text-amber-500" />
              </div>

              {usePassword && (
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ml-8"
                />
              )}

              <div className="flex items-center gap-3">
                <Checkbox
                  id="template"
                  checked={saveAsTemplate}
                  onCheckedChange={(checked) => setSaveAsTemplate(checked as boolean)}
                />
                <div className="flex-1">
                  <label htmlFor="template" className="text-sm font-medium cursor-pointer">
                    Save as template
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Reuse this configuration for future shares
                  </p>
                </div>
                <BookmarkPlus className="w-4 h-4 text-blue-500" />
              </div>

              {saveAsTemplate && (
                <Input
                  placeholder="Template name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="ml-8"
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateLink}
            disabled={selectedInterviews.size === 0 || isCreating}
            className="gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Create Share Link
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
