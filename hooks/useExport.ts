import { Interview } from '@/stores/transcriptionStore';
import { ExportInterview } from '@/types';
import jsPDF from 'jspdf';

export function useExport() {
  
  // Export as Markdown
  const exportAsMarkdown = (interview: ExportInterview) => {
    const markdown = generateMarkdown(interview);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${interview.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export as PDF
  const exportAsPDF = (interview: ExportInterview) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Helper to add new page if needed
    const checkPageBreak = (height: number) => {
      if (yPosition + height > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
    };

    // Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(interview.title, margin, yPosition);
    yPosition += 10;

    // Metadata
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    const duration = `${Math.floor(interview.duration / 60)}:${String(Math.floor(interview.duration % 60)).padStart(2, '0')} min`;
    const date = new Date(interview.createdAt).toLocaleDateString();
    pdf.text(`Date: ${date} | Duration: ${duration}`, margin, yPosition);
    yPosition += 5;
    
    if (interview.topic) {
      pdf.text(`Topic: ${interview.topic}`, margin, yPosition);
      yPosition += 5;
    }
    
    yPosition += 5;
    pdf.setTextColor(0, 0, 0);

    // Add line separator
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Transcription section
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    checkPageBreak(10);
    pdf.text('Transcription', margin, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    // Add segments with timestamps
    interview.segments.forEach((segment) => {
      const timestamp = `[${Math.floor(segment.start / 60)}:${String(Math.floor(segment.start % 60)).padStart(2, '0')}]`;
      const text = `${timestamp} ${segment.text}`;
      
      const lines = pdf.splitTextToSize(text, maxWidth);
      const textHeight = lines.length * 5;
      
      checkPageBreak(textHeight + 3);
      
      pdf.text(lines, margin, yPosition);
      yPosition += textHeight + 3;
    });

    // Insights section
    if (interview.insights.length > 0) {
      yPosition += 5;
      checkPageBreak(15);
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Insights', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      interview.insights.forEach((insight) => {
        checkPageBreak(20);

        // Type badge - set fill color based on type
        if (insight.type === 'pain-point') {
          pdf.setFillColor(254, 226, 226);
        } else if (insight.type === 'quote') {
          pdf.setFillColor(219, 234, 254);
        } else if (insight.type === 'insight') {
          pdf.setFillColor(243, 232, 255);
        } else {
          pdf.setFillColor(220, 252, 231);
        }
        
        const badgeText = insight.type.toUpperCase();
        const badgeWidth = pdf.getTextWidth(badgeText) + 4;
        pdf.roundedRect(margin, yPosition - 3, badgeWidth, 5, 1, 1, 'F');
        
        // Set text color based on type
        if (insight.type === 'pain-point') {
          pdf.setTextColor(185, 28, 28);
        } else if (insight.type === 'quote') {
          pdf.setTextColor(29, 78, 216);
        } else if (insight.type === 'insight') {
          pdf.setTextColor(107, 33, 168);
        } else {
          pdf.setTextColor(21, 128, 61);
        }
        pdf.text(badgeText, margin + 2, yPosition);
        
        // Timestamp
        pdf.setTextColor(150, 150, 150);
        const timestamp = `${Math.floor(insight.timestamp / 60)}:${String(Math.floor(insight.timestamp % 60)).padStart(2, '0')}`;
        pdf.text(timestamp, pageWidth - margin - pdf.getTextWidth(timestamp), yPosition);
        
        yPosition += 6;

        // Insight text
        pdf.setTextColor(0, 0, 0);
        const lines = pdf.splitTextToSize(insight.text, maxWidth);
        pdf.text(lines, margin, yPosition);
        yPosition += lines.length * 5 + 5;
      });
    }

    // Statistics section
    yPosition += 5;
    checkPageBreak(30);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Statistics', margin, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    const stats = [
      `Word Count: ${interview.transcription.split(' ').length}`,
      `Segments: ${interview.segments.length}`,
      `Insights: ${interview.insights.length}`,
    ];

    stats.forEach(stat => {
      pdf.text(stat, margin, yPosition);
      yPosition += 5;
    });

    // Save PDF
    pdf.save(`${interview.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  };

  // Generate Markdown content
  const generateMarkdown = (interview: ExportInterview): string => {
    let markdown = `# ${interview.title}\n\n`;
    
    // Metadata
    markdown += `**Date:** ${new Date(interview.createdAt).toLocaleDateString()}\n`;
    markdown += `**Duration:** ${Math.floor(interview.duration / 60)}:${String(Math.floor(interview.duration % 60)).padStart(2, '0')} min\n`;
    if (interview.topic) {
      markdown += `**Topic:** ${interview.topic}\n`;
    }
    markdown += '\n---\n\n';

    // Transcription
    markdown += '## Transcription\n\n';
    interview.segments.forEach((segment) => {
      const timestamp = `[${Math.floor(segment.start / 60)}:${String(Math.floor(segment.start % 60)).padStart(2, '0')}]`;
      markdown += `**${timestamp}** ${segment.text}\n\n`;
    });

    // Insights
    if (interview.insights.length > 0) {
      markdown += '## Insights\n\n';
      
      const groupedInsights = interview.insights.reduce((acc, insight) => {
        if (!acc[insight.type]) {
          acc[insight.type] = [];
        }
        acc[insight.type].push(insight);
        return acc;
      }, {} as Record<string, typeof interview.insights>);

      Object.entries(groupedInsights).forEach(([type, insights]) => {
        markdown += `### ${type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}\n\n`;
        insights.forEach((insight) => {
          const timestamp = `${Math.floor(insight.timestamp / 60)}:${String(Math.floor(insight.timestamp % 60)).padStart(2, '0')}`;
          markdown += `- **[${timestamp}]** ${insight.text}\n`;
        });
        markdown += '\n';
      });
    }

    // Statistics
    markdown += '## Statistics\n\n';
    markdown += `- **Word Count:** ${interview.transcription.split(' ').length}\n`;
    markdown += `- **Segments:** ${interview.segments.length}\n`;
    markdown += `- **Insights:** ${interview.insights.length}\n`;

    return markdown;
  };

  // Export as CSV (for Excel)
  const exportAsCSV = (interview: ExportInterview) => {
    let csv = 'Type,Timestamp,Text,Source\n';
    
    interview.insights.forEach((insight) => {
      const timestamp = `${Math.floor(insight.timestamp / 60)}:${String(Math.floor(insight.timestamp % 60)).padStart(2, '0')}`;
      const text = insight.text.replace(/"/g, '""');
      csv += `"${insight.type}","${timestamp}","${text}","${insight.source}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${interview.title.replace(/[^a-z0-9]/gi, '_')}_insights.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export as Notion-friendly Markdown
  const exportAsNotion = (interview: ExportInterview) => {
    let markdown = `# ${interview.title}\n\n`;
    
    markdown += `**Date:** ${new Date(interview.createdAt).toLocaleDateString()}\n`;
    markdown += `**Duration:** ${Math.floor(interview.duration / 60)}:${String(Math.floor(interview.duration % 60)).padStart(2, '0')} min\n`;
    if (interview.topic) {
      markdown += `**Topic:** ${interview.topic}\n`;
    }
    markdown += '\n---\n\n';

    markdown += '## Key Insights\n\n';
    
    if (interview.insights.length > 0) {
      const groupedInsights = interview.insights.reduce((acc, insight) => {
        if (!acc[insight.type]) {
          acc[insight.type] = [];
        }
        acc[insight.type].push(insight);
        return acc;
      }, {} as Record<string, typeof interview.insights>);

      Object.entries(groupedInsights).forEach(([type, insights]) => {
        const icon = type === 'pain-point' ? '🔴' : type === 'quote' ? '💬' : type === 'insight' ? '💡' : '➡️';
        markdown += `### ${icon} ${type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}\n\n`;
        insights.forEach((insight) => {
          const timestamp = `${Math.floor(insight.timestamp / 60)}:${String(Math.floor(insight.timestamp % 60)).padStart(2, '0')}`;
          markdown += `- **${timestamp}** ${insight.text}\n`;
        });
        markdown += '\n';
      });
    } else {
      markdown += '_No insights yet._\n\n';
    }

    markdown += '---\n\n';
    markdown += '## Transcription\n\n';
    markdown += '_Full transcription available in separate document._\n';
    markdown += `- ${interview.segments.length} segments, ${interview.transcription.split(' ').length} words\n`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${interview.title.replace(/[^a-z0-9]/gi, '_')}_notion.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    exportAsMarkdown,
    exportAsPDF,
    exportAsCSV,
    exportAsNotion,
  };
}