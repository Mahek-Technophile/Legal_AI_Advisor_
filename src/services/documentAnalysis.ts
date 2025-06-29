import { supabase } from '../lib/supabase';
import mammoth from 'mammoth';
import { aiProviderService } from './aiProviders';

export interface DocumentAnalysisResult {
  id?: string;
  summary: string;
  riskAssessment: {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    score: number;
    factors: string[];
    serviceProviderRisks: string[];
    clientRisks: string[];
    mutualRisks: string[];
  };
  keyFindings: {
    category: string;
    finding: string;
    severity: 'info' | 'warning' | 'critical';
    affectedParty: 'service_provider' | 'client' | 'both';
    impact: string;
  }[];
  recommendations: {
    category: string;
    recommendation: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    targetParty: 'service_provider' | 'client' | 'both';
    implementation: string;
  }[];
  missingClauses: {
    clause: string;
    importance: 'low' | 'medium' | 'high' | 'critical';
    beneficiary: 'service_provider' | 'client' | 'both';
    riskMitigation: string;
  }[];
  problematicClauses: {
    clause: string;
    issue: string;
    suggestion: string;
    affectedParty: 'service_provider' | 'client' | 'both';
    severity: 'minor' | 'moderate' | 'major' | 'critical';
  }[];
  performanceMetrics: {
    slaRequirements: {
      uptime: string;
      responseTime: string;
      availability: string;
      performanceThresholds: string[];
      monitoringRequirements: string[];
    };
    penalties: {
      uptimePenalties: string[];
      performancePenalties: string[];
      escalationProcedures: string[];
    };
    reporting: {
      frequency: string;
      metrics: string[];
      auditRequirements: string[];
    };
  };
  counterpartyAnalysis: {
    serviceProviderPerspective: {
      advantages: string[];
      risks: string[];
      obligations: string[];
      protections: string[];
    };
    clientPerspective: {
      advantages: string[];
      risks: string[];
      obligations: string[];
      protections: string[];
    };
    balanceAssessment: {
      overall: 'heavily_favors_provider' | 'favors_provider' | 'balanced' | 'favors_client' | 'heavily_favors_client';
      reasoning: string;
      recommendations: string[];
    };
  };
  legalCitations: string[];
  nextSteps: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  documentInfo: {
    fileName: string;
    fileSize: number;
    fileType: string;
    jurisdiction: string;
    analysisDate: string;
  };
}

export interface DocumentAnalysisRequest {
  content: string;
  documentType?: string;
  jurisdiction: string;
  analysisType: 'comprehensive' | 'risk-only' | 'compliance';
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface BatchAnalysisResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalFiles: number;
  completedFiles: number;
  results: DocumentAnalysisResult[];
  errors: string[];
  createdAt: string;
}

class DocumentAnalysisService {
  constructor() {
    console.log('Enhanced Document Analysis Service initialized with cloud AI providers');
  }

  async isConfigured(): Promise<boolean> {
    const status = aiProviderService.getProviderStatus();
    return Object.values(status).some(provider => provider.configured);
  }

