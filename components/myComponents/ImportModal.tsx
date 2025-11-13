// components/ImportModal.tsx - version corrigée
"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Upload, FileText, AlertCircle, CheckCircle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { validateImportFile, type ExportMapData } from '@/utils/exportFormatters';


interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onImportSuccess?: (mapId: string) => void;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function ImportModal({ open, onOpenChange, projectId, onImportSuccess }: ImportModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importData, setImportData] = useState<ExportMapData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMapData = useMutation(api.export.importMapData);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setValidationResult(null);
    setImportData(null);

    try {
      const fileContent = await readFileAsText(file);
      
      // Utiliser la validation locale
      const validation = validateImportFile(fileContent);
      setValidationResult(validation);

      if (validation.isValid && validation.data) {
        setImportData(validation.data);
        toast.success("File validated successfully");
      } else {
        toast.error("Invalid file format");
      }
    } catch (error) {
      console.error('File processing error:', error);
      setValidationResult({
        isValid: false,
        errors: ['Failed to read file. Please check the file format.']
      });
      toast.error("Failed to process file");
    } finally {
      setIsLoading(false);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleImport = async () => {
    if (!importData || !validationResult?.isValid) return;

    setIsLoading(true);

    try {
      const mapId = await importMapData({
        projectId: projectId as Id<"projects">,
        importData // ✅ Maintenant le typage est correct
      });

      toast.success("Map imported successfully!");
      onImportSuccess?.(mapId);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Import error:', error);
      toast.error("Failed to import map");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setImportData(null);
    setValidationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={20} />
            Import Affinity Map
          </DialogTitle>
          <DialogDescription>
            Upload a previously exported JSON file to import a map
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Area */}
          <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
            <CardContent className="p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isLoading}
              />
              
              {isLoading ? (
                <div className="space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                  <div>
                    <p className="font-medium text-gray-900">Processing file...</p>
                    <p className="text-sm text-gray-600">Validating your map data</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full space-y-3 focus:outline-none"
                >
                  <div className="p-3 bg-blue-50 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                    <Upload className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Click to upload</p>
                    <p className="text-sm text-gray-600">or drag and drop</p>
                    <p className="text-xs text-gray-500 mt-1">JSON files only</p>
                  </div>
                </button>
              )}
            </CardContent>
          </Card>

          {/* Validation Results */}
          {validationResult && (
            <div className="space-y-3">
              <Alert variant={validationResult.isValid ? "default" : "destructive"}>
                {validationResult.isValid ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {validationResult.isValid 
                    ? "File is valid and ready to import" 
                    : "Please fix the following issues:"}
                </AlertDescription>
              </Alert>

              {!validationResult.isValid && (
                <div className="space-y-2">
                  {validationResult.errors.map((error, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-red-600">
                      <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Import Data Preview */}
          {importData && validationResult?.isValid && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-medium text-sm text-gray-900">Map Preview</h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <p className="font-medium truncate">{importData.map.name}</p>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">Groups:</span>
                    <Badge variant="secondary">{importData.map.groups.length}</Badge>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">Total Insights:</span>
                    <Badge variant="secondary">
                      {importData.map.groups.reduce((sum, group) => sum + group.insightIds.length, 0)}
                    </Badge>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">Exported:</span>
                    <p className="text-xs text-gray-600">
                      {new Date(importData.exportedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {importData.map.description && (
                  <div>
                    <span className="text-gray-600 text-sm">Description:</span>
                    <p className="text-sm text-gray-700 mt-1">{importData.map.description}</p>
                  </div>
                )}

                {/* Groups Preview */}
                <div className="space-y-2">
                  <span className="text-gray-600 text-sm">Groups:</span>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {importData.map.groups.slice(0, 10).map((group) => (
                      <Badge 
                        key={group.id} 
                        variant="outline"
                        className="text-xs"
                        style={{ borderLeftColor: group.color, borderLeftWidth: '3px' }}
                      >
                        {group.title}
                      </Badge>
                    ))}
                    {importData.map.groups.length > 10 && (
                      <Badge variant="secondary" className="text-xs">
                        +{importData.map.groups.length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleImport}
              disabled={!importData || !validationResult?.isValid || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Import Map
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-500 text-center">
            Only files exported from this tool are supported
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}