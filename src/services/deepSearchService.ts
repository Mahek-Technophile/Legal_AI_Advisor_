import axios from 'axios';
import { aiProviderService } from './aiProviders';

export interface DeepSearchResult {
  id: string;
  type: 'case_law' | 'statute' | 'article' | 'news';
  title: string;
  summary: string;
  source: string;
  url?: string;
  date?: string;
  jurisdiction: string;
  relevanceScore: number;
  tags: string[];
  content?: string;
}

export interface DeepSearchRequest {
  documentContent: string;
  jurisdiction: string;
  legalClauses: string[];
  searchTerms: string[];
}

export interface DeepSearchResponse {
  results: DeepSearchResult[];
  searchMetadata: {
    totalResults: number;
    searchTime: number;
    jurisdiction: string;
    searchTerms: string[];
  };
}

class DeepSearchService {
  private readonly SERPER_API_KEY = import.meta.env.VITE_SERPER_API_KEY || '';
  private readonly BRAVE_SEARCH_API_KEY = import.meta.env.VITE_BRAVE_SEARCH_API_KEY || '';
  private readonly BING_SEARCH_API_KEY = import.meta.env.VITE_BING_SEARCH_API_KEY || '';
  
  constructor() {
    console.log('DeepSearch Service initialized');
  }

  /**
   * Check if search APIs are configured
   */
  isConfigured(): boolean {
    return !!(this.SERPER_API_KEY || this.BRAVE_SEARCH_API_KEY || this.BING_SEARCH_API_KEY);
  }

  /**
   * Get configuration status
   */
  getConfigurationStatus(): { 
    configured: boolean; 
    message: string;
    availableApis: string[];
  } {
    const availableApis = [];
    
    if (this.SERPER_API_KEY) availableApis.push('Serper');
    if (this.BRAVE_SEARCH_API_KEY) availableApis.push('Brave Search');
    if (this.BING_SEARCH_API_KEY) availableApis.push('Bing Search');
    
    if (availableApis.length === 0) {
      return {
        configured: false,
        message: 'No search APIs configured. Please add API keys to your environment variables.',
        availableApis: []
      };
    }
    
    return {
      configured: true,
      message: `DeepSearch configured with ${availableApis.join(', ')}`,
      availableApis
    };
  }

