// components/ExportPanel.tsx - VERSION CORRIGÉE
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Download, FileText, Image, Code, Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { type ExportMapData } from '@/utils/exportFormatters';
import { generatePdfReport, canGeneratePdf, getPdfStats } from '@/utils/pdfGenerator';

interface ExportPanelProps {
  mapId: string;
  projectId: string;
  onClose?: () => void;
}

type ExportFormat = 'json' | 'pdf' | 'png';

export function ExportPanel({ mapId, projectId, onClose }: ExportPanelProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const mapData = useQuery(api.export.exportMapData, { 
    mapId: mapId as Id<"affinityMaps"> 
  });

  const projectData = useQuery(api.projects.getById, { 
    projectId: projectId as Id<"projects"> 
  });
  
  const insightsData = useQuery(api.insights.getByProject, { 
    projectId: projectId as Id<"projects"> 
  });

  const handleExport = async (): Promise<void> => {
    if (!mapData) {
      toast.error("No data available for export");
      return;
    }

    setIsExporting(true);

    try {
      switch (selectedFormat) {
        case 'json':
          await exportAsJson(mapData);
          break;
        case 'pdf':
          await exportAsPdf();
          break;
        case 'png':
          await exportAsPng();
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to export as ${selectedFormat.toUpperCase()}: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsJson = async (data: ExportMapData): Promise<void> => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `affinity-map-${data.map.name}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Map exported as JSON");
  };

  const exportAsPdf = async (): Promise<void> => {
    if (!mapData || !insightsData) {
      throw new Error("No data available for PDF export");
    }

    if (!canGeneratePdf(mapData.map.groups)) {
      throw new Error("No groups available for PDF export");
    }

    generatePdfReport({
      title: mapData.map.name,
      projectName: projectData?.name,
      groups: mapData.map.groups,
      insights: insightsData
    });

    toast.success("PDF generated successfully!");
  };

  const exportAsPng = async (): Promise<void> => {
    toast.info("PNG export will be implemented in next phase");
  };

  const copyJsonToClipboard = async (): Promise<void> => {
    if (!mapData) return;
    
    const jsonString = JSON.stringify(mapData, null, 2);
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopiedJson(true);
      toast.success("JSON copied to clipboard");
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  // 🆕 CORRECTION : GESTIONNAIRE DE CLICK SÉPARÉ
  const handleFormatSelect = (formatValue: ExportFormat, isAvailable: boolean): void => {
    if (isAvailable) {
      setSelectedFormat(formatValue);
    }
  };

  const pdfStats = mapData && insightsData ? 
    getPdfStats(mapData.map.groups, insightsData) : null;

  const formatOptions = [
    {
      value: 'json' as ExportFormat,
      label: 'JSON',
      icon: <Code size={18} />,
      description: 'Structured data for backup and sharing',
      available: true
    },
    {
      value: 'pdf' as ExportFormat,
      label: 'PDF Report',
      icon: <FileText size={18} />,
      description: 'Professional document with all insights',
      available: true
    },
    // {
    //   value: 'png' as ExportFormat,
    //   label: 'PNG Image',
    //   icon: <Image size={18} />,
    //   description: 'Visual snapshot of the current view',
    //   available: false
    // }
  ];

  if (!mapData) {
    return (
      <Card className="w-80">
        <CardHeader>
          <CardTitle>Export Map</CardTitle>
          <CardDescription>Loading map data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-80 mb-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download size={20} />
          Export Map
        </CardTitle>
        <CardDescription>
          Export your affinity map in different formats
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Format Selection - VERSION CORRIGÉE */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-900">Export Format</h4>
          <div className="grid gap-2">
            {formatOptions.map((format) => (
              <button
                key={format.value}
                onClick={() => handleFormatSelect(format.value, format.available)}
                disabled={!format.available}
                className={`p-3 border rounded-lg text-left transition-all ${
                  selectedFormat === format.value
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-20'
                    : format.available
                    ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className={`p-2 rounded ${
                    selectedFormat === format.value 
                      ? 'bg-blue-100 text-blue-600' 
                      : format.available
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {format.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{format.label}</span>
                      {!format.available && (
                        <Badge variant="outline" className="text-xs">Soon</Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">{format.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Map Info */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h5 className="font-medium text-sm text-gray-900 mb-2">Map Details</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium">{mapData.map.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Groups:</span>
              <Badge variant="secondary">{mapData.map.groups.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Insights:</span>
              <Badge variant="secondary">
                {mapData.map.groups.reduce((sum, group) => sum + group.insightIds.length, 0)}
              </Badge>
            </div>
          </div>
        </div>

        {/* PDF Preview */}
        {selectedFormat === 'pdf' && pdfStats && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-blue-600" />
              <span className="font-medium text-blue-900 text-sm">PDF Report Includes:</span>
            </div>
            <div className="text-xs text-blue-800 space-y-1">
              <div>• Professional cover page</div>
              <div>• Project statistics</div>
              <div>• {pdfStats.groupCount} theme groups</div>
              <div>• {pdfStats.totalInsights} total insights</div>
              <div>• Insight type distribution</div>
            </div>
          </div>
        )}

        {/* JSON Preview */}
        {selectedFormat === 'json' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-sm text-gray-900">JSON Preview</h5>
              <Button
                variant="outline"
                size="sm"
                onClick={copyJsonToClipboard}
                className="h-7 text-xs"
              >
                {copiedJson ? <Check size={12} /> : <Copy size={12} />}
                {copiedJson ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <div className="p-2 bg-gray-100 rounded border border-gray-200 max-h-32 overflow-y-auto">
              <pre className="text-xs text-gray-600">
                {JSON.stringify({
                  name: mapData.map.name,
                  groups: mapData.map.groups.length,
                  insights: mapData.map.groups.reduce((sum, group) => sum + group.insightIds.length, 0)
                }, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleExport}
            disabled={isExporting || !formatOptions.find(f => f.value === selectedFormat)?.available}
            className="flex-1"
          >
            {isExporting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download size={16} className="mr-2" />
                Export as {selectedFormat.toUpperCase()}
              </>
            )}
          </Button>
          
          {onClose && (
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 text-center">
          {selectedFormat === 'pdf' 
            ? 'PDF format creates a professional report perfect for presentations'
            : 'JSON format recommended for backup and data sharing'
          }
        </div>
      </CardContent>
    </Card>
  );
}