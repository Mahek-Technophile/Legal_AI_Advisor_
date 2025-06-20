/**
 * Ollama Service for Local AI Model Integration
 * Provides interface to local Ollama models for document analysis
 */

export interface OllamaModel {
  name: string;
  size: string;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  modified_at: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaStreamResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

class OllamaService {
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434';
    this.defaultModel = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.1:8b';
  }

  /**
   * Check if Ollama is running and accessible
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Ollama availability check failed:', error);
      return false;
    }
  }

  /**
   * Get list of available models
   */
  async getModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      throw new Error('Failed to fetch available models from Ollama');
    }
  }

  /**
   * Check if a specific model is available
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    try {
      const models = await this.getModels();
      return models.some(model => model.name === modelName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Pull/download a model
   */
  async pullModel(modelName: string, onProgress?: (progress: string) => void): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.status && onProgress) {
              onProgress(data.status);
            }
          } catch (e) {
            // Ignore JSON parse errors for incomplete chunks
          }
        }
      }
    } catch (error) {
      console.error('Error pulling model:', error);
      throw new Error(`Failed to pull model ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate completion using Ollama
   */
  async generate(
    prompt: string,
    options: {
      model?: string;
      system?: string;
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<OllamaResponse> {
    const model = options.model || this.defaultModel;
    
    try {
      const requestBody = {
        model,
        prompt,
        system: options.system,
        options: {
          temperature: options.temperature || 0.1,
          num_predict: options.max_tokens || 4000,
        },
        stream: false
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating completion:', error);
      throw new Error(`Failed to generate completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate streaming completion
   */
  async generateStream(
    prompt: string,
    onChunk: (chunk: OllamaStreamResponse) => void,
    options: {
      model?: string;
      system?: string;
      temperature?: number;
      max_tokens?: number;
    } = {}
  ): Promise<void> {
    const model = options.model || this.defaultModel;
    
    try {
      const requestBody = {
        model,
        prompt,
        system: options.system,
        options: {
          temperature: options.temperature || 0.1,
          num_predict: options.max_tokens || 4000,
        },
        stream: true
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            onChunk(data);
            if (data.done) return;
          } catch (e) {
            // Ignore JSON parse errors for incomplete chunks
          }
        }
      }
    } catch (error) {
      console.error('Error generating streaming completion:', error);
      throw new Error(`Failed to generate streaming completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Chat completion (for conversation-style interactions)
   */
  async chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    } = {}
  ): Promise<OllamaResponse> {
    const model = options.model || this.defaultModel;
    
    try {
      const requestBody = {
        model,
        messages,
        options: {
          temperature: options.temperature || 0.1,
          num_predict: options.max_tokens || 4000,
        },
        stream: false
      };

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error in chat completion:', error);
      throw new Error(`Failed to complete chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get configuration status
   */
  getConfigurationStatus(): { configured: boolean; message: string; baseUrl: string; model: string } {
    return {
      configured: true, // Ollama doesn't require API keys
      message: 'Ollama is configured for local AI processing',
      baseUrl: this.baseUrl,
      model: this.defaultModel
    };
  }

  /**
   * Get recommended models for legal document analysis
   */
  getRecommendedModels(): Array<{ name: string; description: string; size: string }> {
    return [
      {
        name: 'llama3.1:8b',
        description: 'Meta Llama 3.1 8B - Good balance of performance and speed',
        size: '4.7GB'
      },
      {
        name: 'llama3.1:70b',
        description: 'Meta Llama 3.1 70B - Highest quality, requires more resources',
        size: '40GB'
      },
      {
        name: 'mistral:7b',
        description: 'Mistral 7B - Fast and efficient for document analysis',
        size: '4.1GB'
      },
      {
        name: 'codellama:13b',
        description: 'Code Llama 13B - Good for structured document analysis',
        size: '7.3GB'
      },
      {
        name: 'phi3:14b',
        description: 'Microsoft Phi-3 14B - Optimized for reasoning tasks',
        size: '7.9GB'
      }
    ];
  }
}

export const ollamaService = new OllamaService();