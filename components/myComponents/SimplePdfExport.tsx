// components/SimplePdfExport.tsx
"use client";

import { useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { AffinityGroup, Insight, ConvexInsight } from "@/types";

interface SimplePdfExportProps {
  groups: AffinityGroup[];
  insights: (Insight | ConvexInsight)[];
  mapName: string;
  projectName?: string;
  onExportComplete?: () => void;
  onExportError?: (error: string) => void;
}

export function SimplePdfExport({ 
  groups, 
  insights, 
  mapName, 
  projectName, 
  onExportComplete, 
  onExportError 
}: SimplePdfExportProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const exportToPdf = async (): Promise<void> => {
    if (!contentRef.current) {
      onExportError?.("No content to export");
      return;
    }

    try {
      // 🆕 CRÉER UN ÉLÉMENT TEMPORAIRE COMPLÈTEMENT ISOLÉ
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '800px';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.padding = '20px';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.zIndex = '9999';
      
      // 🆕 COPIER LE CONTENU SANS STYLES PROBLÉMATIQUES
      tempContainer.innerHTML = contentRef.current.innerHTML;
      
      // 🆕 SUPPRIMER TOUS LES ATTRIBUTS STYLE PROBLÉMATIQUES
      const allElements = tempContainer.querySelectorAll('*');
      allElements.forEach(el => {
        const element = el as HTMLElement;
        if (element.style) {
          // Remplacer les couleurs potentiellement problématiques
          const bgColor = element.style.backgroundColor;
          const color = element.style.color;
          const borderColor = element.style.borderColor;
          
          if (bgColor && (bgColor.includes('oklch') || bgColor.includes('lab') || bgColor.includes('lch'))) {
            element.style.backgroundColor = '#f3f4f6';
          }
          if (color && (color.includes('oklch') || color.includes('lab') || color.includes('lch'))) {
            element.style.color = '#000000';
          }
          if (borderColor && (borderColor.includes('oklch') || borderColor.includes('lab') || borderColor.includes('lch'))) {
            element.style.borderColor = '#d1d5db';
          }
        }
      });
      
      document.body.appendChild(tempContainer);

      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });

      // 🆕 NETTOYER
      document.body.removeChild(tempContainer);

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
          createdAt: new Date(insight.createdAt).toISOString(),
          tags: insight.tags,
          priority: insight.priority
        };
      }
      return insight;
    });
  };

  const normalizedInsights = normalizeInsights(insights);

  return {
    exportToPdf,
    PdfContent: (
      <div style={{ display: 'none' }}>
        <div 
          ref={contentRef}
          style={{
            width: '800px',
            backgroundColor: 'white',
            color: 'black',
            fontFamily: 'Arial, sans-serif',
            padding: '20px'
          }}
        >
          <h1 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#000000' }}>
            Affinity Diagram Report
          </h1>
          
          <h2 style={{ textAlign: 'center', fontSize: '18px', color: '#333333', marginBottom: '20px' }}>
            {mapName}
          </h2>

          {projectName && (
            <p style={{ textAlign: 'center', color: '#666666', marginBottom: '30px' }}>
              Project: {projectName}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '30px' }}>
            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>{groups.length}</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Groups</div>
            </div>
            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                {groups.reduce((sum, group) => sum + group.insightIds.length, 0)}
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Insights</div>
            </div>
            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6f42c1' }}>
                {new Set(insights.map(i => i.type)).size}
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Insight Types</div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#000000' }}>
              Theme Groups
            </h3>
            
            {groups.map((group, index) => {
              const groupInsights = normalizedInsights.filter(insight => 
                group.insightIds.includes(insight.id)
              );
              
              const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#20c997', '#e83e8c'];
              const color = colors[index % colors.length];

              return (
                <div 
                  key={group.id}
                  style={{
                    border: `2px solid ${color}`,
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '15px',
                    backgroundColor: `${color}10`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: color, margin: 0 }}>
                      {group.title}
                    </h4>
                    <span style={{ fontSize: '12px', color: '#6c757d', backgroundColor: 'white', padding: '4px 8px', borderRadius: '12px', border: `1px solid ${color}` }}>
                      {groupInsights.length} insights
                    </span>
                  </div>

                  {groupInsights.slice(0, 5).map((insight) => (
                    <div 
                      key={insight.id}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        border: '1px solid #dee2e6',
                        marginBottom: '5px',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: 'bold', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          backgroundColor: 
                            insight.type === 'pain-point' ? '#f8d7da' :
                            insight.type === 'quote' ? '#cce7ff' :
                            insight.type === 'insight' ? '#e2d9f3' :
                            '#d1edf7',
                          color:
                            insight.type === 'pain-point' ? '#721c24' :
                            insight.type === 'quote' ? '#004085' :
                            insight.type === 'insight' ? '#2d1b4e' :
                            '#0c5460'
                        }}>
                          {insight.type.charAt(0).toUpperCase()}
                        </span>
                        <span style={{ fontSize: '10px', color: '#6c757d' }}>
                          {new Date(insight.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ color: '#212529' }}>
                        {insight.text}
                      </div>
                    </div>
                  ))}

                  {groupInsights.length > 5 && (
                    <div style={{ textAlign: 'center', padding: '8px', color: '#6c757d', fontSize: '11px' }}>
                      +{groupInsights.length - 5} more insights...
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #dee2e6', textAlign: 'center', color: '#6c757d', fontSize: '10px' }}>
            Generated with Affinity Diagramming Tool • {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    )
  };
}