  async getConfigurationStatus(): Promise<{ 
    configured: boolean; 
    message: string; 
    availableProviders?: Array<{ name: string; configured: boolean; available: boolean }>;
    recommendations?: Array<{ provider: string; task: string; reason: string }>;
  }> {
    const status = aiProviderService.getProviderStatus();
    const configuredProviders = Object.entries(status).filter(([_, config]) => config.configured);
    const recommendations = aiProviderService.getRecommendedProviders();

    if (configuredProviders.length === 0) {
      return {
        configured: false,
        message: 'No AI providers configured. Please add API keys to your environment variables.',
        availableProviders: Object.entries(status).map(([key, config]) => ({
          name: config.name,
          configured: config.configured,
          available: config.available
        })),
        recommendations
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
        })),
        recommendations
      };
    }

    return {
      configured: true,
      message: `Ready with ${configuredProviders.length} AI provider(s). ${availableProviders.length} currently available.`,
      availableProviders: Object.entries(status).map(([key, config]) => ({
        name: config.name,
        configured: config.configured,
        available: config.available
      })),
      recommendations
    };
  }

  async analyzeDocument(request: DocumentAnalysisRequest): Promise<DocumentAnalysisResult> {
    const configStatus = await this.getConfigurationStatus();
    if (!configStatus.configured) {
      throw new Error(configStatus.message);
    }

    try {
      const systemPrompt = this.buildEnhancedSystemPrompt(request.jurisdiction);
      const userPrompt = this.buildEnhancedAnalysisPrompt(request);
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const response = await aiProviderService.generateResponse(messages, {
        task: 'analysis',
        temperature: 0.1,
        maxTokens: 6000
      });

      let result: DocumentAnalysisResult;
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(response.content);
        result = {
          ...parsed,
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
        result = this.parseEnhancedTextResponse(response.content, request);
      }

      // Save to database
      const savedResult = await this.saveAnalysisResult(result);
      return savedResult;

    } catch (error) {
      console.error('Document analysis error:', error);
      
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
      
      throw new Error(`Failed to analyze document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async batchAnalyzeDocuments(files: File[], jurisdiction: string): Promise<BatchAnalysisResult> {
    const configStatus = await this.getConfigurationStatus();
    if (!configStatus.configured) {
      throw new Error(configStatus.message);
    }

    const batchId = crypto.randomUUID();
    const batchResult: BatchAnalysisResult = {
      id: batchId,
      status: 'pending',
      totalFiles: files.length,
      completedFiles: 0,
      results: [],
      errors: [],
      createdAt: new Date().toISOString()
    };

    // Save initial batch record
    await this.saveBatchResult(batchResult);

    // Process files sequentially
    batchResult.status = 'processing';
    await this.saveBatchResult(batchResult);

    for (const file of files) {
      try {
        const content = await this.extractTextFromFile(file);
        
        // Truncate content if too long
        const truncatedContent = content.length > 12000 ? content.substring(0, 12000) + '...' : content;
        
        const request: DocumentAnalysisRequest = {
          content: truncatedContent,
          jurisdiction,
          analysisType: 'comprehensive',
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        };

        const result = await this.analyzeDocument(request);
        batchResult.results.push(result);
        batchResult.completedFiles++;
        
        // Small delay between requests to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        let errorMessage = `${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        
        // Simplify AI provider errors for batch processing
        if (error instanceof Error && 
            (error.message.includes('All configured AI providers failed') ||
             error.message.includes('Network issue. Try again'))) {
          errorMessage = `${file.name}: Network issue. Try again`;
        }
        
        batchResult.errors.push(errorMessage);
      }

      // Update progress
      await this.saveBatchResult(batchResult);
    }

    batchResult.status = 'completed';
    await this.saveBatchResult(batchResult);

    return batchResult;
  }

  private buildEnhancedSystemPrompt(jurisdiction: string): string {
    return `You are a legal document analysis expert specializing in ${jurisdiction} law with expertise in contract analysis from multiple perspectives.

Your task is to analyze legal documents comprehensively, providing balanced analysis that considers both service provider and client perspectives, with specific performance metrics and detailed formatting.

CRITICAL: You must respond with valid JSON format only. Do not include any text before or after the JSON object.

The JSON structure must be:
{
  "summary": "Brief overview of the document and main purpose",
  "riskAssessment": {
    "level": "LOW or MEDIUM or HIGH or CRITICAL",
    "score": 1-10,
    "factors": ["general risk factors"],
    "serviceProviderRisks": ["risks specific to service provider"],
    "clientRisks": ["risks specific to client"],
    "mutualRisks": ["risks affecting both parties"]
  },
  "keyFindings": [
    {
      "category": "Contract Terms",
      "finding": "specific finding description",
      "severity": "info or warning or critical",
      "affectedParty": "service_provider or client or both",
      "impact": "description of impact on affected party"
    }
  ],
  "recommendations": [
    {
      "category": "Performance Management",
      "recommendation": "specific actionable recommendation",
      "priority": "low or medium or high or critical",
      "targetParty": "service_provider or client or both",
      "implementation": "how to implement this recommendation"
    }
  ],
  "missingClauses": [
    {
      "clause": "missing protective clause",
      "importance": "low or medium or high or critical",
      "beneficiary": "service_provider or client or both",
      "riskMitigation": "how this clause would mitigate risk"
    }
  ],
  "problematicClauses": [
    {
      "clause": "exact problematic text",
      "issue": "what is wrong",
      "suggestion": "how to fix it",
      "affectedParty": "service_provider or client or both",
      "severity": "minor or moderate or major or critical"
    }
  ],
  "performanceMetrics": {
    "slaRequirements": {
      "uptime": "specific uptime requirement (e.g., 99.9% monthly)",
      "responseTime": "specific response time (e.g., <2 seconds for 95% of requests)",
      "availability": "availability windows and maintenance schedules",
      "performanceThresholds": ["specific measurable performance criteria"],
      "monitoringRequirements": ["monitoring and measurement specifications"]
    },
    "penalties": {
      "uptimePenalties": ["specific penalties for uptime failures"],
      "performancePenalties": ["penalties for performance threshold breaches"],
      "escalationProcedures": ["escalation process for repeated failures"]
    },
    "reporting": {
      "frequency": "reporting schedule (e.g., monthly, quarterly)",
      "metrics": ["specific metrics to be reported"],
      "auditRequirements": ["audit and verification requirements"]
    }
  },
  "counterpartyAnalysis": {
    "serviceProviderPerspective": {
      "advantages": ["benefits and protections for service provider"],
      "risks": ["risks and exposures for service provider"],
      "obligations": ["key obligations and responsibilities"],
      "protections": ["liability limitations and protections"]
    },
    "clientPerspective": {
      "advantages": ["benefits and protections for client"],
      "risks": ["risks and exposures for client"],
      "obligations": ["key obligations and responsibilities"],
      "protections": ["service guarantees and protections"]
    },
    "balanceAssessment": {
      "overall": "heavily_favors_provider or favors_provider or balanced or favors_client or heavily_favors_client",
      "reasoning": "explanation of why the contract favors one party",
      "recommendations": ["suggestions to improve balance"]
    }
  },
  "legalCitations": ["relevant law or statute for ${jurisdiction}"],
  "nextSteps": {
    "immediate": ["actions needed before signing"],
    "shortTerm": ["actions needed within 30 days"],
    "longTerm": ["ongoing compliance and management actions"]
  }
}

ENHANCED ANALYSIS REQUIREMENTS:

## Performance Metrics Focus:
- Define specific, measurable SLA requirements (e.g., "99.9% uptime monthly, measured as total available minutes/total minutes in month")
- Specify response time thresholds with percentiles (e.g., "95% of API calls must respond within 2 seconds")
- Detail monitoring requirements including measurement methods and tools
- Define escalation procedures with specific timelines and penalties

## Counterparty Balance Analysis:
- Analyze risks and benefits from BOTH service provider AND client perspectives
- Assess whether contract terms favor one party over another
- Identify asymmetric risk allocations
- Recommend rebalancing measures where appropriate

## Improved Formatting:
- Use clear categorization with specific headings
- Provide bullet points and subheadings for easy scanning
- Structure recommendations by priority and target party
- Include implementation guidance for each recommendation

Focus on:
- Contract enforceability under ${jurisdiction} law
- Balanced risk assessment for both parties
- Specific, measurable performance requirements
- Clear implementation guidance
- Professional formatting with hierarchical structure`;
  }

  private buildEnhancedAnalysisPrompt(request: DocumentAnalysisRequest): string {
    return `Analyze this legal document for ${request.jurisdiction} jurisdiction with enhanced focus on performance metrics, counterparty perspective, and improved formatting:

Document Type: ${request.documentType || 'Legal Document'}
Analysis Type: ${request.analysisType}
File: ${request.fileName}

Document Content:
${request.content}

ENHANCED ANALYSIS REQUIREMENTS:

## 1. Performance Metrics Analysis
- Identify and define specific SLA requirements with measurable thresholds
- Specify uptime requirements (e.g., 99.9% monthly uptime = max 43.2 minutes downtime/month)
- Define response time requirements with percentiles (e.g., 95th percentile <2 seconds)
- Detail monitoring and measurement requirements
- Identify penalty structures for performance failures
- Specify reporting frequencies and audit requirements

## 2. Counterparty Perspective Analysis
- **Service Provider Perspective**: Analyze risks, obligations, and protections
- **Client Perspective**: Analyze benefits, guarantees, and risk exposures
- **Balance Assessment**: Determine if contract favors one party and why
- **Risk Distribution**: Assess how risks are allocated between parties
- **Mutual Benefits**: Identify areas where both parties benefit

## 3. Enhanced Formatting Requirements
- Use clear hierarchical structure with main headings and subheadings
- Provide bullet points for easy scanning and review
- Categorize findings by affected party and severity
- Structure recommendations by priority level and implementation timeline
- Include specific implementation guidance for each recommendation

## 4. Specific Focus Areas
- Performance monitoring and measurement methodologies
- Escalation procedures for service failures
- Liability allocation between parties
- Termination rights and procedures
- Intellectual property protections
- Data security and privacy requirements
- Compliance obligations for both parties

Provide comprehensive analysis with specific, actionable insights based on ${request.jurisdiction} legal framework.

Remember to respond with valid JSON only.`;
  }

  private parseEnhancedTextResponse(text: string, request: DocumentAnalysisRequest): DocumentAnalysisResult {
    // Enhanced fallback parsing for non-JSON responses
    const lines = text.split('\n').filter(line => line.trim());
    
    let summary = 'Enhanced document analysis completed with performance metrics and counterparty perspective analysis.';
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    let riskScore = 5;
    
    // Try to find a summary in the first few lines
    if (lines.length > 0) {
      summary = lines.slice(0, 3).join(' ').substring(0, 400);
    }

    // Look for risk indicators in the text
    const riskKeywords = {
      'CRITICAL': ['critical', 'severe', 'major risk', 'high risk', 'dangerous'],
      'HIGH': ['high', 'significant', 'important', 'concerning'],
      'LOW': ['low', 'minor', 'minimal', 'acceptable']
    };
    
    const lowerText = text.toLowerCase();
    for (const [level, keywords] of Object.entries(riskKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        riskLevel = level as any;
        break;
      }
    }

    return {
      summary,
      riskAssessment: {
        level: riskLevel,
        score: riskScore,
        factors: ['Analysis completed with cloud AI services', 'Manual review recommended for detailed assessment'],
        serviceProviderRisks: ['Service delivery obligations', 'Performance liability exposure'],
        clientRisks: ['Payment obligations', 'Service dependency risks'],
        mutualRisks: ['Contract interpretation disputes', 'Regulatory compliance requirements']
      },
      keyFindings: [
        {
          category: 'AI Analysis',
          finding: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
          severity: 'info',
          affectedParty: 'both',
          impact: 'Requires detailed review for comprehensive understanding'
        }
      ],
      recommendations: [
        {
          category: 'Review Process',
          recommendation: 'Conduct detailed legal review of the full analysis text',
          priority: 'high',
          targetParty: 'both',
          implementation: 'Schedule legal counsel review within 5 business days'
        }
      ],
      missingClauses: [
        {
          clause: 'Performance monitoring requirements',
          importance: 'high',
          beneficiary: 'both',
          riskMitigation: 'Establishes clear performance expectations and measurement criteria'
        }
      ],
      problematicClauses: [],
      performanceMetrics: {
        slaRequirements: {
          uptime: 'Not specified - recommend 99.9% monthly uptime (max 43.2 minutes downtime)',
          responseTime: 'Not specified - recommend 95% of requests <2 seconds',
          availability: 'Business hours availability not defined',
          performanceThresholds: ['Define specific performance criteria', 'Establish measurement methodologies'],
          monitoringRequirements: ['Implement continuous monitoring', 'Define reporting mechanisms']
        },
        penalties: {
          uptimePenalties: ['Define service credits for uptime failures'],
          performancePenalties: ['Establish penalties for performance threshold breaches'],
          escalationProcedures: ['Create escalation matrix for repeated failures']
        },
        reporting: {
          frequency: 'Monthly reporting recommended',
          metrics: ['Uptime percentage', 'Response time percentiles', 'Error rates'],
          auditRequirements: ['Quarterly performance audits', 'Annual compliance reviews']
        }
      },
      counterpartyAnalysis: {
        serviceProviderPerspective: {
          advantages: ['Revenue generation', 'Long-term contract stability'],
          risks: ['Performance liability', 'Service delivery obligations'],
          obligations: ['Meet performance standards', 'Provide ongoing support'],
          protections: ['Limitation of liability clauses', 'Force majeure provisions']
        },
        clientPerspective: {
          advantages: ['Service guarantees', 'Performance standards'],
          risks: ['Service dependency', 'Vendor lock-in potential'],
          obligations: ['Payment obligations', 'Cooperation requirements'],
          protections: ['Service level guarantees', 'Termination rights']
        },
        balanceAssessment: {
          overall: 'balanced',
          reasoning: 'Contract appears to provide reasonable protections for both parties',
          recommendations: ['Review specific performance metrics', 'Clarify termination procedures']
        }
      },
      legalCitations: [`${request.jurisdiction} applicable law`],
      nextSteps: {
        immediate: ['Review full analysis text', 'Identify critical performance requirements'],
        shortTerm: ['Define specific SLA metrics', 'Establish monitoring procedures'],
        longTerm: ['Implement performance management framework', 'Regular contract reviews']
      },
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

  private async saveAnalysisResult(result: DocumentAnalysisResult): Promise<DocumentAnalysisResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No authenticated user, skipping database save');
        return result;
      }

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
        console.error('Failed to save analysis result:', error);
        return result;
      }

      return { ...result, id: data.id };
    } catch (error) {
      console.error('Error saving analysis result:', error);
      return result;
    }
  }

  private async saveBatchResult(batchResult: BatchAnalysisResult): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('batch_analyses')
        .upsert({
          id: batchResult.id,
          user_id: user.id,
          status: batchResult.status,
          total_files: batchResult.totalFiles,
          completed_files: batchResult.completedFiles,
          results: batchResult.results,
          errors: batchResult.errors,
          created_at: batchResult.createdAt,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving batch result:', error);
    }
  }

  async getAnalysisHistory(limit = 10): Promise<DocumentAnalysisResult[]> {
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

      return data.map(item => ({
        ...item.analysis_result,
        id: item.id
      }));
    } catch (error) {
      console.error('Error fetching analysis history:', error);
      return [];
    }
  }

  async getBatchAnalysisHistory(limit = 10): Promise<BatchAnalysisResult[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('batch_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching batch analysis history:', error);
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
      console.error('Error deleting analysis:', error);
      return false;
    }
  }

  // Provider management methods
  getProviderStatus() {
    return aiProviderService.getProviderStatus();
  }

  getRecommendedProviders() {
    return aiProviderService.getRecommendedProviders();
  }
}

export const documentAnalysisService = new DocumentAnalysisService();