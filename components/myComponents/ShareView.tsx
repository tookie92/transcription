"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Lightbulb, 
  Quote, 
  AlertCircle, 
  HelpCircle,
  FileText,
  CheckCircle2,
  Loader2,
  Lock,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface ShareViewProps {
  token: string;
}

const insightTypeConfig = {
  "pain-point": { 
    label: "Pain Point", 
    icon: AlertCircle, 
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    border: "border-red-200 dark:border-red-800"
  },
  "quote": { 
    label: "Quote", 
    icon: Quote, 
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800"
  },
  "insight": { 
    label: "Insight", 
    icon: Lightbulb, 
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800"
  },
  "follow-up": { 
    label: "Follow-up", 
    icon: HelpCircle, 
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800"
  },
  "custom": { 
    label: "Custom", 
    icon: FileText, 
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-800"
  },
};

export function ShareView({ token }: ShareViewProps) {
  const [password, setPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  const data = useQuery(api.sharing.getShareableInterview, { shareToken: token });
  const verifyPassword = useQuery(
    api.sharing.verifySharePassword,
    hasPassword && password ? { shareToken: token, password } : "skip"
  );

  // Determine if we should show the content
  const showContent = data && !("error" in data) && (!data.interview.sharePassword || verifyPassword?.valid);

  useEffect(() => {
    if (data && !("error" in data)) {
      setHasPassword(!!data.interview.sharePassword);
      if (!data.interview.sharePassword) {
        setShowPasswordInput(false);
      }
    }
  }, [data]);

  const handlePasswordSubmit = () => {
    if (!password) return;
    setIsVerifying(true);
    // Trigger re-fetch with password
    setHasPassword(true);
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if ("error" in data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Link Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This shareable link has expired. Please request a new one from the researcher.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password protected and no valid password
  if (data.interview.sharePassword && !verifyPassword?.valid && hasPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Password Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This research is password protected. Enter the password to view.
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
              />
              <Button onClick={handlePasswordSubmit}>
                {isVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Verify"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show password input initially if protected
  if (data.interview.sharePassword && !hasPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Password Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This research is password protected. Enter the password to view.
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
              />
              <Button onClick={handlePasswordSubmit}>
                Verify
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { interview, insights, projectName } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logomark.svg" 
              alt="Skripta" 
              className="w-8 h-8" 
            />
            <div>
              <p className="text-sm text-muted-foreground">{projectName}</p>
              <h1 className="font-semibold">{interview.title}</h1>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <FileText className="w-3 h-3" />
            Research Report
          </Badge>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Summary Section */}
        {interview.summary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Overview</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {interview.summary.executiveSummary}
                </p>
              </div>

              {interview.summary.mainThemes.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Main Themes</h3>
                  <div className="flex flex-wrap gap-2">
                    {interview.summary.mainThemes.map((theme, i) => (
                      <Badge key={i} variant="secondary">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {interview.summary.keyPoints.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Key Findings</h3>
                  <ul className="space-y-2">
                    {interview.summary.keyPoints.map((point, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-primary font-medium">{i + 1}.</span>
                        <span className="text-muted-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {interview.summary.recommendations.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Recommendations</h3>
                  <ul className="space-y-2">
                    {interview.summary.recommendations.map((rec, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                        <span className="text-muted-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Insights Section */}
        {insights && insights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Key Insights ({insights.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {insights.map((insight) => {
                  const config = insightTypeConfig[insight.type] || insightTypeConfig.custom;
                  const Icon = config.icon;
                  
                  return (
                    <div 
                      key={insight._id}
                      className={`p-4 rounded-lg border ${config.border} bg-card`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${config.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={`text-xs ${config.color}`}>
                              {config.label}
                            </Badge>
                            {insight.priority && (
                              <Badge variant="outline" className="text-xs">
                                {insight.priority}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{insight.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-8 border-t">
          <p className="text-sm text-muted-foreground">
            Powered by{" "}
            <a 
              href="/" 
              target="_blank" 
              className="text-primary hover:underline"
            >
              Skripta
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
