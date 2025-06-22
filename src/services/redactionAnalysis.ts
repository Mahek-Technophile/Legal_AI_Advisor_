import { supabase } from '../lib/supabase';
import mammoth from 'mammoth';
import { aiProviderService } from './aiProviders';

export interface RedactionAnalysisResult {
  id?: string;
  summary: string;
  redactionDetection: {
    hasRedactions: boolean;
    redactedSections: number;
    visibleContentPercentage: number;
    redactionPatterns: string[];
  };
  visibleContentAnalysis: {
    identifiedClauses: string[];
    vagueClauses: string[];
    potentialIssues: string[];
    missingStandardClauses: string[];
  };
  riskAssessment: {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    score: number;
    factors: string[];
    limitationNotice: string;
  };
  impactAssessment: {
    criticalGaps: string[];
    operationalRisks: string[];
    legalExposure: string[];
    complianceRisks: string[];
  };
  recommendations: string[];
  nextSteps: string[];
  legalCitations: string[];
  documentInfo: {
    fileName: string;
    fileSize: number;
    fileType: string;
    jurisdiction: string;
    analysisDate: string;
  };
}

export interface RedactionAnalysisRequest {
  content: string;
  documentType?: string;
  jurisdiction: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

class RedactionAnalysisService {
  constructor() {
    console.log('Redaction Analysis Service initialized with AI providers');
  }

  async isConfigured(): Promise<boolean> {
    const status = aiProviderService.getProviderStatus();
    return Object.values(status).some(provider => provider.configured);
  }

  async getConfigurationStatus(): Promise<{ 
    configured: boolean; 
    message: string; 
    availableProviders?: Array<{ name: string; configured: boolean; available: boolean }>;
  }> {
    const status = aiProviderService.getProviderStatus();
    const configuredProviders = Object.entries(status).filter(([_, config]) => config.configured);

    if (configuredProviders.length === 0) {
      return {
        configured: false,
        message: 'No AI providers configured. Please add API keys to your environment variables.',
        availableProviders: Object.entries(status).map(([key, config]) => ({
          name: config.name,
          configured: config.configured,
          available: config.available
        }))
      };
    }

    const availableProviders = configuredProviders.filter(([_, config]) => config.available);
    
    if (availableProviders.length === 0) {
      return {
        configured: false,
        message: 'AI providers configured but rate limits exceeded. Please wait or configure additional providers.',
        availableProviders: Object.entries(status).map(([key, config]) => ({
          name: config.name,
          configured: config.configured,
          available: config.available
        }))
      };
    }

    return {
      configured: true,
      message: `Ready with ${configuredProviders.length} AI provider(s). ${availableProviders.length} currently available.`,
      availableProviders: Object.entries(status).map(([key, config]) => ({
        name: config.name,
        configured: config.configured,
        available: config.available
      }))
    };
  }

