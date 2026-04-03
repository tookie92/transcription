// utils/exportFormatters.ts - version corrigée

// Types pour l'export/import
export interface ExportCluster {
  id: string;
  title: string;
  color: string;
  position: { x: number; y: number };
  insightIds: string[];
}

export interface ExportMap {
  name: string;
  description?: string;
  clusters: ExportCluster[];
}

// ✅ Version avec literal type pour correspondre à Convex
export interface ExportMapData {
  version: "1.0";
  exportedAt: number;
  map: ExportMap;
}

// Type guard pour valider la structure
const isExportCluster = (obj: unknown): obj is ExportCluster => {
  if (!obj || typeof obj !== 'object') return false;
  
  const cluster = obj as Record<string, unknown>;
  return (
    typeof cluster.id === 'string' &&
    typeof cluster.title === 'string' &&
    typeof cluster.color === 'string' &&
    typeof cluster.position === 'object' &&
    cluster.position !== null &&
    typeof (cluster.position as Record<string, unknown>).x === 'number' &&
    typeof (cluster.position as Record<string, unknown>).y === 'number' &&
    Array.isArray(cluster.insightIds) &&
    cluster.insightIds.every((id: unknown) => typeof id === 'string')
  );
};

const isExportMap = (obj: unknown): obj is ExportMap => {
  if (!obj || typeof obj !== 'object') return false;
  
  const map = obj as Record<string, unknown>;
  return (
    typeof map.name === 'string' &&
    (map.description === undefined || typeof map.description === 'string') &&
    Array.isArray(map.clusters) &&
    map.clusters.every(isExportCluster)
  );
};

const isExportMapData = (obj: unknown): obj is ExportMapData => {
  if (!obj || typeof obj !== 'object') return false;
  
  const data = obj as Record<string, unknown>;
  return (
    data.version === "1.0" && // ✅ Vérification du literal
    typeof data.exportedAt === 'number' &&
    isExportMap(data.map)
  );
};

// Formateur JSON
export const formatJsonExport = (data: ExportMapData): string => {
  return JSON.stringify(data, null, 2);
};

// Validation des données d'import
export const validateImportFile = (content: string): { isValid: boolean; data?: ExportMapData; errors: string[] } => {
  const errors: string[] = [];

  try {
    const parsed = JSON.parse(content);

    if (!isExportMapData(parsed)) {
      errors.push('Invalid export file structure');
      
      // Validation détaillée pour aider au debug
      const data = parsed as Record<string, unknown>;
      
      if (data.version !== "1.0") {
        errors.push(`Unsupported version: ${data.version}. Expected: 1.0`);
      }
      
      if (typeof data.exportedAt !== 'number') {
        errors.push('Missing or invalid export timestamp');
      }
      
      if (!data.map || typeof data.map !== 'object') {
        errors.push('Missing map data');
      } else {
        const mapData = data.map as Record<string, unknown>;
        
        if (typeof mapData.name !== 'string') {
          errors.push('Missing or invalid map name');
        }
        
        if (!Array.isArray(mapData.clusters)) {
          errors.push('Missing or invalid clusters array');
        } else {
          mapData.clusters.forEach((cluster: unknown, index: number) => {
            if (!isExportCluster(cluster)) {
              errors.push(`Cluster ${index + 1}: Invalid cluster structure`);
            }
          });
        }
      }
      
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      data: parsed,
      errors: []
    };

  } catch (error) {
    errors.push(`JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors };
  }
};

// Générer un nom de fichier d'export
export const generateExportFilename = (mapName: string, format: string): string => {
  const timestamp = new Date().toISOString().split('T')[0];
  const sanitizedName = mapName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `affinity_map_${sanitizedName}_${timestamp}.${format}`;
};

// ✅ Fonction utilitaire pour créer des données d'export
export const createExportData = (mapName: string, clusters: ExportCluster[], description?: string): ExportMapData => {
  return {
    version: "1.0",
    exportedAt: Date.now(),
    map: {
      name: mapName,
      description,
      clusters,
    },
  };
};