  /**
   * Extract key legal clauses and terms from document content
   */
  async extractLegalTerms(documentContent: string, jurisdiction: string): Promise<string[]> {
    try {
      const systemPrompt = `You are a legal expert specializing in ${jurisdiction} law. Extract the most important legal terms, clauses, and concepts from the provided document. Focus on:
      
      1. Key legal terminology
      2. Names of specific laws, acts, or statutes mentioned
      3. Legal principles or doctrines referenced
      4. Types of legal agreements or contracts
      5. Legal rights or obligations discussed
      
      Return ONLY a JSON array of strings with the extracted terms. Do not include any explanations or other text.`;
      
      const userPrompt = `Extract the key legal terms and concepts from this document for ${jurisdiction} jurisdiction:
      
      ${documentContent.substring(0, 5000)}`;
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
      
      const response = await aiProviderService.generateResponse(messages, {
        task: 'analysis',
        temperature: 0.1,
        maxTokens: 1000
      });
      
      try {
        // Try to parse as JSON array
        const terms = JSON.parse(response.content);
        if (Array.isArray(terms)) {
          return terms.slice(0, 10); // Limit to top 10 terms
        }
        throw new Error('Response is not an array');
      } catch (parseError) {
        // Fallback to text parsing if JSON parsing fails
        const lines = response.content.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.startsWith('[') && !line.startsWith(']'));
          
        return lines.slice(0, 10); // Limit to top 10 terms
      }
    } catch (error) {
      console.error('Error extracting legal terms:', error);
      // Fallback to basic extraction
      const commonLegalTerms = [
        'contract', 'agreement', 'liability', 'damages', 'breach',
        'jurisdiction', 'arbitration', 'indemnification', 'termination',
        'confidentiality', 'intellectual property', 'warranty'
      ];
      
      // Find which terms appear in the document
      return commonLegalTerms.filter(term => 
        documentContent.toLowerCase().includes(term.toLowerCase())
      ).slice(0, 5);
    }
  }

  /**
   * Perform deep search using available search APIs
   */
  async performDeepSearch(request: DeepSearchRequest): Promise<DeepSearchResponse> {
    const startTime = Date.now();
    
    if (!this.isConfigured()) {
      throw new Error('DeepSearch is not configured. Please add search API keys to your environment variables.');
    }
    
    try {
      // Combine legal clauses and search terms
      const searchTerms = [...request.legalClauses, ...request.searchTerms];
      
      // Create search queries
      const queries = this.generateSearchQueries(searchTerms, request.jurisdiction);
      
      // Perform searches in parallel
      const searchPromises = queries.map(query => this.searchWeb(query, request.jurisdiction));
      const searchResults = await Promise.all(searchPromises);
      
      // Flatten and deduplicate results
      const flatResults = searchResults.flat();
      const uniqueResults = this.deduplicateResults(flatResults);
      
      // Analyze and enhance results with AI
      const enhancedResults = await this.enhanceSearchResults(
        uniqueResults, 
        request.documentContent,
        request.jurisdiction
      );
      
      // Sort by relevance
      const sortedResults = enhancedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      return {
        results: sortedResults,
        searchMetadata: {
          totalResults: sortedResults.length,
          searchTime: Date.now() - startTime,
          jurisdiction: request.jurisdiction,
          searchTerms: searchTerms
        }
      };
    } catch (error) {
      console.error('DeepSearch error:', error);
      throw new Error(`Failed to perform deep search: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate search queries from legal terms
   */
  private generateSearchQueries(terms: string[], jurisdiction: string): string[] {
    const queries: string[] = [];
    
    // Add jurisdiction to each term
    terms.forEach(term => {
      queries.push(`${term} ${jurisdiction} law`);
      queries.push(`${term} legal interpretation ${jurisdiction}`);
    });
    
    // Add some specialized queries
    queries.push(`${jurisdiction} case law ${terms.slice(0, 3).join(' ')}`);
    queries.push(`${jurisdiction} legal statutes ${terms.slice(0, 3).join(' ')}`);
    queries.push(`recent legal developments ${jurisdiction} ${terms[0] || ''}`);
    
    return queries.slice(0, 5); // Limit to 5 queries to avoid rate limits
  }

  /**
   * Search the web using available search APIs
   */
  private async searchWeb(query: string, jurisdiction: string): Promise<DeepSearchResult[]> {
    try {
      // Try Serper API first if available
      if (this.SERPER_API_KEY) {
        return await this.searchWithSerper(query, jurisdiction);
      }
      
      // Try Brave Search API if available
      if (this.BRAVE_SEARCH_API_KEY) {
        return await this.searchWithBraveSearch(query, jurisdiction);
      }
      
      // Try Bing Search API if available
      if (this.BING_SEARCH_API_KEY) {
        return await this.searchWithBingSearch(query, jurisdiction);
      }
      
      // If no APIs are available, return empty results
      return [];
    } catch (error) {
      console.error('Web search error:', error);
      return [];
    }
  }

  /**
   * Search using Serper API
   */
  private async searchWithSerper(query: string, jurisdiction: string): Promise<DeepSearchResult[]> {
    try {
      const response = await axios.post('https://google.serper.dev/search', {
        q: query,
        gl: this.getCountryCode(jurisdiction),
        num: 5
      }, {
        headers: {
          'X-API-KEY': this.SERPER_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      const results: DeepSearchResult[] = [];
      
      // Process organic results
      if (response.data.organic) {
        response.data.organic.forEach((item: any, index: number) => {
          results.push({
            id: `serper-${Date.now()}-${index}`,
            type: this.determineResultType(item.title, item.snippet),
            title: item.title,
            summary: item.snippet,
            source: item.source || new URL(item.link).hostname,
            url: item.link,
            date: item.date,
            jurisdiction: jurisdiction,
            relevanceScore: 0.5, // Initial score, will be updated later
            tags: this.extractTags(item.title, item.snippet, jurisdiction)
          });
        });
      }
      
      return results;
    } catch (error) {
      console.error('Serper API error:', error);
      return [];
    }
  }

  /**
   * Search using Brave Search API
   */
  private async searchWithBraveSearch(query: string, jurisdiction: string): Promise<DeepSearchResult[]> {
    try {
      const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        params: {
          q: query,
          country: this.getCountryCode(jurisdiction),
          count: 5
        },
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.BRAVE_SEARCH_API_KEY
        }
      });
      
      const results: DeepSearchResult[] = [];
      
      if (response.data.web && response.data.web.results) {
        response.data.web.results.forEach((item: any, index: number) => {
          results.push({
            id: `brave-${Date.now()}-${index}`,
            type: this.determineResultType(item.title, item.description),
            title: item.title,
            summary: item.description,
            source: item.profile?.name || new URL(item.url).hostname,
            url: item.url,
            date: item.age,
            jurisdiction: jurisdiction,
            relevanceScore: 0.5, // Initial score, will be updated later
            tags: this.extractTags(item.title, item.description, jurisdiction)
          });
        });
      }
      
      return results;
    } catch (error) {
      console.error('Brave Search API error:', error);
      return [];
    }
  }

  /**
   * Search using Bing Search API
   */
  private async searchWithBingSearch(query: string, jurisdiction: string): Promise<DeepSearchResult[]> {
    try {
      const response = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
        params: {
          q: query,
          mkt: this.getBingMarket(jurisdiction),
          count: 5
        },
        headers: {
          'Ocp-Apim-Subscription-Key': this.BING_SEARCH_API_KEY
        }
      });
      
      const results: DeepSearchResult[] = [];
      
      if (response.data.webPages && response.data.webPages.value) {
        response.data.webPages.value.forEach((item: any, index: number) => {
          results.push({
            id: `bing-${Date.now()}-${index}`,
            type: this.determineResultType(item.name, item.snippet),
            title: item.name,
            summary: item.snippet,
            source: new URL(item.url).hostname,
            url: item.url,
            date: undefined,
            jurisdiction: jurisdiction,
            relevanceScore: 0.5, // Initial score, will be updated later
            tags: this.extractTags(item.name, item.snippet, jurisdiction)
          });
        });
      }
      
      return results;
    } catch (error) {
      console.error('Bing Search API error:', error);
      return [];
    }
  }

  /**
   * Determine the type of search result
   */
  private determineResultType(title: string, description: string): DeepSearchResult['type'] {
    const combinedText = `${title} ${description}`.toLowerCase();
    
    if (
      combinedText.includes('case law') || 
      combinedText.includes('v.') || 
      combinedText.includes('vs.') ||
      combinedText.includes('court') ||
      combinedText.includes('ruling') ||
      combinedText.includes('decision')
    ) {
      return 'case_law';
    }
    
    if (
      combinedText.includes('act') || 
      combinedText.includes('statute') || 
      combinedText.includes('regulation') ||
      combinedText.includes('code') ||
      combinedText.includes('law')
    ) {
      return 'statute';
    }
    
    if (
      combinedText.includes('news') || 
      combinedText.includes('today') || 
      combinedText.includes('latest') ||
      combinedText.includes('update')
    ) {
      return 'news';
    }
    
    return 'article';
  }

  /**
   * Extract tags from search result
   */
  private extractTags(title: string, description: string, jurisdiction: string): string[] {
    const tags: string[] = [jurisdiction];
    const combinedText = `${title} ${description}`.toLowerCase();
    
    // Common legal areas
    const legalAreas = [
      'contract', 'tort', 'property', 'criminal', 'constitutional', 
      'administrative', 'family', 'employment', 'intellectual property',
      'corporate', 'tax', 'immigration', 'environmental', 'bankruptcy'
    ];
    
    legalAreas.forEach(area => {
      if (combinedText.includes(area)) {
        tags.push(area);
      }
    });
    
    return [...new Set(tags)].slice(0, 5); // Deduplicate and limit to 5 tags
  }

  /**
   * Deduplicate search results
   */
  private deduplicateResults(results: DeepSearchResult[]): DeepSearchResult[] {
    const uniqueUrls = new Set<string>();
    const uniqueResults: DeepSearchResult[] = [];
    
    results.forEach(result => {
      if (result.url && !uniqueUrls.has(result.url)) {
        uniqueUrls.add(result.url);
        uniqueResults.push(result);
      } else if (!result.url) {
        // If no URL (rare), keep it anyway
        uniqueResults.push(result);
      }
    });
    
    return uniqueResults;
  }

  /**
   * Enhance search results with AI analysis
   */
  private async enhanceSearchResults(
    results: DeepSearchResult[], 
    documentContent: string,
    jurisdiction: string
  ): Promise<DeepSearchResult[]> {
    if (results.length === 0) return [];
    
    try {
      // Prepare document context (truncated)
      const documentContext = documentContent.substring(0, 2000);
      
      // Prepare search results context
      const resultsContext = results.map(r => 
        `Title: ${r.title}\nSummary: ${r.summary}\nSource: ${r.source}\nType: ${r.type}`
      ).join('\n\n');
      
      const systemPrompt = `You are a legal research expert specializing in ${jurisdiction} law. Analyze these search results in relation to the provided document excerpt. For each result:

1. Determine its relevance to the document (score 0.0-1.0)
2. Enhance the summary to highlight legal significance
3. Identify key legal concepts and principles
4. Classify the result type accurately (case_law, statute, article, news)

Return a JSON array with the enhanced results. Each result should include:
- id (preserve original)
- type (case_law, statute, article, news)
- title (preserve original)
- summary (enhanced)
- source (preserve original)
- url (preserve original)
- jurisdiction (preserve original)
- relevanceScore (0.0-1.0)
- tags (array of relevant legal concepts)`;
      
      const userPrompt = `Document excerpt:
${documentContext}

Search results to analyze:
${resultsContext}

Enhance these results with relevance scores, improved summaries, and accurate tags for ${jurisdiction} jurisdiction.`;
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
      
      const response = await aiProviderService.generateResponse(messages, {
        task: 'analysis',
        temperature: 0.1,
        maxTokens: 2000
      });
      
      try {
        // Try to parse as JSON array
        const enhancedResults = JSON.parse(response.content);
        if (Array.isArray(enhancedResults)) {
          return enhancedResults.map(result => ({
            ...result,
            // Ensure we have all required fields
            id: result.id || `enhanced-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type: result.type || 'article',
            relevanceScore: typeof result.relevanceScore === 'number' ? result.relevanceScore : 0.5,
            tags: Array.isArray(result.tags) ? result.tags : [jurisdiction]
          }));
        }
      } catch (parseError) {
        console.error('Error parsing enhanced results:', parseError);
      }
      
      // If parsing fails, return original results with default relevance scores
      return results;
    } catch (error) {
      console.error('Error enhancing search results:', error);
      return results;
    }
  }

  /**
   * Get country code for search API
   */
  private getCountryCode(jurisdiction: string): string {
    const countryMap: Record<string, string> = {
      'United States': 'us',
      'US': 'us',
      'United Kingdom': 'gb',
      'UK': 'gb',
      'Canada': 'ca',
      'CA': 'ca',
      'Australia': 'au',
      'AU': 'au',
      'Germany': 'de',
      'DE': 'de',
      'France': 'fr',
      'FR': 'fr'
    };
    
    return countryMap[jurisdiction] || 'us';
  }

  /**
   * Get Bing market code
   */
  private getBingMarket(jurisdiction: string): string {
    const marketMap: Record<string, string> = {
      'United States': 'en-US',
      'US': 'en-US',
      'United Kingdom': 'en-GB',
      'UK': 'en-GB',
      'Canada': 'en-CA',
      'CA': 'en-CA',
      'Australia': 'en-AU',
      'AU': 'en-AU',
      'Germany': 'de-DE',
      'DE': 'de-DE',
      'France': 'fr-FR',
      'FR': 'fr-FR'
    };
    
    return marketMap[jurisdiction] || 'en-US';
  }

  /**
   * Get clarification for a specific search result
   */
  async getClarification(result: DeepSearchResult, question: string): Promise<string> {
    try {
      const systemPrompt = `You are a legal research expert specializing in ${result.jurisdiction} law. Provide a clear, concise explanation about the search result in response to the user's question. Focus on legal accuracy and practical implications.`;
      
      const userPrompt = `Search Result:
Title: ${result.title}
Summary: ${result.summary}
Type: ${result.type}
Source: ${result.source}
Jurisdiction: ${result.jurisdiction}

User Question: ${question}

Provide a helpful explanation that addresses the question specifically in relation to this search result.`;
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
      
      const response = await aiProviderService.generateResponse(messages, {
        task: 'chat',
        temperature: 0.3,
        maxTokens: 1000
      });
      
      return response.content;
    } catch (error) {
      console.error('Error getting clarification:', error);
      return 'Unable to provide clarification at this time. Please try again later.';
    }
  }
}

export const deepSearchService = new DeepSearchService();