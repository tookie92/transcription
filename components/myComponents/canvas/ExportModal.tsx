"use client";

import React, { useState, useCallback } from "react";
import { AffinityGroup as AffinityGroupType, Insight } from "@/types";
import { 
  Download, 
  FileImage, 
  FileText, 
  FileJson, 
  Share2, 
  Link,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExportOptions {
  includeInsights: boolean;
  includeColors: boolean;
  includeVotingResults: boolean;
  format: "png" | "pdf" | "json" | "csv";
}

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusters: AffinityGroupType[];
  insights: Insight[];
  projectName: string;
  onExport: (options: ExportOptions) => void;
  onShare: (includeInsights: boolean) => string;
}

const EXPORT_FORMATS = [
  {
    id: "png",
    label: "Image (PNG)",
    description: "High-quality screenshot of the affinity map",
    icon: FileImage,
    color: "text-blue-500",
  },
  {
    id: "pdf",
    label: "PDF Document",
    description: "Printable document with all clusters and insights",
    icon: FileText,
    color: "text-red-500",
  },
  {
    id: "json",
    label: "JSON Data",
    description: "Raw data for integration with other tools",
    icon: FileJson,
    color: "text-yellow-500",
  },
  {
    id: "csv",
    label: "CSV Spreadsheet",
    description: "Insights in spreadsheet format",
    icon: FileText,
    color: "text-green-500",
  },
];

export function ExportModal({
  open,
  onOpenChange,
  clusters,
  insights,
  projectName,
  onExport,
  onShare,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportOptions["format"]>("png");
  const [includeInsights, setIncludeInsights] = useState(true);
  const [includeColors, setIncludeColors] = useState(true);
  const [includeVotingResults, setIncludeVotingResults] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const handleExport = useCallback(() => {
    const options: ExportOptions = {
      format,
      includeInsights,
      includeColors,
      includeVotingResults,
    };
    onExport(options);
    toast.success(`Exporting as ${format.toUpperCase()}...`);
    onOpenChange(false);
  }, [format, includeInsights, includeColors, includeVotingResults, onExport, onOpenChange]);

  const handleShare = useCallback(() => {
    const generatedLink = onShare(includeInsights);
    setShareLink(generatedLink);
    toast.success("Share link generated!");
  }, [includeInsights, onShare]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setLinkCopied(false), 2000);
  }, [shareLink]);

  const totalInsights = clusters.reduce((sum, c) => sum + c.insightIds.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export & Share
          </DialogTitle>
          <DialogDescription>
            Export your affinity map or share it with stakeholders
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="export" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="share" className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </TabsTrigger>
          </TabsList>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Format</label>
              <div className="grid grid-cols-2 gap-2">
                {EXPORT_FORMATS.map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setFormat(fmt.id as ExportOptions["format"])}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      format === fmt.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <fmt.icon className={cn("w-5 h-5 mb-2", fmt.color)} />
                    <div className="text-sm font-medium">{fmt.label}</div>
                    <div className="text-xs text-muted-foreground">{fmt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Options</label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-insights" className="flex-1">
                    Include insights
                  </Label>
                  <Switch
                    id="include-insights"
                    checked={includeInsights}
                    onCheckedChange={setIncludeInsights}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-colors" className="flex-1">
                    Include cluster colors
                  </Label>
                  <Switch
                    id="include-colors"
                    checked={includeColors}
                    onCheckedChange={setIncludeColors}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-voting" className="flex-1">
                    Include voting results
                  </Label>
                  <Switch
                    id="include-voting"
                    checked={includeVotingResults}
                    onCheckedChange={setIncludeVotingResults}
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-3 bg-muted rounded-lg text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Clusters</span>
                <span>{clusters.length}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Insights</span>
                <span>{totalInsights}</span>
              </div>
            </div>
          </TabsContent>

          {/* Share Tab */}
          <TabsContent value="share" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Share Link</label>
              <p className="text-sm text-muted-foreground">
                Generate a shareable link for stakeholders to view your affinity map.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="share-insights" className="flex-1">
                  Include insights
                </Label>
                <Switch
                  id="share-insights"
                  checked={includeInsights}
                  onCheckedChange={setIncludeInsights}
                />
              </div>
            </div>

            {shareLink ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input value={shareLink} readOnly className="flex-1" />
                  <Button onClick={handleCopyLink} variant="outline" size="icon">
                    {linkCopied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This link will expire in 7 days.
                </p>
              </div>
            ) : (
              <Button onClick={handleShare} className="w-full">
                <Link className="w-4 h-4 mr-2" />
                Generate Share Link
              </Button>
            )}

            <div className="border-t pt-4 space-y-2">
              <h4 className="text-sm font-medium">What stakeholders will see:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Read-only view of all clusters
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Cluster colors and titles
                </li>
                {includeInsights && (
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    All insights with sources
                  </li>
                )}
              </ul>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useExport() {
  const exportAsPNG = useCallback(async (
    elementRef: React.RefObject<HTMLElement>,
    filename: string
  ) => {
    // Placeholder for html2canvas or similar
    toast.info("PNG export coming soon - requires html2canvas library");
  }, []);

  const exportAsJSON = useCallback((
    clusters: AffinityGroupType[],
    insights: Insight[],
    options: ExportOptions
  ) => {
    const data = {
      exportDate: new Date().toISOString(),
      clusters: clusters.map((c) => ({
        id: c.id,
        title: c.title,
        color: options.includeColors ? c.color : undefined,
        position: c.position,
        insightIds: c.insightIds,
        insights: options.includeInsights
          ? c.insightIds.map((id) => insights.find((i) => i.id === id))
          : undefined,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "affinity-map.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as JSON!");
  }, []);

  const exportAsCSV = useCallback((
    clusters: AffinityGroupType[],
    insights: Insight[]
  ) => {
    const rows = [
      ["Cluster", "Color", "Insight", "Type", "Source"],
    ];

    clusters.forEach((cluster) => {
      const clusterInsights = cluster.insightIds
        .map((id) => insights.find((i) => i.id === id))
        .filter(Boolean);

      if (clusterInsights.length === 0) {
        rows.push([cluster.title, cluster.color, "", "", ""]);
      } else {
        clusterInsights.forEach((insight) => {
          rows.push([
            cluster.title,
            cluster.color,
            insight!.text,
            insight!.type,
            insight!.source,
          ]);
        });
      }
    });

    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "affinity-map.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as CSV!");
  }, []);

  return { exportAsPNG, exportAsJSON, exportAsCSV };
}
