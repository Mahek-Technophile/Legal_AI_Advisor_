import { supabase } from '../lib/supabase';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Set up PDF.js worker using local import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface DocumentAnalysisResult {
  id?: string;
  summary: string;
  riskAssessment: {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    score: number;
    factors: string[];
  };
  keyFindings: {
    category: string;
    finding: string;
    severity: 'info' | 'warning' | 'critical';
  }[];
  recommendations: string[];
  missingClauses: string[];
  problematicClauses: {
    clause: string;
    issue: string;
    suggestion: string;
  }[];
  legalCitations: string[];
  nextSteps: string[];
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
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    console.log('OpenAI API Key configured:', this.isConfigured() ? 'Yes' : 'No');
    if (!this.isConfigured()) {
      console.warn('OpenAI API key not found. Please add VITE_OPENAI_API_KEY to your .env file');
    }
  }

  isConfigured(): boolean {
    return !!(
      this.apiKey && 
      this.apiKey.trim() !== '' &&
      this.apiKey !== 'your_openai_api_key_here' &&
      this.apiKey !== 'your-openai-api-key' &&
      !this.apiKey.includes('placeholder') &&
      this.apiKey.startsWith('sk-')
    );
  }

  getConfigurationStatus(): { configured: boolean; message: string } {
    if (!this.apiKey) {
      return {
        configured: false,
        message: 'OpenAI API key not found. Please add VITE_OPENAI_API_KEY to your .env file and restart the development server.'
      };
    }

    if (!this.apiKey.startsWith('sk-')) {
      return {
        configured: false,
        message: 'Invalid OpenAI API key format. API keys should start with "sk-".'
      };
    }

    if (this.apiKey === 'your_openai_api_key_here' || this.apiKey === 'your-openai-api-key') {
      return {
        configured: false,
        message: 'Please replace the placeholder with your actual OpenAI API key in the .env file.'
      };
    }

    return {
      configured: true,
      message: 'OpenAI API key is properly configured.'
    };
  }

  async analyzeDocument(request: DocumentAnalysisRequest): Promise<DocumentAnalysisResult> {
    const configStatus = this.getConfigurationStatus();
    if (!configStatus.configured) {
      throw new Error(configStatus.message);
    }

    try {
      const prompt = this.buildAnalysisPrompt(request);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: `You are a legal document analysis expert specializing in ${request.jurisdiction} law. Provide comprehensive, structured analysis with specific legal citations and practical recommendations.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 4000,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key. Please check your API key and try again.');
        }
        if (response.status === 429) {
          throw new Error('OpenAI API rate limit exceeded. Please try again in a few minutes.');
        }
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const analysisText = data.choices[0].message.content;
      
      let result: DocumentAnalysisResult;
      try {
        const parsed = JSON.parse(analysisText);
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
        result = this.parseTextResponse(analysisText, request);
      }

      // Save to database
      const savedResult = await this.saveAnalysisResult(result);
      return savedResult;

    } catch (error) {
      console.error('Document analysis error:', error);
      throw new Error(`Failed to analyze document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async batchAnalyzeDocuments(files: File[], jurisdiction: string): Promise<BatchAnalysisResult> {
    const configStatus = this.getConfigurationStatus();
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

    // Process files sequentially to avoid rate limits
    batchResult.status = 'processing';
    await this.saveBatchResult(batchResult);

    for (const file of files) {
      try {
        const content = await this.extractTextFromFile(file);
        const request: DocumentAnalysisRequest = {
          content,
          jurisdiction,
          analysisType: 'comprehensive',
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        };

        const result = await this.analyzeDocument(request);
        batchResult.results.push(result);
        batchResult.completedFiles++;
      } catch (error) {
        batchResult.errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Update progress
      await this.saveBatchResult(batchResult);
    }

    batchResult.status = 'completed';
    await this.saveBatchResult(batchResult);

    return batchResult;
  }

  private buildAnalysisPrompt(request: DocumentAnalysisRequest): string {
    return `
Analyze this legal document for ${request.jurisdiction} jurisdiction. Provide a comprehensive analysis in JSON format with the following structure:

{
  "summary": "Brief overview of the document",
  "riskAssessment": {
    "level": "LOW|MEDIUM|HIGH|CRITICAL",
    "score": 1-10,
    "factors": ["list of risk factors"]
  },
  "keyFindings": [
    {
      "category": "category name",
      "finding": "specific finding",
      "severity": "info|warning|critical"
    }
  ],
  "recommendations": ["list of recommendations"],
  "missingClauses": ["list of missing protective clauses"],
  "problematicClauses": [
    {
      "clause": "problematic clause text",
      "issue": "what's wrong with it",
      "suggestion": "how to improve it"
    }
  ],
  "legalCitations": ["relevant statutes and case law for ${request.jurisdiction}"],
  "nextSteps": ["actionable next steps"]
}

Focus on:
- Contract terms and enforceability under ${request.jurisdiction} law
- Liability and risk exposure
- Compliance with ${request.jurisdiction} regulations
- Missing protective clauses
- Ambiguous language that could cause disputes
- Regulatory requirements specific to ${request.jurisdiction}

Document content:
${request.content}
`;
  }

  private parseTextResponse(text: string, request: DocumentAnalysisRequest): DocumentAnalysisResult {
    return {
      summary: "Document analysis completed. Please review the detailed findings below.",
      riskAssessment: {
        level: 'MEDIUM',
        score: 5,
        factors: ['Manual review recommended due to parsing limitations']
      },
      keyFindings: [
        {
          category: 'Analysis',
          finding: text.substring(0, 500) + '...',
          severity: 'info'
        }
      ],
      recommendations: ['Consult with legal counsel for detailed review'],
      missingClauses: [],
      problematicClauses: [],
      legalCitations: [`${request.jurisdiction} applicable law`],
      nextSteps: ['Review full analysis text', 'Consult legal professional'],
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
      return this.extractTextFromPdf(file);
    } else if (fileType === 'application/msword' || 
               fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return this.extractTextFromDoc(file);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
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

  private async extractTextFromPdf(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            fullText += pageText + '\n';
          }
          
          if (!fullText.trim()) {
            throw new Error('No text content found in PDF. The PDF might be image-based or corrupted.');
          }
          
          resolve(fullText);
        } catch (error) {
          reject(new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read PDF file'));
      reader.readAsArrayBuffer(file);
    });
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
}

export const documentAnalysisService = new DocumentAnalysisService();