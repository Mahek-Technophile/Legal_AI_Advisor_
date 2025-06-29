/**
 * Multi-Provider AI Service
 * Integrates multiple cloud AI providers for optimal performance
 */

export interface AIProvider {
  name: string;
  baseUrl: string;
  models: {
    chat: string;
    analysis: string;
    reasoning: string;
  };
  maxTokens: number;
  supportsStreaming: boolean;
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
}

export interface AIStreamResponse {
  content: string;
  done: boolean;
  model: string;
  provider: string;
}

// Provider configurations
const PROVIDERS: Record<string, AIProvider> = {
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: {
      chat: 'llama-3.1-70b-versatile',
      analysis: 'llama-3.1-70b-versatile',
      reasoning: 'llama-3.1-8b-instant'
    },
    maxTokens: 8192,
    supportsStreaming: true,
    rateLimit: {
      requestsPerMinute: 30,
      tokensPerMinute: 6000
    }
  },
  together: {
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    models: {
      chat: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      analysis: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      reasoning: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'
    },
    maxTokens: 8192,
    supportsStreaming: true,
    rateLimit: {
      requestsPerMinute: 60,
      tokensPerMinute: 10000
    }
  },
  huggingface: {
    name: 'Hugging Face',
    baseUrl: 'https://api-inference.huggingface.co/models',
    models: {
      chat: 'microsoft/DialoGPT-large',
      analysis: 'microsoft/DialoGPT-large',
      reasoning: 'microsoft/DialoGPT-medium'
    },
    maxTokens: 4096,
    supportsStreaming: false,
    rateLimit: {
      requestsPerMinute: 100,
      tokensPerMinute: 15000
    }
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: {
      chat: 'deepseek-chat',
      analysis: 'deepseek-coder',
      reasoning: 'deepseek-chat'
    },
    maxTokens: 8192,
    supportsStreaming: true,
    rateLimit: {
      requestsPerMinute: 60,
      tokensPerMinute: 10000
    }
  },
  cerebras: {
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    models: {
      chat: 'llama3.1-70b',
      analysis: 'llama3.1-70b',
      reasoning: 'llama3.1-8b'
    },
    maxTokens: 8192,
    supportsStreaming: true,
    rateLimit: {
      requestsPerMinute: 30,
      tokensPerMinute: 6000
    }
  },
  fireworks: {
    name: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    models: {
      chat: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
      analysis: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
      reasoning: 'accounts/fireworks/models/llama-v3p1-8b-instruct'
    },
    maxTokens: 8192,
    supportsStreaming: true,
    rateLimit: {
      requestsPerMinute: 60,
      tokensPerMinute: 10000
    }
  }
};

class AIProviderService {
  private apiKeys: Record<string, string> = {};
  private rateLimiters: Map<string, { requests: number[]; tokens: number; lastReset: number }> = new Map();

  constructor() {
    this.initializeApiKeys();
  }

  private initializeApiKeys() {
    this.apiKeys = {
      groq: import.meta.env.VITE_GROQ_API_KEY || '',
      together: import.meta.env.VITE_TOGETHER_AI_API_KEY || '',
      huggingface: import.meta.env.VITE_HUGGINGFACE_API_KEY || '',
      deepseek: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
      cerebras: import.meta.env.VITE_CEREBRAS_API_KEY || '',
      fireworks: import.meta.env.VITE_FIREWORKS_API_KEY || ''
    };
  }

  private isProviderConfigured(provider: string): boolean {
    const apiKey = this.apiKeys[provider];
    return !!(apiKey && apiKey.trim() && !apiKey.startsWith('your_') && apiKey !== 'your_groq_api_key' && apiKey !== 'your_together_ai_api_key' && apiKey !== 'your_huggingface_api_key' && apiKey !== 'your_deepseek_api_key' && apiKey !== 'your_cerebras_api_key' && apiKey !== 'your_fireworks_api_key');
  }

  private getAvailableProviders(): string[] {
    return Object.keys(PROVIDERS).filter(provider => this.isProviderConfigured(provider));
  }

