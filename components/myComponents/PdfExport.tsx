// components/PdfExport.tsx - VERSION CORRIGÉE
"use client";

import { useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { AffinityGroup, Insight, ConvexInsight } from "@/types";
import { normalizeGroupColorsForPdf } from "@/utils/colorFormatter";

interface PdfExportProps {
  groups: AffinityGroup[];
  insights: (Insight | ConvexInsight)[];
  mapName: string;
  projectName?: string;
  onExportComplete?: () => void;
  onExportError?: (error: string) => void;
}

export function PdfExport({ 
  groups, 
  insights, 
  mapName, 
  projectName, 
  onExportComplete, 
  onExportError 
}: PdfExportProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // 🆕 NORMALISER LES COULEURS AVANT TOUTE UTILISATION
  const normalizedGroups = normalizeGroupColorsForPdf(groups);

  const normalizeInsights = (insights: (Insight | ConvexInsight)[]): Insight[] => {
    return insights.map(insight => {
      if ('_id' in insight) {
        return {
          id: insight._id,
          interviewId: insight.interviewId,
          projectId: insight.projectId,
          type: insight.type,
          text: insight.text,
          timestamp: insight.timestamp,
          source: insight.source,
          createdBy: insight.createdBy,
          createdByName: 'User',
          createdAt: new Date(insight.createdAt).toISOString(),
          tags: insight.tags,
          priority: insight.priority
        };
      }
      return insight;
    });
  };

  const exportToPdf = async (): Promise<void> => {
    if (!contentRef.current) {
      onExportError?.("No content to export");
      return;
    }

    try {
      const normalizedInsights = normalizeInsights(insights);

      // 🆕 FORCER html2canvas à ignorer les couleurs non supportées
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        ignoreElements: (element) => {
          // Ignorer les éléments avec des couleurs problématiques
          const styles = window.getComputedStyle(element);
          const backgroundColor = styles.backgroundColor;
          const color = styles.color;
          const borderColor = styles.borderColor;
          
          // Vérifier si une couleur contient 'oklch' ou autres fonctions non supportées
          const hasUnsupportedColor = 
            backgroundColor.includes('oklch') ||
            color.includes('oklch') ||
            borderColor.includes('oklch') ||
            backgroundColor.includes('lab(') ||
            color.includes('lab(') ||
            borderColor.includes('lab(');

          return hasUnsupportedColor;
        }
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: imgHeight > 297 ? "portrait" : "landscape",
        unit: "mm",
        format: "a4"
      });

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      const filename = `affinity_map_${mapName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

      onExportComplete?.();
    } catch (error) {
      console.error("PDF export error:", error);
      onExportError?.(error instanceof Error ? error.message : "Failed to export PDF");
    }
  };

  const normalizedInsights = normalizeInsights(insights);
  
  const stats = {
    totalGroups: groups.length,
    totalInsights: groups.reduce((sum, group) => sum + group.insightIds.length, 0),
    insightsByType: normalizedInsights.reduce((acc, insight) => {
      acc[insight.type] = (acc[insight.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  const getGroupInsights = (group: AffinityGroup): Insight[] => {
    return normalizedInsights.filter(insight => 
      group.insightIds.includes(insight.id)
    );
  };

  return {
    exportToPdf,
    PdfContent: (
      <div style={{ display: 'none' }}>
        <div 
          ref={contentRef} 
          style={{ 
            padding: '20px', 
            backgroundColor: 'white',
            fontFamily: 'Arial, sans-serif',
            // 🆕 FORCER LES COULEURS SUPPORTÉES DANS TOUT LE CONTENEUR
            color: '#000000',
            border: 'none'
          }}
        >
          {/* En-tête du rapport */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '30px',
            borderBottom: '2px solid #e5e7eb', // 🆕 COULEUR HEX SUPPORTÉE
            paddingBottom: '20px'
          }}>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#1f2937', // 🆕 COULEUR HEX SUPPORTÉE
              margin: '0 0 8px 0'
            }}>
              Affinity Diagram Report
            </h1>
            <h2 style={{ 
              fontSize: '18px', 
              color: '#4b5563', // 🆕 COULEUR HEX SUPPORTÉE
              margin: '0 0 8px 0'
            }}>
              {mapName}
            </h2>
            {projectName && (
              <p style={{ 
                fontSize: '14px', 
                color: '#6b7280', // 🆕 COULEUR HEX SUPPORTÉE
                margin: 0
              }}>
                Project: {projectName}
              </p>
            )}
            <p style={{ 
              fontSize: '12px', 
              color: '#9ca3af', // 🆕 COULEUR HEX SUPPORTÉE
              margin: '8px 0 0 0'
            }}>
              Generated on {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Statistiques */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '15px',
            marginBottom: '30px'
          }}>
            <div style={{ 
              textAlign: 'center',
              padding: '15px',
              backgroundColor: '#f3f4f6', // 🆕 COULEUR HEX SUPPORTÉE
              borderRadius: '8px',
              border: '1px solid #e5e7eb' // 🆕 COULEUR HEX SUPPORTÉE
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                {stats.totalGroups}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Theme Groups</div>
            </div>
            <div style={{ 
              textAlign: 'center',
              padding: '15px',
              backgroundColor: '#f3f4f6', // 🆕 COULEUR HEX SUPPORTÉE
              borderRadius: '8px',
              border: '1px solid #e5e7eb' // 🆕 COULEUR HEX SUPPORTÉE
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                {stats.totalInsights}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Insights</div>
            </div>
            <div style={{ 
              textAlign: 'center',
              padding: '15px',
              backgroundColor: '#f3f4f6', // 🆕 COULEUR HEX SUPPORTÉE
              borderRadius: '8px',
              border: '1px solid #e5e7eb' // 🆕 COULEUR HEX SUPPORTÉE
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                {Object.keys(stats.insightsByType).length}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Insight Types</div>
            </div>
          </div>

          {/* Groupes */}
          <div>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: '#1f2937', // 🆕 COULEUR HEX SUPPORTÉE
              marginBottom: '15px',
              borderBottom: '1px solid #e5e7eb', // 🆕 COULEUR HEX SUPPORTÉE
              paddingBottom: '8px'
            }}>
              Theme Groups ({groups.length})
            </h3>
            
            <div style={{ display: 'grid', gap: '15px' }}>
              {groups.map((group, index) => {
                const groupInsights = getGroupInsights(group);
                // 🆕 UTILISER UNIQUEMENT LA COULEUR NORMALISÉE
                const normalizedColor = normalizedGroups[index]?.color || '#6b7280';

                return (
                  <div 
                    key={group.id}
                    style={{
                      border: `2px solid ${normalizedColor}`,
                      borderRadius: '8px',
                      padding: '15px',
                      backgroundColor: `${normalizedColor}15`,
                      breakInside: 'avoid'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '10px'
                    }}>
                      <h4 style={{ 
                        fontSize: '16px', 
                        fontWeight: 'bold', 
                        color: normalizedColor,
                        margin: 0
                      }}>
                        {group.title}
                      </h4>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#6b7280',
                        backgroundColor: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        border: `1px solid ${normalizedColor}`
                      }}>
                        {groupInsights.length} insights
                      </div>
                    </div>

                    {/* Insights du groupe */}
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {groupInsights.slice(0, 10).map((insight) => (
                        <div 
                          key={insight.id}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb', // 🆕 COULEUR HEX SUPPORTÉE
                            fontSize: '12px'
                          }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px'
                          }}>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 'bold',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 
                                insight.type === 'pain-point' ? '#fef2f2' : // 🆕 HEX
                                insight.type === 'quote' ? '#eff6ff' :     // 🆕 HEX
                                insight.type === 'insight' ? '#faf5ff' :   // 🆕 HEX
                                '#f0fdf4',                                // 🆕 HEX
                              color:
                                insight.type === 'pain-point' ? '#dc2626' : // 🆕 HEX
                                insight.type === 'quote' ? '#2563eb' :     // 🆕 HEX
                                insight.type === 'insight' ? '#7c3aed' :   // 🆕 HEX
                                '#16a34a'                                 // 🆕 HEX
                            }}>
                              {insight.type.charAt(0).toUpperCase()}
                            </span>
                            <span style={{ 
                              fontSize: '10px', 
                              color: '#9ca3af' // 🆕 COULEUR HEX SUPPORTÉE
                            }}>
                              {new Date(insight.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p style={{ 
                            margin: 0,
                            color: '#374151', // 🆕 COULEUR HEX SUPPORTÉE
                            lineHeight: '1.4'
                          }}>
                            {insight.text}
                          </p>
                        </div>
                      ))}
                      
                      {groupInsights.length > 10 && (
                        <div style={{ 
                          textAlign: 'center',
                          padding: '8px',
                          backgroundColor: '#f8fafc', // 🆕 COULEUR HEX SUPPORTÉE
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: '#64748b' // 🆕 COULEUR HEX SUPPORTÉE
                        }}>
                          +{groupInsights.length - 10} more insights...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pied de page */}
          <div style={{ 
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '1px solid #e5e7eb', // 🆕 COULEUR HEX SUPPORTÉE
            textAlign: 'center',
            fontSize: '10px',
            color: '#9ca3af' // 🆕 COULEUR HEX SUPPORTÉE
          }}>
            Generated with Affinity Diagramming Tool • {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    )
  };
}