interface DocumentAnalysisResult {
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
}

interface DocumentAnalysisRequest {
  content: string;
  documentType?: string;
  jurisdiction: string;
  analysisType: 'comprehensive' | 'risk-only' | 'compliance';
}

class DocumentAnalysisService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your environment variables.');
    }
  }

  async analyzeDocument(request: DocumentAnalysisRequest): Promise<DocumentAnalysisResult> {
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
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const analysisText = data.choices[0].message.content;
      
      try {
        return JSON.parse(analysisText);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return this.parseTextResponse(analysisText, request.jurisdiction);
      }
    } catch (error) {
      console.error('Document analysis error:', error);
      throw new Error(`Failed to analyze document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
  "legalCitations": ["relevant statutes and case law"],
  "nextSteps": ["actionable next steps"]
}

Focus on:
- Contract terms and enforceability
- Liability and risk exposure
- Compliance with ${request.jurisdiction} law
- Missing protective clauses
- Ambiguous language
- Regulatory requirements

Document content:
${request.content}
`;
  }

  private parseTextResponse(text: string, jurisdiction: string): DocumentAnalysisResult {
    // Fallback parser for non-JSON responses
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
      legalCitations: [`${jurisdiction} applicable law`],
      nextSteps: ['Review full analysis text', 'Consult legal professional']
    };
  }

  async extractTextFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const content = event.target?.result as string;
        
        if (file.type === 'text/plain') {
          resolve(content);
        } else if (file.type === 'application/pdf') {
          // For PDF files, we'd need a PDF parser
          // For now, return instruction to user
          reject(new Error('PDF parsing requires additional setup. Please convert to text format or implement PDF.js integration.'));
        } else {
          // For DOC/DOCX, we'd need additional parsing
          reject(new Error('DOC/DOCX parsing requires additional setup. Please convert to text format.'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.type === 'text/plain') {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'your-openai-api-key';
  }
}

export const documentAnalysisService = new DocumentAnalysisService();
export type { DocumentAnalysisResult, DocumentAnalysisRequest };