  private checkRateLimit(provider: string): boolean {
    const config = PROVIDERS[provider];
    if (!config) return false;

    const now = Date.now();
    const limiter = this.rateLimiters.get(provider) || {
      requests: [],
      tokens: 0,
      lastReset: now
    };

    // Reset counters every minute
    if (now - limiter.lastReset > 60000) {
      limiter.requests = [];
      limiter.tokens = 0;
      limiter.lastReset = now;
    }

    // Check request rate limit
    limiter.requests = limiter.requests.filter(time => now - time < 60000);
    if (limiter.requests.length >= config.rateLimit.requestsPerMinute) {
      return false;
    }

    this.rateLimiters.set(provider, limiter);
    return true;
  }

  private updateRateLimit(provider: string, tokens: number) {
    const limiter = this.rateLimiters.get(provider);
    if (limiter) {
      limiter.requests.push(Date.now());
      limiter.tokens += tokens;
    }
  }

  private async makeRequest(
    provider: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<AIResponse> {
    const config = PROVIDERS[provider];
    const apiKey = this.apiKeys[provider];

    if (!config || !apiKey) {
      throw new Error(`Provider ${provider} not configured`);
    }

    if (!this.checkRateLimit(provider)) {
      throw new Error(`Rate limit exceeded for ${provider}`);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Set authorization header based on provider
    if (provider === 'huggingface') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const requestBody = {
      model,
      messages,
      temperature: options.temperature || 0.1,
      max_tokens: options.maxTokens || config.maxTokens,
      stream: options.stream || false
    };

    // Handle Hugging Face specific format
    if (provider === 'huggingface') {
      const response = await fetch(`${config.baseUrl}/${model}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          inputs: messages[messages.length - 1].content,
          parameters: {
            temperature: options.temperature || 0.1,
            max_new_tokens: options.maxTokens || 512
          }
        })
      });

      if (!response.ok) {
        throw new Error(`${provider} API error: ${response.status}`);
      }

      const data = await response.json();
      const content = Array.isArray(data) ? data[0]?.generated_text || '' : data.generated_text || '';

      return {
        content,
        model,
        provider,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        }
      };
    }

    // Standard OpenAI-compatible format for other providers
    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`${provider} API error: ${response.status} - ${errorText}`);
        throw new Error(`${provider} API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      this.updateRateLimit(provider, usage.total_tokens);

      return {
        content,
        model,
        provider,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        }
      };
    } catch (error) {
      console.warn(`Request failed for ${provider}:`, error);
      throw error;
    }
  }

  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    options: {
      provider?: string;
      task?: 'chat' | 'analysis' | 'reasoning';
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<AIResponse> {
    const availableProviders = this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      throw new Error('No AI providers configured. Please add valid API keys to your environment variables. You can get free API keys from:\n\n• Groq: https://console.groq.com/keys\n• Together AI: https://api.together.xyz/settings/api-keys\n• Hugging Face: https://huggingface.co/settings/tokens\n\nAdd them to your .env file and restart the development server.');
    }

    const task = options.task || 'chat';
    let preferredProvider = options.provider;

    // Auto-select best provider for task if not specified
    if (!preferredProvider) {
      if (task === 'analysis') {
        // Try groq first for analysis instead of deepseek to avoid auth issues
        preferredProvider = availableProviders.includes('groq') ? 'groq' : 
                           availableProviders.includes('together') ? 'together' :
                           import.meta.env.VITE_DOCUMENT_ANALYSIS_PROVIDER || 'deepseek';
      } else if (task === 'chat') {
        preferredProvider = import.meta.env.VITE_CHAT_PROVIDER || 'groq';
      } else {
        preferredProvider = import.meta.env.VITE_PRIMARY_AI_PROVIDER || 'groq';
      }
    }

    // Fallback to any available provider if preferred is not available
    if (!availableProviders.includes(preferredProvider)) {
      preferredProvider = availableProviders[0];
    }

    const config = PROVIDERS[preferredProvider];
    const model = config.models[task];

    try {
      return await this.makeRequest(preferredProvider, model, messages, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      });
    } catch (error) {
      console.warn(`Error with ${preferredProvider}:`, error);
      
      // Try fallback provider
      const fallbackProvider = import.meta.env.VITE_FALLBACK_AI_PROVIDER || 'together';
      if (fallbackProvider !== preferredProvider && availableProviders.includes(fallbackProvider)) {
        try {
          const fallbackConfig = PROVIDERS[fallbackProvider];
          const fallbackModel = fallbackConfig.models[task];
          console.log(`Trying fallback provider: ${fallbackProvider}`);
          return await this.makeRequest(fallbackProvider, fallbackModel, messages, {
            temperature: options.temperature,
            maxTokens: options.maxTokens
          });
        } catch (fallbackError) {
          console.warn(`Fallback provider ${fallbackProvider} also failed:`, fallbackError);
        }
      }

      // Try any other available provider
      for (const provider of availableProviders) {
        if (provider !== preferredProvider && provider !== fallbackProvider) {
          try {
            const providerConfig = PROVIDERS[provider];
            const providerModel = providerConfig.models[task];
            console.log(`Trying alternative provider: ${provider}`);
            return await this.makeRequest(provider, providerModel, messages, {
              temperature: options.temperature,
              maxTokens: options.maxTokens
            });
          } catch (providerError) {
            console.warn(`Provider ${provider} failed:`, providerError);
            continue;
          }
        }
      }

      throw new Error('All configured AI providers failed. This could be due to:\n\n• Invalid API keys\n• Rate limits exceeded\n• Network connectivity issues\n• Provider service outages\n\nPlease check your API keys and try again.');
    }
  }

  async generateStreamResponse(
    messages: Array<{ role: string; content: string }>,
    onChunk: (chunk: AIStreamResponse) => void,
    options: {
      provider?: string;
      task?: 'chat' | 'analysis' | 'reasoning';
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<void> {
    const availableProviders = this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      throw new Error('No AI providers configured');
    }

    const task = options.task || 'chat';
    let preferredProvider = options.provider || import.meta.env.VITE_CHAT_PROVIDER || 'groq';

    if (!availableProviders.includes(preferredProvider)) {
      preferredProvider = availableProviders[0];
    }

    const config = PROVIDERS[preferredProvider];
    if (!config.supportsStreaming) {
      // Fallback to non-streaming for providers that don't support it
      const response = await this.generateResponse(messages, options);
      onChunk({
        content: response.content,
        done: true,
        model: response.model,
        provider: response.provider
      });
      return;
    }

    const apiKey = this.apiKeys[preferredProvider];
    const model = config.models[task];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    const requestBody = {
      model,
      messages,
      temperature: options.temperature || 0.1,
      max_tokens: options.maxTokens || config.maxTokens,
      stream: true
    };

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`${preferredProvider} API error: ${response.status}`);
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
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onChunk({
                content: '',
                done: true,
                model,
                provider: preferredProvider
              });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                onChunk({
                  content,
                  done: false,
                  model,
                  provider: preferredProvider
                });
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error(`Streaming error with ${preferredProvider}:`, error);
      // Fallback to non-streaming
      const response = await this.generateResponse(messages, options);
      onChunk({
        content: response.content,
        done: true,
        model: response.model,
        provider: response.provider
      });
    }
  }

  getProviderStatus(): Record<string, { configured: boolean; available: boolean; name: string }> {
    const status: Record<string, { configured: boolean; available: boolean; name: string }> = {};
    
    for (const [key, config] of Object.entries(PROVIDERS)) {
      status[key] = {
        configured: this.isProviderConfigured(key),
        available: this.isProviderConfigured(key) && this.checkRateLimit(key),
        name: config.name
      };
    }
    
    return status;
  }

  getRecommendedProviders(): Array<{ provider: string; task: string; reason: string }> {
    return [
      {
        provider: 'groq',
        task: 'chat',
        reason: 'Fastest response times for interactive conversations'
      },
      {
        provider: 'deepseek',
        task: 'analysis',
        reason: 'Optimized for code and document analysis tasks'
      },
      {
        provider: 'together',
        task: 'reasoning',
        reason: 'High-quality reasoning and complex problem solving'
      },
      {
        provider: 'cerebras',
        task: 'chat',
        reason: 'Ultra-fast inference with excellent quality'
      }
    ];
  }
}

export const aiProviderService = new AIProviderService();