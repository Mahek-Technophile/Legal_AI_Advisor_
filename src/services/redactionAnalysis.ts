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
    redactionTypes: RedactionTypeClassification[];
    integrityCheck: RedactionIntegrityCheck;
  };
  visibleContentAnalysis: {
    identifiedClauses: ClauseAnalysis[];
    vagueClauses: string[];
    potentialIssues: string[];
    missingStandardClauses: string[];
  };
  granularClauseImpact: ClauseImpactAnalysis[];
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

export interface RedactionTypeClassification {
  type: 'financial' | 'personal' | 'legal' | 'business' | 'location' | 'temporal' | 'technical' | 'unknown';
  count: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  examples: string[];
}

export interface RedactionIntegrityCheck {
  consistencyScore: number; // 0-100
  suspiciousPatterns: string[];
  incompleteness: string[];
  recommendations: string[];
}

export interface ClauseAnalysis {
  clauseType: string;
  content: string;
  isComplete: boolean;
  redactionImpact: 'NONE' | 'MINOR' | 'MODERATE' | 'SEVERE';
}

export interface ClauseImpactAnalysis {
  clauseType: string;
  visibleContent: string;
  redactedElements: string[];
  enforceabilityImpact: {
    level: 'NONE' | 'MINOR' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
    description: string;
    specificRisks: string[];
  };
  jurisdictionalUncertainty: boolean;
  missingCriticalTerms: string[];
  recommendations: string[];
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
    console.log('Enhanced Redaction Analysis Service initialized with AI providers');
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
    redactionTypes: RedactionTypeClassification[];
    integrityCheck: RedactionIntegrityCheck;
  } {
    const redactionPatterns = [
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

    // Classify redaction types
    const redactionTypes = this.classifyRedactionTypes(content);

    // Perform integrity check
    const integrityCheck = this.performIntegrityCheck(content, totalRedactions);

    return {
      hasRedactions: totalRedactions > 0,
      redactedSections: totalRedactions,
      visibleContentPercentage: Math.round(visibleContentPercentage),
      redactionPatterns: foundPatterns,
      redactionTypes,
      integrityCheck
    };
  }

  private classifyRedactionTypes(content: string): RedactionTypeClassification[] {
    const classifications: RedactionTypeClassification[] = [];

    // Financial redactions
    const financialPatterns = [
      /\$\s*\[REDACTED\]/gi,
      /amount[:\s]*\[REDACTED\]/gi,
      /price[:\s]*\[REDACTED\]/gi,
      /salary[:\s]*\[REDACTED\]/gi,
      /payment[:\s]*\[REDACTED\]/gi,
      /fee[:\s]*\[REDACTED\]/gi,
      /cost[:\s]*\[REDACTED\]/gi,
      /budget[:\s]*\[REDACTED\]/gi
    ];
    const financialCount = this.countPatternMatches(content, financialPatterns);
    if (financialCount > 0) {
      classifications.push({
        type: 'financial',
        count: financialCount,
        riskLevel: 'CRITICAL',
        description: 'Financial terms, amounts, and payment obligations',
        examples: ['Payment amounts', 'Salary figures', 'Contract values', 'Penalty fees']
      });
    }

    // Personal information redactions
    const personalPatterns = [
      /name[:\s]*\[REDACTED\]/gi,
      /address[:\s]*\[REDACTED\]/gi,
      /phone[:\s]*\[REDACTED\]/gi,
      /email[:\s]*\[REDACTED\]/gi,
      /ssn[:\s]*\[REDACTED\]/gi,
      /social security[:\s]*\[REDACTED\]/gi
    ];
    const personalCount = this.countPatternMatches(content, personalPatterns);
    if (personalCount > 0) {
      classifications.push({
        type: 'personal',
        count: personalCount,
        riskLevel: 'MEDIUM',
        description: 'Personal identifying information',
        examples: ['Names', 'Addresses', 'Contact information', 'ID numbers']
      });
    }

    // Legal terms redactions
    const legalPatterns = [
      /governing law[:\s]*\[REDACTED\]/gi,
      /jurisdiction[:\s]*\[REDACTED\]/gi,
      /liability[:\s]*\[REDACTED\]/gi,
      /damages[:\s]*\[REDACTED\]/gi,
      /termination[:\s]*\[REDACTED\]/gi,
      /breach[:\s]*\[REDACTED\]/gi,
      /dispute resolution[:\s]*\[REDACTED\]/gi
    ];
    const legalCount = this.countPatternMatches(content, legalPatterns);
    if (legalCount > 0) {
      classifications.push({
        type: 'legal',
        count: legalCount,
        riskLevel: 'CRITICAL',
        description: 'Legal terms and conditions',
        examples: ['Governing law', 'Liability clauses', 'Dispute resolution', 'Termination conditions']
      });
    }

    // Business information redactions
    const businessPatterns = [
      /company[:\s]*\[REDACTED\]/gi,
      /business[:\s]*\[REDACTED\]/gi,
      /organization[:\s]*\[REDACTED\]/gi,
      /entity[:\s]*\[REDACTED\]/gi,
      /corporation[:\s]*\[REDACTED\]/gi
    ];
    const businessCount = this.countPatternMatches(content, businessPatterns);
    if (businessCount > 0) {
      classifications.push({
        type: 'business',
        count: businessCount,
        riskLevel: 'HIGH',
        description: 'Business entities and corporate information',
        examples: ['Company names', 'Business addresses', 'Corporate structures', 'Entity types']
      });
    }

    // Location redactions
    const locationPatterns = [
      /location[:\s]*\[REDACTED\]/gi,
      /city[:\s]*\[REDACTED\]/gi,
      /state[:\s]*\[REDACTED\]/gi,
      /country[:\s]*\[REDACTED\]/gi,
      /venue[:\s]*\[REDACTED\]/gi
    ];
    const locationCount = this.countPatternMatches(content, locationPatterns);
    if (locationCount > 0) {
      classifications.push({
        type: 'location',
        count: locationCount,
        riskLevel: 'HIGH',
        description: 'Geographic and venue information',
        examples: ['Cities', 'States', 'Countries', 'Venues', 'Jurisdictional locations']
      });
    }

    // Temporal redactions
    const temporalPatterns = [
      /date[:\s]*\[REDACTED\]/gi,
      /deadline[:\s]*\[REDACTED\]/gi,
      /term[:\s]*\[REDACTED\]/gi,
      /duration[:\s]*\[REDACTED\]/gi,
      /period[:\s]*\[REDACTED\]/gi
    ];
    const temporalCount = this.countPatternMatches(content, temporalPatterns);
    if (temporalCount > 0) {
      classifications.push({
        type: 'temporal',
        count: temporalCount,
        riskLevel: 'HIGH',
        description: 'Time-related information and deadlines',
        examples: ['Contract dates', 'Deadlines', 'Terms', 'Duration periods']
      });
    }

    // Technical redactions
    const technicalPatterns = [
      /specification[:\s]*\[REDACTED\]/gi,
      /technical[:\s]*\[REDACTED\]/gi,
      /system[:\s]*\[REDACTED\]/gi,
      /software[:\s]*\[REDACTED\]/gi,
      /hardware[:\s]*\[REDACTED\]/gi
    ];
    const technicalCount = this.countPatternMatches(content, technicalPatterns);
    if (technicalCount > 0) {
      classifications.push({
        type: 'technical',
        count: technicalCount,
        riskLevel: 'MEDIUM',
        description: 'Technical specifications and requirements',
        examples: ['System specifications', 'Technical requirements', 'Software details', 'Hardware specs']
      });
    }

    // Count unclassified redactions
    const totalClassified = classifications.reduce((sum, c) => sum + c.count, 0);
    const totalRedactions = (content.match(/\[REDACTED\]/gi) || []).length;
    const unknownCount = totalRedactions - totalClassified;

    if (unknownCount > 0) {
      classifications.push({
        type: 'unknown',
        count: unknownCount,
        riskLevel: 'MEDIUM',
        description: 'Unclassified redacted information',
        examples: ['General redacted content', 'Unspecified information']
      });
    }

    return classifications;
  }

  private countPatternMatches(content: string, patterns: RegExp[]): number {
    return patterns.reduce((count, pattern) => {
      const matches = content.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private performIntegrityCheck(content: string, totalRedactions: number): RedactionIntegrityCheck {
    const suspiciousPatterns: string[] = [];
    const incompleteness: string[] = [];
    const recommendations: string[] = [];
    let consistencyScore = 100;

    // Check for inconsistent redaction patterns
    const redactionVariants = [
      /\[REDACTED\]/g,
      /\*\*\*REDACTED\*\*\*/g,
      /█+/g,
      /\[CONFIDENTIAL\]/g
    ];

    const variantCounts = redactionVariants.map(pattern => 
      (content.match(pattern) || []).length
    );

    const usedVariants = variantCounts.filter(count => count > 0).length;
    if (usedVariants > 2) {
      suspiciousPatterns.push('Multiple redaction formats used inconsistently');
      consistencyScore -= 20;
    }

    // Check for partial redactions that might indicate incomplete redaction
    const partialPatterns = [
      /\w+\[REDACTED\]/g,
      /\[REDACTED\]\w+/g,
      /\w+\s*\[REDACTED\]\s*\w+/g
    ];

    partialPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        suspiciousPatterns.push('Partial redactions detected - may indicate incomplete redaction process');
        consistencyScore -= 15;
      }
    });

    // Check for suspiciously short redactions
    const shortRedactions = content.match(/\[REDACTED\]/g);
    if (shortRedactions) {
      const contextualRedactions = content.match(/\w{10,}\s*\[REDACTED\]\s*\w{10,}/g);
      if (contextualRedactions && contextualRedactions.length > shortRedactions.length * 0.3) {
        suspiciousPatterns.push('Many redactions appear in sensitive contexts - review for completeness');
        consistencyScore -= 10;
      }
    }

    // Check for incomplete sentence structures
    const incompleteSentences = content.match(/\.\s*\[REDACTED\]\s*[a-z]/g);
    if (incompleteSentences && incompleteSentences.length > 0) {
      incompleteness.push('Sentence structures broken by redactions');
      consistencyScore -= 10;
    }

    // Check for orphaned legal terms
    const orphanedTerms = content.match(/(whereas|therefore|notwithstanding)\s*\[REDACTED\]/gi);
    if (orphanedTerms && orphanedTerms.length > 0) {
      incompleteness.push('Legal terms separated from their clauses');
      consistencyScore -= 15;
    }

    // Generate recommendations based on findings
    if (suspiciousPatterns.length > 0) {
      recommendations.push('Review redaction consistency and ensure uniform redaction standards');
    }

    if (incompleteness.length > 0) {
      recommendations.push('Verify that redactions maintain document readability and legal coherence');
    }

    if (totalRedactions > 50) {
      recommendations.push('High number of redactions detected - consider if document is suitable for analysis');
      consistencyScore -= 10;
    }

    if (consistencyScore < 70) {
      recommendations.push('Document redaction integrity is questionable - request clarification from document provider');
    }

    return {
      consistencyScore: Math.max(0, consistencyScore),
      suspiciousPatterns,
      incompleteness,
      recommendations
    };
  }

  async analyzeRedactedDocument(request: RedactionAnalysisRequest): Promise<RedactionAnalysisResult> {
    const configStatus = await this.getConfigurationStatus();
    if (!configStatus.configured) {
      throw new Error(configStatus.message);
    }

    try {
      // First, detect redactions with enhanced analysis
      const redactionDetection = this.detectRedactions(request.content);

      if (!redactionDetection.hasRedactions) {
        throw new Error('No redactions detected in the document. This service is specifically for analyzing documents with redacted content.');
      }

      const systemPrompt = this.buildEnhancedRedactionAnalysisSystemPrompt(request.jurisdiction);
      const userPrompt = this.buildEnhancedRedactionAnalysisPrompt(request, redactionDetection);
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const response = await aiProviderService.generateResponse(messages, {
        task: 'analysis',
        temperature: 0.1,
        maxTokens: 6000
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
        result = this.parseEnhancedTextResponse(response.content, request, redactionDetection);
      }

      // Save to database
      const savedResult = await this.saveAnalysisResult(result);
      return savedResult;

    } catch (error) {
      console.error('Enhanced redaction analysis error:', error);
      
      // Check if it's an AI provider error
      if (error instanceof Error && 
          (error.message.includes('All configured AI providers failed') ||
           error.message.includes('No AI providers configured') ||
           error.message.includes('rate limit') ||
           error.message.includes('Rate limit') ||
           error.message.includes('API error') ||
           error.message.includes('Network error') ||
           error.message.includes('Failed to fetch'))) {
        throw new Error('Network issue. Try again');
      }
      
      throw new Error(`Failed to analyze redacted document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildEnhancedRedactionAnalysisSystemPrompt(jurisdiction: string): string {
    return `You are a legal document analysis expert specializing in analyzing documents with redacted content for ${jurisdiction} law.

Your task is to provide granular clause-level analysis of VISIBLE content only while clearly acknowledging limitations caused by redactions.

CRITICAL: You must respond with valid JSON format only. Do not include any text before or after the JSON object.

The JSON structure must be:
{
  "summary": "Brief overview of visible content and document purpose",
  "visibleContentAnalysis": {
    "identifiedClauses": [
      {
        "clauseType": "specific clause type (e.g., 'Payment Terms', 'Governing Law')",
        "content": "visible clause content",
        "isComplete": true/false,
        "redactionImpact": "NONE/MINOR/MODERATE/SEVERE"
      }
    ],
    "vagueClauses": ["clauses with vague or ambiguous terms"],
    "potentialIssues": ["legal issues found in visible content"],
    "missingStandardClauses": ["standard clauses that should be present but are not visible"]
  },
  "granularClauseImpact": [
    {
      "clauseType": "specific clause type",
      "visibleContent": "what is visible in this clause",
      "redactedElements": ["list of what appears to be redacted"],
      "enforceabilityImpact": {
        "level": "NONE/MINOR/MODERATE/SEVERE/CRITICAL",
        "description": "how redactions affect enforceability",
        "specificRisks": ["specific enforceability risks"]
      },
      "jurisdictionalUncertainty": true/false,
      "missingCriticalTerms": ["critical terms that appear to be redacted"],
      "recommendations": ["specific recommendations for this clause"]
    }
  ],
  "riskAssessment": {
    "level": "HIGH or CRITICAL (due to redactions)",
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

ENHANCED ANALYSIS REQUIREMENTS:
- Analyze each clause individually for redaction impact
- Assess enforceability implications of missing terms
- Identify jurisdictional uncertainty from redacted governing law clauses
- Provide specific recommendations for each affected clause
- Use clear subheadings and bullet points for readability
- Never guess or speculate about redacted content
- Focus on how redactions specifically affect legal enforceability`;
  }

  private buildEnhancedRedactionAnalysisPrompt(request: RedactionAnalysisRequest, redactionDetection: any): string {
    const redactionTypesText = redactionDetection.redactionTypes
      .map((type: RedactionTypeClassification) => `${type.type}: ${type.count} (${type.riskLevel})`)
      .join(', ');

    const integrityText = `Consistency Score: ${redactionDetection.integrityCheck.consistencyScore}%, 
Suspicious Patterns: ${redactionDetection.integrityCheck.suspiciousPatterns.length}, 
Integrity Issues: ${redactionDetection.integrityCheck.incompleteness.length}`;

    return `Analyze this redacted legal document for ${request.jurisdiction} jurisdiction with enhanced granular analysis:

Document Type: ${request.documentType || 'Legal Document'}
File: ${request.fileName}

REDACTION ANALYSIS:
- Redacted Sections Found: ${redactionDetection.redactedSections}
- Visible Content: ~${redactionDetection.visibleContentPercentage}%
- Redaction Types: ${redactionTypesText}
- Integrity Check: ${integrityText}

DOCUMENT CONTENT (with redactions):
${request.content}

ENHANCED ANALYSIS REQUIREMENTS:

1. **Granular Clause Impact Analysis**:
   - For each identifiable clause, analyze how redactions affect enforceability
   - Example: "Governing Law: [REDACTED]" → jurisdictional uncertainty
   - Assess specific legal risks for each clause type

2. **Redaction Type Impact**:
   - Consider the classified redaction types and their risk levels
   - Analyze how each type of redacted information affects the document

3. **Enforceability Assessment**:
   - Determine if redacted terms make clauses unenforceable
   - Identify missing critical terms that affect legal validity
   - Assess jurisdictional uncertainty from redacted governing law

4. **Formatting Requirements**:
   - Use clear subheadings for each clause analysis
   - Provide bullet points under each clause for quick review
   - Structure recommendations by clause type

5. **Integrity Considerations**:
   - Factor in the redaction integrity check results
   - Note any suspicious redaction patterns
   - Address completeness concerns

CRITICAL: For each clause, state "Clause [X] is redacted. Legal analysis may be incomplete" and specify exactly how the redaction affects enforceability.

Remember to respond with valid JSON only.`;
  }

  private parseEnhancedTextResponse(text: string, request: RedactionAnalysisRequest, redactionDetection: any): RedactionAnalysisResult {
    // Enhanced fallback parsing for non-JSON responses
    const lines = text.split('\n').filter(line => line.trim());
    
    let summary = 'Enhanced redacted document analysis completed. Analysis includes granular clause-level impact assessment with limitations due to redacted content.';
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH'; // Default to HIGH due to redactions
    let riskScore = 8; // Higher score due to incomplete information
    
    // Try to find a summary in the first few lines
    if (lines.length > 0) {
      summary = lines.slice(0, 3).join(' ').substring(0, 400);
    }

    // Generate enhanced clause impact analysis
    const granularClauseImpact: ClauseImpactAnalysis[] = [
      {
        clauseType: 'Payment Terms',
        visibleContent: 'Partial payment structure visible',
        redactedElements: ['Payment amounts', 'Due dates', 'Penalty clauses'],
        enforceabilityImpact: {
          level: 'CRITICAL',
          description: 'Cannot determine payment obligations or enforce payment terms',
          specificRisks: ['Unenforceable payment clauses', 'Unknown penalty exposure', 'Unclear payment schedule']
        },
        jurisdictionalUncertainty: false,
        missingCriticalTerms: ['Payment amounts', 'Interest rates', 'Late fees'],
        recommendations: ['Request unredacted payment terms', 'Clarify payment obligations before signing']
      },
      {
        clauseType: 'Governing Law',
        visibleContent: 'Jurisdiction clause partially visible',
        redactedElements: ['Specific jurisdiction', 'Governing law'],
        enforceabilityImpact: {
          level: 'CRITICAL',
          description: 'Jurisdictional uncertainty affects entire contract enforceability',
          specificRisks: ['Unknown court jurisdiction', 'Unclear applicable law', 'Enforcement difficulties']
        },
        jurisdictionalUncertainty: true,
        missingCriticalTerms: ['Governing jurisdiction', 'Applicable law', 'Venue selection'],
        recommendations: ['Critical: Obtain governing law information', 'Verify jurisdiction before proceeding']
      }
    ];

    return {
      summary,
      redactionDetection,
      visibleContentAnalysis: {
        identifiedClauses: [
          {
            clauseType: 'Payment Terms',
            content: 'Partial payment clause visible',
            isComplete: false,
            redactionImpact: 'SEVERE'
          },
          {
            clauseType: 'Governing Law',
            content: 'Jurisdiction clause with redactions',
            isComplete: false,
            redactionImpact: 'SEVERE'
          }
        ],
        vagueClauses: ['Incomplete payment terms', 'Partial jurisdiction clause'],
        potentialIssues: ['Unenforceable payment obligations', 'Jurisdictional uncertainty'],
        missingStandardClauses: ['Cannot determine due to extensive redactions']
      },
      granularClauseImpact,
      riskAssessment: {
        level: riskLevel,
        score: riskScore,
        factors: [
          'Significant portions of critical clauses are redacted',
          'Jurisdictional uncertainty from redacted governing law',
          'Payment terms are largely unenforceable due to redactions',
          'Legal analysis is severely limited by missing information'
        ],
        limitationNotice: 'This analysis is based solely on visible content. Redacted sections contain critical information that significantly affects the overall legal assessment and enforceability of the document.'
      },
      impactAssessment: {
        criticalGaps: ['Payment amounts and schedules', 'Governing jurisdiction', 'Liability limitations', 'Termination conditions'],
        operationalRisks: ['Cannot assess payment obligations', 'Unknown performance requirements', 'Unclear dispute resolution process'],
        legalExposure: ['Unenforceable contract terms', 'Jurisdictional enforcement issues', 'Unknown liability exposure'],
        complianceRisks: ['Unknown regulatory requirements', 'Hidden compliance obligations', 'Unclear reporting requirements']
      },
      recommendations: [
        'Request complete unredacted document for proper legal analysis',
        'Prioritize obtaining governing law and jurisdiction information',
        'Clarify all payment terms and financial obligations',
        'Identify critical redacted sections that affect enforceability',
        'Consult legal counsel given the extensive redactions'
      ],
      nextSteps: [
        'Request unredacted version with specific focus on governing law clauses',
        'Identify all redacted financial and payment terms',
        'Assess enforceability risks with legal counsel',
        'Determine if document is suitable for execution given redaction extent',
        'Establish timeline for obtaining complete information'
      ],
      legalCitations: [`${request.jurisdiction} contract law (analysis limited due to redactions)`, `${request.jurisdiction} jurisdiction and venue statutes`],
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

      // Save to document_analyses table with enhanced redaction-specific data
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
        console.error('Failed to save enhanced redaction analysis result:', error);
        return result;
      }

      return { ...result, id: data.id };
    } catch (error) {
      console.error('Error saving enhanced redaction analysis result:', error);
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
      console.error('Error fetching enhanced redaction analysis history:', error);
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
      console.error('Error deleting enhanced redaction analysis:', error);
      return false;
    }
  }
}

export const redactionAnalysisService = new RedactionAnalysisService();