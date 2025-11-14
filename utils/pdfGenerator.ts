// utils/pdfGenerator.ts - VERSION AVEC ENCODAGE CORRIGÉ
import jsPDF from "jspdf";
import { AffinityGroup, Insight, ConvexInsight } from "@/types";

interface PdfConfig {
  title: string;
  projectName?: string;
  groups: AffinityGroup[];
  insights: (Insight | ConvexInsight)[];
}

// 🎨 Couleurs simples supportées
const PDF_COLORS = {
  primary: '#2c5aa0',
  secondary: '#6b7280',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  background: '#f8fafc',
  border: '#e5e7eb',
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
    light: '#9ca3af'
  }
};

// Palette de couleurs pour les groupes
const GROUP_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#ec4899',
  '#14b8a6', '#f43f5e', '#8b5cf6', '#06b6d4', '#84cc16'
];

/**
 * Normalise les insights pour avoir un format cohérent
 */
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

/**
 * Nettoie et formate le texte pour le PDF
 */
const cleanTextForPdf = (text: string): string => {
  if (!text) return '';
  
  // Remplacer les caractères problématiques
  return text
    .replace(/[^\x00-\x7F]/g, '') // Supprimer les caractères non-ASCII
    .replace(/[”“"«»]/g, '"')     // Normaliser les guillemets
    .replace(/[‘’]/g, "'")        // Normaliser les apostrophes
    .replace(/[–—]/g, '-')        // Normaliser les tirets
    .replace(/\s+/g, ' ')         // Normaliser les espaces
    .trim();
};

/**
 * Divise le texte en lignes pour le PDF avec gestion des mots complets
 */
const splitTextToLines = (pdf: jsPDF, text: string, maxWidth: number): string[] => {
  const cleanedText = cleanTextForPdf(text);
  const words = cleanedText.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = pdf.getTextWidth(testLine);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

/**
 * Génère un PDF avec jsPDF pur (sans html2canvas)
 */
export const generatePdfReport = (config: PdfConfig): void => {
  const { title, projectName, groups, insights } = config;
  
  // Normaliser les insights
  const normalizedInsights = normalizeInsights(insights);
  
  // Créer le PDF avec une police qui supporte mieux les caractères
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  // 🆕 CONFIGURER LA POLICE POUR MEILLEUR SUPPORT UNICODE
  pdf.setFont("helvetica");
  pdf.setFontSize(10);

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // 🎨 Fonctions de dessin améliorées
  const addTitle = (text: string, size: number = 20): void => {
    const cleanedText = cleanTextForPdf(text);
    pdf.setFontSize(size);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(PDF_COLORS.primary);
    
    const textWidth = pdf.getTextWidth(cleanedText);
    const xPosition = (pageWidth - textWidth) / 2;
    
    pdf.text(cleanedText, xPosition, yPosition);
    yPosition += size / 2 + 5;
  };

  const addSubtitle = (text: string, size: number = 14): void => {
    const cleanedText = cleanTextForPdf(text);
    pdf.setFontSize(size);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(PDF_COLORS.text.secondary);
    
    const textWidth = pdf.getTextWidth(cleanedText);
    const xPosition = (pageWidth - textWidth) / 2;
    
    pdf.text(cleanedText, xPosition, yPosition);
    yPosition += size / 2 + 10;
  };

  const addText = (text: string, size: number = 10, x: number = margin, color: string = PDF_COLORS.text.primary): void => {
    const cleanedText = cleanTextForPdf(text);
    pdf.setFontSize(size);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(color);
    
    pdf.text(cleanedText, x, yPosition);
    yPosition += size / 2 + 2;
  };

  const addWrappedText = (text: string, size: number = 10, x: number = margin, maxWidth: number = contentWidth, color: string = PDF_COLORS.text.primary): void => {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(color);
    
    const lines = splitTextToLines(pdf, text, maxWidth);
    lines.forEach((line, index) => {
      if (index > 0) {
        yPosition += size / 2;
      }
      pdf.text(line, x, yPosition);
    });
    
    yPosition += (size / 2) + 2;
  };

  const addBoldText = (text: string, size: number = 10, x: number = margin): void => {
    const cleanedText = cleanTextForPdf(text);
    pdf.setFontSize(size);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(PDF_COLORS.text.primary);
    
    pdf.text(cleanedText, x, yPosition);
    yPosition += (size / 2) + 2;
  };

  const checkPageBreak = (neededSpace: number = 20): void => {
    if (yPosition + neededSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }
  };

  const drawBox = (color: string = PDF_COLORS.border): void => {
    pdf.setDrawColor(color);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPosition, contentWidth, 2);
    yPosition += 5;
  };

  // 📄 PAGE 1: COUVERTURE ET STATISTIQUES
  addTitle("AFFINITY DIAGRAM REPORT", 24);
  yPosition += 10;
  
  addSubtitle(title, 18);
  
  if (projectName) {
    addSubtitle(`Project: ${projectName}`, 14);
  }
  
  yPosition += 15;
  drawBox();
  
  // Statistiques
  addBoldText("PROJECT STATISTICS", 16);
  yPosition += 5;
  
  const totalInsights = groups.reduce((sum, group) => sum + group.insightIds.length, 0);
  const insightsByType = normalizedInsights.reduce((acc, insight) => {
    acc[insight.type] = (acc[insight.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  addText(`Total Groups: ${groups.length}`, 12);
  addText(`Total Insights: ${totalInsights}`, 12);
  addText(`Insight Types: ${Object.keys(insightsByType).length}`, 12);
  
  yPosition += 10;
  drawBox();
  
  // Détails des types d'insights
  addBoldText("INSIGHT TYPE DISTRIBUTION", 14);
  yPosition += 5;
  
  Object.entries(insightsByType).forEach(([type, count]) => {
    const percentage = ((count / totalInsights) * 100).toFixed(1);
    addText(`• ${type.charAt(0).toUpperCase() + type.slice(1)}: ${count} (${percentage}%)`, 10);
  });

  yPosition += 15;
  
  // 📄 GROUPES ET INSIGHTS
  groups.forEach((group, groupIndex) => {
    checkPageBreak(50);
    
    const groupColor = GROUP_COLORS[groupIndex % GROUP_COLORS.length];
    const groupInsights = normalizedInsights.filter(insight => 
      group.insightIds.includes(insight.id)
    );

    // En-tête du groupe
    pdf.setFillColor(groupColor);
    pdf.rect(margin, yPosition, contentWidth, 8, 'F');
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    
    const groupTitle = cleanTextForPdf(`THEME: ${group.title.toUpperCase()}`);
    pdf.text(groupTitle, margin + 5, yPosition + 5.5);
    
    yPosition += 12;

    // Compteur d'insights
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(PDF_COLORS.text.secondary);
    pdf.text(`Insights: ${groupInsights.length}`, margin, yPosition);
    
    yPosition += 6;

    // Insights du groupe
    groupInsights.slice(0, 8).forEach((insight) => {
      checkPageBreak(20);
      
      // Style basé sur le type d'insight
      let typeColor = PDF_COLORS.text.secondary;
      let typePrefix = "•";
      
      switch (insight.type) {
        case 'pain-point':
          typeColor = PDF_COLORS.error;
          typePrefix = "[PAIN]";
          break;
        case 'quote':
          typeColor = PDF_COLORS.primary;
          typePrefix = "[QUOTE]";
          break;
        case 'insight':
          typeColor = PDF_COLORS.success;
          typePrefix = "[INSIGHT]";
          break;
        case 'follow-up':
          typeColor = PDF_COLORS.warning;
          typePrefix = "[FOLLOW-UP]";
          break;
        default:
          typePrefix = `[${insight.type.toUpperCase()}]`;
      }

      // Préfixe du type
      pdf.setFontSize(8);
      pdf.setTextColor(typeColor);
      pdf.text(typePrefix, margin, yPosition);

      // Texte de l'insight - 🆕 UTILISER LA VERSION NETTOYÉE
      const insightText = cleanTextForPdf(insight.text);
      
      pdf.setFontSize(9);
      pdf.setTextColor(PDF_COLORS.text.primary);
      
      // 🆕 UTILISER LE TEXTE WRAPPÉ
      const lines = splitTextToLines(pdf, insightText, contentWidth - 15);
      
      lines.forEach((line, lineIndex) => {
        const xPosition = margin + 25; // Décalage pour aligner avec le préfixe
        const yOffset = yPosition + (lineIndex * (9 / 2));
        pdf.text(line, xPosition, yOffset);
      });
      
      yPosition += (9 / 2) * lines.length + 4;
    });

    // Message si plus d'insights
    if (groupInsights.length > 8) {
      checkPageBreak(10);
      pdf.setFontSize(8);
      pdf.setTextColor(PDF_COLORS.text.light);
      pdf.text(`... and ${groupInsights.length - 8} more insights`, margin, yPosition);
      yPosition += 6;
    }

    yPosition += 10;
  });

  // 📄 PIED DE PAGE
  const finalPage = pdf.internal.getNumberOfPages();
  pdf.setPage(finalPage);
  
  pdf.setFontSize(8);
  pdf.setTextColor(PDF_COLORS.text.light);
  const footerText = `Generated with Affinity Diagramming Tool • ${new Date().toLocaleDateString()} • Page ${finalPage} of ${finalPage}`;
  pdf.text(cleanTextForPdf(footerText), margin, pageHeight - 10);

  // 💾 SAUVEGARDER LE PDF
  const filename = `affinity_map_${title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};

/**
 * Vérifie si le PDF peut être généré
 */
export const canGeneratePdf = (groups: AffinityGroup[]): boolean => {
  return groups.length > 0;
};

/**
 * Obtient les statistiques pour l'aperçu PDF
 */
export const getPdfStats = (groups: AffinityGroup[], insights: (Insight | ConvexInsight)[]) => {
  const normalizedInsights = normalizeInsights(insights);
  const totalInsights = groups.reduce((sum, group) => sum + group.insightIds.length, 0);
  
  return {
    groupCount: groups.length,
    totalInsights,
    insightsByType: normalizedInsights.reduce((acc, insight) => {
      acc[insight.type] = (acc[insight.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
};