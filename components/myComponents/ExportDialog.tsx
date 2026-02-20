
import { useExport } from '@/hooks/useExport';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDown, FileText, Download } from 'lucide-react';

import { ExportInterview } from '@/types';
import { toast } from 'sonner';

interface ExportDialogProps {
  interview: ExportInterview;
  trigger?: React.ReactNode;
}

export function ExportDialog({ interview, trigger }: ExportDialogProps) {
  const { exportAsMarkdown, exportAsPDF } = useExport();

   const handleExportPDF = () => {
    toast.info("Generating PDF...");
    exportAsPDF(interview);
    toast.success("PDF downloaded successfully!");
  };

   const handleExportJSON = () => {
    toast.info("Generating JSON...");
    exportAsMarkdown(interview);
    toast.success("JSON downloaded successfully!");
  };


  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Interview</DialogTitle>
          <DialogDescription>
            Choose your preferred format to export this interview
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {/* PDF Export */}
          <Button
            onClick={handleExportPDF}
            className="w-full justify-start gap-3 h-auto py-4"
            variant="outline"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950">
              <FileDown className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium">Export as PDF</span>
              <span className="text-xs text-gray-500">
                Professional format with formatting
              </span>
            </div>
          </Button>

          {/* JSON Export */}
          <Button
            onClick={handleExportJSON}
            className="w-full justify-start gap-3 h-auto py-4"
            variant="outline"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium">Export as JSON</span>
              <span className="text-xs text-gray-500">
                Structured data for backup
              </span>
            </div>
          </Button>
        </div>

        <div className="pt-3 border-t">
          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-medium">{`What's included`}:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Full transcription with timestamps</li>
              <li>All insights categorized by type</li>
              <li>Interview statistics and metadata</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}