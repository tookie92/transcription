"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, FileText, Image } from "lucide-react";

interface ExportPanelProps {
  children?: React.ReactNode;
  canvasRef?: React.RefObject<HTMLElement | null>;
  projectName?: string;
}

export function ExportPanel({ children, canvasRef, projectName }: ExportPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<"pdf" | "png">("pdf");

  const handleExportPNG = async () => {
    if (!canvasRef?.current) return;
    
    setIsExporting(true);
    try {
      const canvas = canvasRef.current;
      const { default: html2canvas } = await import("html2canvas");
      
      const canvasImage = await html2canvas(canvas, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      
      const link = document.createElement("a");
      link.download = `${projectName || "affinity-map"}-${Date.now()}.png`;
      link.href = canvasImage.toDataURL("image/png");
      link.click();
      
      setIsOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!canvasRef?.current) return;
    
    setIsExporting(true);
    try {
      const canvas = canvasRef.current;
      const { default: html2canvas } = await import("html2canvas");
      const jsPDF = (await import("jspdf")).default;
      
      const canvasImage = await html2canvas(canvas, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      
      const imgWidth = canvasImage.width;
      const imgHeight = canvasImage.height;
      const margin = 10;
      const pdfWidth = 210 - margin * 2;
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;
      
      const pdf = new jsPDF({
        orientation: pdfHeight > 297 ? "portrait" : "landscape",
        unit: "mm",
        format: "a4",
      });
      
      const imgData = canvasImage.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", margin, margin, pdfWidth, pdfHeight);
      pdf.save(`${projectName || "affinity-map"}-${Date.now()}.pdf`);
      
      setIsOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = () => {
    if (exportType === "pdf") {
      handleExportPDF();
    } else {
      handleExportPNG();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" title="Exporter">
            <Download className="w-5 h-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Exporter la carte
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setExportType("png")}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                exportType === "png" 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Image className="w-8 h-8 text-primary" />
              <span className="text-sm font-medium">PNG</span>
              <span className="text-xs text-muted-foreground">Image haute résolution</span>
            </button>
            
            <button
              onClick={() => setExportType("pdf")}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                exportType === "pdf" 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              }`}
            >
              <FileText className="w-8 h-8 text-primary" />
              <span className="text-sm font-medium">PDF</span>
              <span className="text-xs text-muted-foreground">Document imprimable</span>
            </button>
          </div>
          
          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? "Exportation..." : `Exporter en ${exportType.toUpperCase()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
