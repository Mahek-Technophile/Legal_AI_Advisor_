import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DocumentAnalysisResult } from './documentAnalysis';

export class ReportExportService {
  static async exportToPDF(analysis: DocumentAnalysisResult): Promise<void> {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Helper function to add text with word wrapping
      const addText = (text: string, fontSize = 12, isBold = false) => {
        pdf.setFontSize(fontSize);
        if (isBold) {
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setFont('helvetica', 'normal');
        }

        const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
        
        // Check if we need a new page
        if (yPosition + (lines.length * fontSize * 0.5) > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.text(lines, margin, yPosition);
        yPosition += lines.length * fontSize * 0.5 + 5;
      };

      // Helper function to add a section header
      const addSectionHeader = (text: string, fontSize = 16) => {
        // Add some space before section headers
        yPosition += 5;
        
        // Check if we need a new page
        if (yPosition + fontSize * 0.5 + 10 > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin - 5, yPosition - 5, pageWidth - 2 * margin + 10, fontSize + 10, 'F');
        
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(50, 50, 50);
        pdf.text(text, margin, yPosition + fontSize * 0.3);
        
        yPosition += fontSize + 10;
      };

      // Header
      addText('Enhanced Legal Document Analysis Report', 20, true);
      addText(`Document: ${analysis.documentInfo.fileName}`, 14, true);
      addText(`Jurisdiction: ${analysis.documentInfo.jurisdiction}`, 12);
      addText(`Analysis Date: ${new Date(analysis.documentInfo.analysisDate).toLocaleDateString()}`, 12);
      yPosition += 10;

      // Risk Assessment
      addSectionHeader('RISK ASSESSMENT');
      addText(`Risk Level: ${analysis.riskAssessment.level}`, 12, true);
      addText(`Risk Score: ${analysis.riskAssessment.score}/10`, 12);
      
      if (analysis.riskAssessment.serviceProviderRisks && analysis.riskAssessment.serviceProviderRisks.length > 0) {
        addText('Service Provider Risks:', 12, true);
        analysis.riskAssessment.serviceProviderRisks.forEach(factor => {
          addText(`• ${factor}`, 11);
        });
      }
      
      if (analysis.riskAssessment.clientRisks && analysis.riskAssessment.clientRisks.length > 0) {
        addText('Client Risks:', 12, true);
        analysis.riskAssessment.clientRisks.forEach(factor => {
          addText(`• ${factor}`, 11);
        });
      }
      
      if (analysis.riskAssessment.mutualRisks && analysis.riskAssessment.mutualRisks.length > 0) {
        addText('Mutual Risks:', 12, true);
        analysis.riskAssessment.mutualRisks.forEach(factor => {
          addText(`• ${factor}`, 11);
        });
      }
      
      if (!analysis.riskAssessment.serviceProviderRisks && !analysis.riskAssessment.clientRisks && analysis.riskAssessment.factors) {
        addText('Risk Factors:', 12, true);
        analysis.riskAssessment.factors.forEach(factor => {
          addText(`• ${factor}`, 11);
        });
      }
      
      yPosition += 10;

      // Summary
      addSectionHeader('EXECUTIVE SUMMARY');
      addText(analysis.summary, 12);
      yPosition += 10;

      // Performance Metrics
      if (analysis.performanceMetrics) {
        addSectionHeader('PERFORMANCE METRICS & SLA REQUIREMENTS');
        
        addText('Uptime Requirements:', 12, true);
        addText(analysis.performanceMetrics.slaRequirements.uptime, 11);
        
        addText('Response Time:', 12, true);
        addText(analysis.performanceMetrics.slaRequirements.responseTime, 11);
        
        addText('Availability:', 12, true);
        addText(analysis.performanceMetrics.slaRequirements.availability, 11);
        
        if (analysis.performanceMetrics.slaRequirements.performanceThresholds.length > 0) {
          addText('Performance Thresholds:', 12, true);
          analysis.performanceMetrics.slaRequirements.performanceThresholds.forEach(threshold => {
            addText(`• ${threshold}`, 11);
          });
        }
        
        if (analysis.performanceMetrics.penalties.uptimePenalties.length > 0) {
          addText('Uptime Penalties:', 12, true);
          analysis.performanceMetrics.penalties.uptimePenalties.forEach(penalty => {
            addText(`• ${penalty}`, 11);
          });
        }
        
        yPosition += 10;
      }

      // Counterparty Analysis
      if (analysis.counterpartyAnalysis) {
        addSectionHeader('COUNTERPARTY PERSPECTIVE ANALYSIS');
        
        addText('Service Provider Perspective:', 12, true);
        if (analysis.counterpartyAnalysis.serviceProviderPerspective.advantages.length > 0) {
          addText('Advantages:', 11, true);
          analysis.counterpartyAnalysis.serviceProviderPerspective.advantages.forEach(item => {
            addText(`• ${item}`, 10);
          });
        }
        
        if (analysis.counterpartyAnalysis.serviceProviderPerspective.risks.length > 0) {
          addText('Risks:', 11, true);
          analysis.counterpartyAnalysis.serviceProviderPerspective.risks.forEach(item => {
            addText(`• ${item}`, 10);
          });
        }
        
        addText('Client Perspective:', 12, true);
        if (analysis.counterpartyAnalysis.clientPerspective.advantages.length > 0) {
          addText('Advantages:', 11, true);
          analysis.counterpartyAnalysis.clientPerspective.advantages.forEach(item => {
            addText(`• ${item}`, 10);
          });
        }
        
        if (analysis.counterpartyAnalysis.clientPerspective.risks.length > 0) {
          addText('Risks:', 11, true);
          analysis.counterpartyAnalysis.clientPerspective.risks.forEach(item => {
            addText(`• ${item}`, 10);
          });
        }
        
        addText('Balance Assessment:', 12, true);
        addText(`Overall: ${analysis.counterpartyAnalysis.balanceAssessment.overall.replace(/_/g, ' ').toUpperCase()}`, 11);
        addText(analysis.counterpartyAnalysis.balanceAssessment.reasoning, 11);
        
        yPosition += 10;
      }

      // Key Findings
      if (analysis.keyFindings.length > 0) {
        addSectionHeader('KEY FINDINGS');
        analysis.keyFindings.forEach((finding, index) => {
          addText(`${index + 1}. ${finding.category} (${finding.severity.toUpperCase()})`, 12, true);
          addText(finding.finding, 11);
          if (finding.impact) {
            addText(`Impact: ${finding.impact}`, 11);
          }
          if (finding.affectedParty) {
            addText(`Affected Party: ${finding.affectedParty.replace('_', ' ')}`, 11);
          }
          yPosition += 5;
        });
      }

      // Problematic Clauses
      if (analysis.problematicClauses && analysis.problematicClauses.length > 0) {
        addSectionHeader('PROBLEMATIC CLAUSES');
        analysis.problematicClauses.forEach((clause, index) => {
          addText(`${index + 1}. Issue Found (${clause.severity?.toUpperCase() || 'ISSUE'})`, 12, true);
          addText(`Clause: "${clause.clause}"`, 11);
          addText(`Problem: ${clause.issue}`, 11);
          addText(`Suggestion: ${clause.suggestion}`, 11);
          if (clause.affectedParty) {
            addText(`Affected Party: ${clause.affectedParty.replace('_', ' ')}`, 11);
          }
          yPosition += 5;
        });
      }

      // Recommendations
      if (analysis.recommendations) {
        if (Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0) {
          addSectionHeader('RECOMMENDATIONS');
          if (typeof analysis.recommendations[0] === 'string') {
            analysis.recommendations.forEach((rec, index) => {
              addText(`${index + 1}. ${rec}`, 11);
            });
          } else {
            analysis.recommendations.forEach((rec: any, index) => {
              addText(`${index + 1}. ${rec.category || 'Recommendation'} (${rec.priority?.toUpperCase() || 'MEDIUM'})`, 12, true);
              addText(rec.recommendation, 11);
              if (rec.implementation) {
                addText(`Implementation: ${rec.implementation}`, 11);
              }
              if (rec.targetParty) {
                addText(`Target Party: ${rec.targetParty.replace('_', ' ')}`, 11);
              }
              yPosition += 5;
            });
          }
          yPosition += 10;
        }
      }

      // Legal Citations
      if (analysis.legalCitations && analysis.legalCitations.length > 0) {
        addSectionHeader('LEGAL CITATIONS');
        analysis.legalCitations.forEach(citation => {
          addText(`• ${citation}`, 11);
        });
        yPosition += 10;
      }

      // Next Steps
      if (analysis.nextSteps) {
        addSectionHeader('NEXT STEPS');
        
        if (analysis.nextSteps.immediate && analysis.nextSteps.immediate.length > 0) {
          addText('Immediate Actions:', 12, true);
          analysis.nextSteps.immediate.forEach((step, index) => {
            addText(`${index + 1}. ${step}`, 11);
          });
        }
        
        if (analysis.nextSteps.shortTerm && analysis.nextSteps.shortTerm.length > 0) {
          addText('Short-term Actions (30 days):', 12, true);
          analysis.nextSteps.shortTerm.forEach((step, index) => {
            addText(`${index + 1}. ${step}`, 11);
          });
        }
        
        if (analysis.nextSteps.longTerm && analysis.nextSteps.longTerm.length > 0) {
          addText('Long-term Actions:', 12, true);
          analysis.nextSteps.longTerm.forEach((step, index) => {
            addText(`${index + 1}. ${step}`, 11);
          });
        }
        
        // Handle legacy format
        if (!analysis.nextSteps.immediate && Array.isArray(analysis.nextSteps)) {
          analysis.nextSteps.forEach((step, index) => {
            addText(`${index + 1}. ${step}`, 11);
          });
        }
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        'This analysis is for informational purposes only and does not constitute legal advice.',
        margin,
        pageHeight - 10
      );

      // Save the PDF
      const fileName = `${analysis.documentInfo.fileName.replace(/\.[^/.]+$/, '')}_analysis.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw new Error('Failed to export report to PDF');
    }
  }

  static async exportToJSON(analysis: DocumentAnalysisResult): Promise<void> {
    try {
      const dataStr = JSON.stringify(analysis, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${analysis.documentInfo.fileName.replace(/\.[^/.]+$/, '')}_analysis.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      throw new Error('Failed to export report to JSON');
    }
  }

  static async exportToHTML(analysis: DocumentAnalysisResult): Promise<void> {
    try {
      const html = this.generateEnhancedHTMLReport(analysis);
      const dataBlob = new Blob([html], { type: 'text/html' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${analysis.documentInfo.fileName.replace(/\.[^/.]+$/, '')}_analysis.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to HTML:', error);
      throw new Error('Failed to export report to HTML');
    }
  }

  private static generateEnhancedHTMLReport(analysis: DocumentAnalysisResult): string {
    const riskColor = {
      'LOW': '#10b981',
      'MEDIUM': '#f59e0b',
      'HIGH': '#f97316',
      'CRITICAL': '#ef4444'
    }[analysis.riskAssessment.level];

    const balanceColor = {
      'heavily_favors_provider': '#ef4444',
      'favors_provider': '#f97316',
      'balanced': '#10b981',
      'favors_client': '#3b82f6',
      'heavily_favors_client': '#8b5cf6'
    }[analysis.counterpartyAnalysis?.balanceAssessment?.overall || 'balanced'];

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Legal Document Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; color: #333; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .risk-badge { display: inline-block; padding: 8px 16px; border-radius: 6px; color: white; font-weight: bold; background-color: ${riskColor}; }
        .balance-badge { display: inline-block; padding: 8px 16px; border-radius: 6px; color: white; font-weight: bold; background-color: ${balanceColor}; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
        .subsection { margin-bottom: 20px; }
        .subsection h3 { color: #374151; }
        .finding { background: #f9fafb; padding: 15px; margin: 10px 0; border-left: 4px solid #3b82f6; }
        .clause { background: #fef2f2; padding: 15px; margin: 10px 0; border-left: 4px solid #ef4444; }
        .recommendation { background: #f0fdf4; padding: 15px; margin: 10px 0; border-left: 4px solid #10b981; }
        .metrics { background: #eff6ff; padding: 15px; margin: 10px 0; border-left: 4px solid #3b82f6; }
        .perspective { background: #f5f3ff; padding: 15px; margin: 10px 0; border-left: 4px solid #8b5cf6; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
        .tag { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 5px; }
        .tag-provider { background: #dbeafe; color: #1e40af; }
        .tag-client { background: #dcfce7; color: #166534; }
        .tag-both { background: #f3e8ff; color: #6b21a8; }
        .tag-high { background: #fee2e2; color: #b91c1c; }
        .tag-medium { background: #fef3c7; color: #92400e; }
        .tag-low { background: #dbeafe; color: #1e40af; }
        ul, ol { padding-left: 20px; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        .timeline { display: flex; margin-bottom: 20px; }
        .timeline-item { flex: 1; padding: 15px; border-radius: 8px; margin: 0 5px; }
        .timeline-immediate { background: #fee2e2; border: 1px solid #fecaca; }
        .timeline-short { background: #fef3c7; border: 1px solid #fde68a; }
        .timeline-long { background: #dcfce7; border: 1px solid #bbf7d0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Enhanced Legal Document Analysis Report</h1>
        <p><strong>Document:</strong> ${analysis.documentInfo.fileName}</p>
        <p><strong>Jurisdiction:</strong> ${analysis.documentInfo.jurisdiction}</p>
        <p><strong>Analysis Date:</strong> ${new Date(analysis.documentInfo.analysisDate).toLocaleDateString()}</p>
    </div>

    <div class="section">
        <h2>Risk Assessment</h2>
        <p><span class="risk-badge">${analysis.riskAssessment.level}</span></p>
        <p><strong>Risk Score:</strong> ${analysis.riskAssessment.score}/10</p>
        
        <div class="grid">
            ${analysis.riskAssessment.serviceProviderRisks && analysis.riskAssessment.serviceProviderRisks.length > 0 ? `
            <div class="card">
                <h3>Service Provider Risks</h3>
                <ul>
                    ${analysis.riskAssessment.serviceProviderRisks.map(risk => `<li>${risk}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${analysis.riskAssessment.clientRisks && analysis.riskAssessment.clientRisks.length > 0 ? `
            <div class="card">
                <h3>Client Risks</h3>
                <ul>
                    ${analysis.riskAssessment.clientRisks.map(risk => `<li>${risk}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${analysis.riskAssessment.mutualRisks && analysis.riskAssessment.mutualRisks.length > 0 ? `
            <div class="card">
                <h3>Mutual Risks</h3>
                <ul>
                    ${analysis.riskAssessment.mutualRisks.map(risk => `<li>${risk}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${!analysis.riskAssessment.serviceProviderRisks && !analysis.riskAssessment.clientRisks && analysis.riskAssessment.factors ? `
            <div class="card">
                <h3>Risk Factors</h3>
                <ul>
                    ${analysis.riskAssessment.factors.map(factor => `<li>${factor}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        </div>
    </div>

    <div class="section">
        <h2>Executive Summary</h2>
        <p>${analysis.summary}</p>
    </div>

    ${analysis.performanceMetrics ? `
    <div class="section">
        <h2>Performance Metrics & SLA Requirements</h2>
        
        <div class="subsection">
            <h3>SLA Requirements</h3>
            <div class="metrics">
                <p><strong>Uptime:</strong> ${analysis.performanceMetrics.slaRequirements.uptime}</p>
                <p><strong>Response Time:</strong> ${analysis.performanceMetrics.slaRequirements.responseTime}</p>
                <p><strong>Availability:</strong> ${analysis.performanceMetrics.slaRequirements.availability}</p>
                
                ${analysis.performanceMetrics.slaRequirements.performanceThresholds.length > 0 ? `
                <div>
                    <p><strong>Performance Thresholds:</strong></p>
                    <ul>
                        ${analysis.performanceMetrics.slaRequirements.performanceThresholds.map(threshold => `<li>${threshold}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                ${analysis.performanceMetrics.slaRequirements.monitoringRequirements.length > 0 ? `
                <div>
                    <p><strong>Monitoring Requirements:</strong></p>
                    <ul>
                        ${analysis.performanceMetrics.slaRequirements.monitoringRequirements.map(req => `<li>${req}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
            </div>
        </div>
        
        <div class="subsection">
            <h3>Penalties & Reporting</h3>
            <div class="grid">
                <div class="card">
                    <h4>Penalties</h4>
                    ${analysis.performanceMetrics.penalties.uptimePenalties.length > 0 ? `
                    <p><strong>Uptime Penalties:</strong></p>
                    <ul>
                        ${analysis.performanceMetrics.penalties.uptimePenalties.map(penalty => `<li>${penalty}</li>`).join('')}
                    </ul>
                    ` : ''}
                    
                    ${analysis.performanceMetrics.penalties.performancePenalties.length > 0 ? `
                    <p><strong>Performance Penalties:</strong></p>
                    <ul>
                        ${analysis.performanceMetrics.penalties.performancePenalties.map(penalty => `<li>${penalty}</li>`).join('')}
                    </ul>
                    ` : ''}
                </div>
                
                <div class="card">
                    <h4>Reporting</h4>
                    <p><strong>Frequency:</strong> ${analysis.performanceMetrics.reporting.frequency}</p>
                    
                    ${analysis.performanceMetrics.reporting.metrics.length > 0 ? `
                    <p><strong>Metrics:</strong></p>
                    <ul>
                        ${analysis.performanceMetrics.reporting.metrics.map(metric => `<li>${metric}</li>`).join('')}
                    </ul>
                    ` : ''}
                    
                    ${analysis.performanceMetrics.reporting.auditRequirements.length > 0 ? `
                    <p><strong>Audit Requirements:</strong></p>
                    <ul>
                        ${analysis.performanceMetrics.reporting.auditRequirements.map(req => `<li>${req}</li>`).join('')}
                    </ul>
                    ` : ''}
                </div>
            </div>
        </div>
    </div>
    ` : ''}

    ${analysis.counterpartyAnalysis ? `
    <div class="section">
        <h2>Counterparty Perspective Analysis</h2>
        
        <div class="grid">
            <div class="perspective">
                <h3>Service Provider Perspective</h3>
                
                ${analysis.counterpartyAnalysis.serviceProviderPerspective.advantages.length > 0 ? `
                <div>
                    <p><strong>Advantages:</strong></p>
                    <ul>
                        ${analysis.counterpartyAnalysis.serviceProviderPerspective.advantages.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                ${analysis.counterpartyAnalysis.serviceProviderPerspective.risks.length > 0 ? `
                <div>
                    <p><strong>Risks:</strong></p>
                    <ul>
                        ${analysis.counterpartyAnalysis.serviceProviderPerspective.risks.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                ${analysis.counterpartyAnalysis.serviceProviderPerspective.obligations.length > 0 ? `
                <div>
                    <p><strong>Obligations:</strong></p>
                    <ul>
                        ${analysis.counterpartyAnalysis.serviceProviderPerspective.obligations.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                ${analysis.counterpartyAnalysis.serviceProviderPerspective.protections.length > 0 ? `
                <div>
                    <p><strong>Protections:</strong></p>
                    <ul>
                        ${analysis.counterpartyAnalysis.serviceProviderPerspective.protections.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
            </div>
            
            <div class="perspective">
                <h3>Client Perspective</h3>
                
                ${analysis.counterpartyAnalysis.clientPerspective.advantages.length > 0 ? `
                <div>
                    <p><strong>Advantages:</strong></p>
                    <ul>
                        ${analysis.counterpartyAnalysis.clientPerspective.advantages.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                ${analysis.counterpartyAnalysis.clientPerspective.risks.length > 0 ? `
                <div>
                    <p><strong>Risks:</strong></p>
                    <ul>
                        ${analysis.counterpartyAnalysis.clientPerspective.risks.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                ${analysis.counterpartyAnalysis.clientPerspective.obligations.length > 0 ? `
                <div>
                    <p><strong>Obligations:</strong></p>
                    <ul>
                        ${analysis.counterpartyAnalysis.clientPerspective.obligations.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                ${analysis.counterpartyAnalysis.clientPerspective.protections.length > 0 ? `
                <div>
                    <p><strong>Protections:</strong></p>
                    <ul>
                        ${analysis.counterpartyAnalysis.clientPerspective.protections.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
            </div>
        </div>
        
        <div class="subsection">
            <h3>Balance Assessment</h3>
            <p><span class="balance-badge">${analysis.counterpartyAnalysis.balanceAssessment.overall.replace(/_/g, ' ').toUpperCase()}</span></p>
            <p>${analysis.counterpartyAnalysis.balanceAssessment.reasoning}</p>
            
            ${analysis.counterpartyAnalysis.balanceAssessment.recommendations.length > 0 ? `
            <div>
                <p><strong>Rebalancing Recommendations:</strong></p>
                <ul>
                    ${analysis.counterpartyAnalysis.balanceAssessment.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        </div>
    </div>
    ` : ''}

    ${analysis.keyFindings && analysis.keyFindings.length > 0 ? `
    <div class="section">
        <h2>Key Findings</h2>
        ${analysis.keyFindings.map((finding, index) => `
            <div class="finding">
                <h3>${finding.category} 
                    ${finding.severity ? `<span class="tag tag-${finding.severity}">${finding.severity.toUpperCase()}</span>` : ''}
                    ${finding.affectedParty ? `<span class="tag tag-${finding.affectedParty}">${finding.affectedParty.replace('_', ' ').toUpperCase()}</span>` : ''}
                </h3>
                <p>${finding.finding}</p>
                ${finding.impact ? `<p><strong>Impact:</strong> ${finding.impact}</p>` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${analysis.problematicClauses && analysis.problematicClauses.length > 0 ? `
    <div class="section">
        <h2>Problematic Clauses</h2>
        ${analysis.problematicClauses.map((clause, index) => `
            <div class="clause">
                <h3>Issue ${index + 1}
                    ${clause.severity ? `<span class="tag tag-${clause.severity}">${clause.severity.toUpperCase()}</span>` : ''}
                    ${clause.affectedParty ? `<span class="tag tag-${clause.affectedParty}">${clause.affectedParty.replace('_', ' ').toUpperCase()}</span>` : ''}
                </h3>
                <p><strong>Clause:</strong> "${clause.clause}"</p>
                <p><strong>Problem:</strong> ${clause.issue}</p>
                <p><strong>Suggestion:</strong> ${clause.suggestion}</p>
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${analysis.recommendations ? `
    <div class="section">
        <h2>Recommendations</h2>
        ${Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 ? 
            typeof analysis.recommendations[0] === 'string' ? 
                `<ol>
                    ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ol>` 
                : 
                analysis.recommendations.map((rec: any) => `
                    <div class="recommendation">
                        <h3>${rec.category || 'Recommendation'} 
                            ${rec.priority ? `<span class="tag tag-${rec.priority}">${rec.priority.toUpperCase()}</span>` : ''}
                            ${rec.targetParty ? `<span class="tag tag-${rec.targetParty}">${rec.targetParty.replace('_', ' ').toUpperCase()}</span>` : ''}
                        </h3>
                        <p>${rec.recommendation}</p>
                        ${rec.implementation ? `<p><strong>Implementation:</strong> ${rec.implementation}</p>` : ''}
                    </div>
                `).join('') 
            : ''
        }
    </div>
    ` : ''}

    ${analysis.legalCitations && analysis.legalCitations.length > 0 ? `
    <div class="section">
        <h2>Legal Citations</h2>
        <ul>
            ${analysis.legalCitations.map(citation => `<li>${citation}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    ${analysis.nextSteps ? `
    <div class="section">
        <h2>Implementation Timeline</h2>
        
        ${analysis.nextSteps.immediate || analysis.nextSteps.shortTerm || analysis.nextSteps.longTerm ? `
        <div class="timeline">
            ${analysis.nextSteps.immediate && analysis.nextSteps.immediate.length > 0 ? `
            <div class="timeline-item timeline-immediate">
                <h3>Immediate Actions</h3>
                <ol>
                    ${analysis.nextSteps.immediate.map(step => `<li>${step}</li>`).join('')}
                </ol>
            </div>
            ` : ''}
            
            ${analysis.nextSteps.shortTerm && analysis.nextSteps.shortTerm.length > 0 ? `
            <div class="timeline-item timeline-short">
                <h3>Short-term (30 days)</h3>
                <ol>
                    ${analysis.nextSteps.shortTerm.map(step => `<li>${step}</li>`).join('')}
                </ol>
            </div>
            ` : ''}
            
            ${analysis.nextSteps.longTerm && analysis.nextSteps.longTerm.length > 0 ? `
            <div class="timeline-item timeline-long">
                <h3>Long-term</h3>
                <ol>
                    ${analysis.nextSteps.longTerm.map(step => `<li>${step}</li>`).join('')}
                </ol>
            </div>
            ` : ''}
        </div>
        ` : Array.isArray(analysis.nextSteps) && analysis.nextSteps.length > 0 ? `
        <ol>
            ${analysis.nextSteps.map(step => `<li>${step}</li>`).join('')}
        </ol>
        ` : ''}
    </div>
    ` : ''}

    <div class="footer">
        <p>This analysis is for informational purposes only and does not constitute legal advice. 
        Please consult with a qualified attorney for specific legal matters.</p>
        <p>Generated by LegalAI Pro on ${new Date().toLocaleDateString()}</p>
    </div>
</body>
</html>
    `;
  }
}