  detectRedactions(content: string): {
    hasRedactions: boolean;
    redactedSections: number;
    visibleContentPercentage: number;
    redactionPatterns: string[];
  } {
    const redactionPatterns = [
      /\[REDACTED\]/gi,
      /\[REDACTED\]/gi,
      /\*\*\*REDACTED\*\*\*/gi,
      /█+/g,
      /\[CONFIDENTIAL\]/gi,
      /\[CLASSIFIED\]/gi,
      /\[REMOVED\]/gi,
      /\[WITHHELD\]/gi,
      /\[PROTECTED\]/gi,
      /\[SEALED\]/gi,
      /\[PRIVILEGED\]/gi,
      /\[ATTORNEY-CLIENT PRIVILEGE\]/gi,
      /\[WORK PRODUCT\]/gi,
      /\[TRADE SECRET\]/gi,
      /\[PROPRIETARY\]/gi,
      /\[PERSONAL INFORMATION\]/gi,
      /\[PII\]/gi,
      /\[SENSITIVE\]/gi,
      /\[CONFIDENTIAL INFORMATION\]/gi,
      /\[BUSINESS CONFIDENTIAL\]/gi
    ];

    let totalRedactions = 0;
    const foundPatterns: string[] = [];

    redactionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        totalRedactions += matches.length;
        foundPatterns.push(pattern.source);
      }
    });

    // Estimate visible content percentage
    const totalWords = content.split(/\s+/).length;
    const redactedWords = totalRedactions * 3; // Assume average 3 words per redaction
    const visibleContentPercentage = Math.max(0, Math.min(100, ((totalWords - redactedWords) / totalWords) * 100));

    return {
      hasRedactions: totalRedactions > 0,
      redactedSections: totalRedactions,
      visibleContentPercentage: Math.round(visibleContentPercentage),
      redactionPatterns: foundPatterns
    };
  }

  async analyzeRedactedDocument(request: RedactionAnalysisRequest): Promise<RedactionAnalysisResult> {
    const configStatus = await this.getConfigurationStatus();
    if (!configStatus.configured) {
      throw new Error(configStatus.message);
    }

    try {
      // First, detect redactions
      const redactionDetection = this.detectRedactions(request.content);

      if (!redactionDetection.hasRedactions) {
        throw new Error('No redactions detected in the document. This service is specifically for analyzing documents with redacted content.');
      }

      const systemPrompt = this.buildRedactionAnalysisSystemPrompt(request.jurisdiction);
      const userPrompt = this.buildRedactionAnalysisPrompt(request, redactionDetection);
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const response = await aiProviderService.generateResponse(messages, {
        task: 'analysis',
        temperature: 0.1,
        maxTokens: 4000
      });

      let result: RedactionAnalysisResult;
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(response.content);
        result = {
          ...parsed,
          redactionDetection,
          documentInfo: {
            fileName: request.fileName,
            fileSize: request.fileSize,
            fileType: request.fileType,
            jurisdiction: request.jurisdiction,
            analysisDate: new Date().toISOString()
          }
        };
      } catch (parseError) {
        // Fallback to text parsing if JSON parsing fails
        result = this.parseTextResponse(response.content, request, redactionDetection);
      }

      // Save to database
      const savedResult = await this.saveAnalysisResult(result);
      return savedResult;

    } catch (error) {
      console.error('Redaction analysis error:', error);
      throw new Error(`Failed to analyze redacted document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildRedactionAnalysisSystemPrompt(jurisdiction: string): string {
    return `You are a legal document analysis expert specializing in analyzing documents with redacted content for ${jurisdiction} law.

Your task is to analyze the VISIBLE content only and provide a comprehensive assessment while clearly acknowledging the limitations caused by redactions.

CRITICAL: You must respond with valid JSON format only. Do not include any text before or after the JSON object.

The JSON structure must be:
{
  "summary": "Brief overview of visible content and document purpose",
  "visibleContentAnalysis": {
    "identifiedClauses": ["list of clauses that are visible"],
    "vagueClauses": ["clauses with vague or ambiguous terms"],
    "potentialIssues": ["legal issues found in visible content"],
    "missingStandardClauses": ["standard clauses that should be present but are not visible"]
  },
  "riskAssessment": {
    "level": "HIGH (due to redactions) or CRITICAL",
    "score": 6-10,
    "factors": ["specific risk factors from visible content and redactions"],
    "limitationNotice": "Clear statement about analysis limitations due to redactions"
  },
  "impactAssessment": {
    "criticalGaps": ["critical information that is redacted"],
    "operationalRisks": ["operational risks due to missing information"],
    "legalExposure": ["potential legal exposure from redacted terms"],
    "complianceRisks": ["compliance risks from hidden information"]
  },
  "recommendations": ["actionable recommendations given the limitations"],
  "nextSteps": ["immediate actions to address redaction limitations"],
  "legalCitations": ["relevant laws for ${jurisdiction}"]
}

IMPORTANT PRINCIPLES:
- NEVER guess or speculate about redacted content
- Clearly state when analysis is incomplete due to redactions
- Focus only on visible content for legal analysis
- Acknowledge that redacted sections may contain critical information
- Recommend obtaining unredacted versions when possible
- Assess risk as HIGH or CRITICAL due to incomplete information`;
  }

  private buildRedactionAnalysisPrompt(request: RedactionAnalysisRequest, redactionDetection: any): string {
    return `Analyze this redacted legal document for ${request.jurisdiction} jurisdiction:

Document Type: ${request.documentType || 'Legal Document'}
File: ${request.fileName}

REDACTION ANALYSIS:
- Redacted Sections Found: ${redactionDetection.redactedSections}
- Visible Content: ~${redactionDetection.visibleContentPercentage}%
- Redaction Patterns: ${redactionDetection.redactionPatterns.join(', ')}

DOCUMENT CONTENT (with redactions):
${request.content}

ANALYSIS REQUIREMENTS:
1. Analyze ONLY the visible content - do not speculate about redacted sections
2. Identify what types of information appear to be redacted based on context
3. Assess legal risks from visible clauses only
4. Note where redacted content creates critical information gaps
5. Recommend steps to obtain complete information
6. Provide jurisdiction-specific legal citations for visible content

CRITICAL: State clearly that "Clause X is redacted. Legal analysis may be incomplete" for each redacted section.

Remember to respond with valid JSON only.`;
  }

  private parseTextResponse(text: string, request: RedactionAnalysisRequest, redactionDetection: any): RedactionAnalysisResult {
    // Enhanced fallback parsing for non-JSON responses
    const lines = text.split('\n').filter(line => line.trim());
    
    let summary = 'Redacted document analysis completed. Analysis is limited due to redacted content.';
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH'; // Default to HIGH due to redactions
    let riskScore = 7; // Higher score due to incomplete information
    const recommendations: string[] = [];
    
    // Try to find a summary in the first few lines
    if (lines.length > 0) {
      summary = lines.slice(0, 3).join(' ').substring(0, 300);
    }

    // Default recommendations for redacted documents
    recommendations.push(
      'Request unredacted version of the document for complete analysis',
      'Identify specific sections that are redacted and their importance',
      'Consult with legal counsel given the incomplete information',
      'Assess whether redacted information is critical for decision-making'
    );

    return {
      summary,
      redactionDetection,
      visibleContentAnalysis: {
        identifiedClauses: ['Analysis completed with limited visible content'],
        vagueClauses: [],
        potentialIssues: ['Incomplete information due to redactions'],
        missingStandardClauses: ['Cannot determine due to redacted content']
      },
      riskAssessment: {
        level: riskLevel,
        score: riskScore,
        factors: [
          'Significant portions of document are redacted',
          'Legal analysis is incomplete due to missing information',
          'Critical terms and conditions may be hidden'
        ],
        limitationNotice: 'This analysis is based solely on visible content. Redacted sections may contain critical information that affects the overall assessment.'
      },
      impactAssessment: {
        criticalGaps: ['Redacted financial terms', 'Hidden liability clauses', 'Undisclosed obligations'],
        operationalRisks: ['Cannot assess full scope of obligations', 'Unknown performance requirements'],
        legalExposure: ['Undisclosed liability terms', 'Hidden penalty clauses'],
        complianceRisks: ['Unknown regulatory requirements', 'Hidden compliance obligations']
      },
      recommendations,
      nextSteps: [
        'Request complete unredacted document',
        'Identify critical redacted sections',
        'Consult legal counsel for guidance',
        'Assess decision-making impact of missing information'
      ],
      legalCitations: [`${request.jurisdiction} applicable law (limited analysis due to redactions)`],
      documentInfo: {
        fileName: request.fileName,
        fileSize: request.fileSize,
        fileType: request.fileType,
        jurisdiction: request.jurisdiction,
        analysisDate: new Date().toISOString()
      }
    };
  }

  async extractTextFromFile(file: File): Promise<string> {
    const fileType = file.type;
    
    if (fileType === 'text/plain') {
      return this.extractTextFromTxt(file);
    } else if (fileType === 'application/pdf') {
      return this.extractTextFromPdfFallback(file);
    } else if (fileType === 'application/msword' || 
               fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return this.extractTextFromDoc(file);
    } else {
      throw new Error(`Unsupported file type: ${fileType}. Please convert to TXT, DOC, or DOCX format.`);
    }
  }

  private async extractTextFromTxt(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target?.result as string);
      };
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  }

  private async extractTextFromPdfFallback(file: File): Promise<string> {
    throw new Error(`PDF processing is currently unavailable. Please convert your PDF to one of these formats:
    
• Word Document (.docx) - Use "Save As" in your PDF viewer
• Plain Text (.txt) - Copy and paste the text content
• Word Document (.doc) - Use "Export" feature in your PDF viewer

This ensures reliable text extraction and analysis.`);
  }

  private async extractTextFromDoc(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          
          if (!result.value.trim()) {
            throw new Error('No text content found in document.');
          }
          
          resolve(result.value);
        } catch (error) {
          reject(new Error(`Failed to extract text from document: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read document file'));
      reader.readAsArrayBuffer(file);
    });
  }

  private async saveAnalysisResult(result: RedactionAnalysisResult): Promise<RedactionAnalysisResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No authenticated user, skipping database save');
        return result;
      }

      // Save to document_analyses table with redaction-specific data
      const { data, error } = await supabase
        .from('document_analyses')
        .insert({
          user_id: user.id,
          file_name: result.documentInfo.fileName,
          file_type: result.documentInfo.fileType,
          file_size: result.documentInfo.fileSize,
          jurisdiction: result.documentInfo.jurisdiction,
          analysis_result: result,
          risk_level: result.riskAssessment.level,
          risk_score: result.riskAssessment.score
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save redaction analysis result:', error);
        return result;
      }

      return { ...result, id: data.id };
    } catch (error) {
      console.error('Error saving redaction analysis result:', error);
      return result;
    }
  }

  async getAnalysisHistory(limit = 10): Promise<RedactionAnalysisResult[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('document_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Filter for redaction analyses (those with redactionDetection data)
      return data
        .filter(item => item.analysis_result?.redactionDetection)
        .map(item => ({
          ...item.analysis_result,
          id: item.id
        }));
    } catch (error) {
      console.error('Error fetching redaction analysis history:', error);
      return [];
    }
  }

  async deleteAnalysis(id: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('document_analyses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      return !error;
    } catch (error) {
      console.error('Error deleting redaction analysis:', error);
      return false;
    }
  }
}

export const redactionAnalysisService = new RedactionAnalysisService();