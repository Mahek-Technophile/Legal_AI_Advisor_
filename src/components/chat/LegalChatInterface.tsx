import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, AlertCircle, RefreshCw, Scale, MapPin, Clock, FileText, Users } from 'lucide-react';
import { useFirebaseAuth } from '../../contexts/FirebaseAuthContext';
import { useScrollPosition } from '../../hooks/useScrollPosition';
import { processUserMessage, shouldTriggerGreeting } from '../../utils/greetingDetection';
import { 
  isLegalQuery, 
  extractJurisdiction, 
  generateLegalResponse, 
  validateLegalQuery,
  type LegalResponse,
  type LegalQuery 
} from '../../utils/legalAssistant';
import { aiProviderService } from '../../services/aiProviders';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isGreeting?: boolean;
  isLegalResponse?: boolean;
  legalData?: LegalResponse;
  provider?: string;
  model?: string;
}

interface LegalChatInterfaceProps {
  context: string;
  placeholder?: string;
  initialMessage?: string;
  systemPrompt?: string;
  country?: string;
}

export function LegalChatInterface({ 
  context, 
  placeholder = "Ask your legal question...", 
  initialMessage = "",
  systemPrompt = "You are a legal information assistant.",
  country
}: LegalChatInterfaceProps) {
  const { user } = useFirebaseAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialMessage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitReached, setRateLimitReached] = useState(false);
  const [currentJurisdiction, setCurrentJurisdiction] = useState<string | undefined>(country);
  const [providerStatus, setProviderStatus] = useState<any>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll position management for messages container
  const { elementRef: scrollElementRef } = useScrollPosition({
    key: `legal-chat-${context}`,
    restoreOnMount: false,
    saveOnUnmount: true
  });

  useEffect(() => {
    setInput(initialMessage);
  }, [initialMessage]);

  useEffect(() => {
    // Check provider status on mount
    const status = aiProviderService.getProviderStatus();
    setProviderStatus(status);
  }, []);

  // Auto-resize textarea functionality
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120;
      const minHeight = 40;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [input]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up scroll element ref
  useEffect(() => {
    if (messagesContainerRef.current && scrollElementRef) {
      scrollElementRef.current = messagesContainerRef.current;
    }
  }, [scrollElementRef]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  };

  const logActivity = async (type: string, description: string, metadata?: Record<string, any>) => {
    // Mock activity logging for Firebase
    console.log('Activity logged:', { type, description, metadata });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    try {
      // Log user activity
      await logActivity('legal_chat', `User sent message in ${context}`, { 
        context, 
        messageLength: userMessage.content.length,
        hasJurisdiction: !!currentJurisdiction
      });

      // Check if message is a greeting first
      const greetingResult = processUserMessage(currentInput);
      
      if (greetingResult.isGreeting && shouldTriggerGreeting(currentInput)) {
        // Handle greeting with legal advisor response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: greetingResult.response!,
          timestamp: new Date(),
          isGreeting: true
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        await logActivity('legal_chat', `AI provided legal advisor greeting in ${context}`, { 
          context,
          greetingDetected: true
        });
      } else if (isLegalQuery(currentInput)) {
        // Handle legal query with AI providers
        const extractedJurisdiction = extractJurisdiction(currentInput) || currentJurisdiction;
        
        const legalQuery: LegalQuery = {
          message: currentInput,
          jurisdiction: extractedJurisdiction,
          context
        };

        // Validate query completeness
        const validation = validateLegalQuery(legalQuery);
        
        let response: string;
        let legalData: LegalResponse | undefined;
        
        if (!validation.isValid && validation.clarifyingQuestions.length > 0) {
          // Generate clarifying questions
          response = generateClarifyingQuestionsResponse(validation.clarifyingQuestions, currentInput);
          legalData = {
            requiresJurisdiction: !extractedJurisdiction,
            response
          };
        } else {
          // Generate AI response using cloud providers
          const messages = [
            { 
              role: 'system', 
              content: buildLegalSystemPrompt(extractedJurisdiction || 'general', context)
            },
            { role: 'user', content: currentInput }
          ];

          const aiResponse = await aiProviderService.generateResponse(messages, {
            task: 'chat',
            temperature: 0.1,
            maxTokens: 2000
          });

          response = aiResponse.content;
          
          // Update jurisdiction if extracted
          if (extractedJurisdiction && extractedJurisdiction !== currentJurisdiction) {
            setCurrentJurisdiction(extractedJurisdiction);
          }

          // Try to parse structured legal response
          try {
            const structuredResponse = JSON.parse(response);
            legalData = {
              requiresJurisdiction: false,
              response: structuredResponse.response || response,
              citations: structuredResponse.citations,
              nextSteps: structuredResponse.nextSteps,
              deadlines: structuredResponse.deadlines,
              agencies: structuredResponse.agencies
            };
          } catch {
            // Use plain text response
            legalData = {
              requiresJurisdiction: false,
              response
            };
          }
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: legalData.response,
          timestamp: new Date(),
          isLegalResponse: true,
          legalData,
          provider: 'aiResponse' in aiResponse ? aiResponse.provider : undefined,
          model: 'aiResponse' in aiResponse ? aiResponse.model : undefined
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        await logActivity('legal_chat', `AI provided legal guidance in ${context}`, { 
          context,
          jurisdiction: extractedJurisdiction,
          provider: assistantMessage.provider,
          model: assistantMessage.model,
          responseLength: response.length
        });
      } else {
        // Handle general conversation with AI
        const messages = [
          { 
            role: 'system', 
            content: `You are a helpful legal assistant. Provide informative responses while encouraging users to ask specific legal questions for detailed guidance. Keep responses concise and helpful.`
          },
          { role: 'user', content: currentInput }
        ];

        const aiResponse = await aiProviderService.generateResponse(messages, {
          task: 'chat',
          temperature: 0.3,
          maxTokens: 1000
        });

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponse.content,
          timestamp: new Date(),
          provider: aiResponse.provider,
          model: aiResponse.model
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        await logActivity('legal_chat', `AI provided general response in ${context}`, { 
          context,
          provider: aiResponse.provider,
          model: aiResponse.model,
          responseLength: aiResponse.content.length 
        });
      }

    } catch (err: any) {
      console.error('Chat error:', err);
      
      if (err.message.includes('rate limit') || err.message.includes('Rate limit')) {
        setRateLimitReached(true);
        setError('Rate limit reached. Please wait a moment before sending another message.');
      } else if (err.message.includes('No AI providers configured')) {
        setError('AI services are not configured. Please check your API keys in the environment variables.');
      } else {
        setError('Failed to get response. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const buildLegalSystemPrompt = (jurisdiction: string, context: string): string => {
    return `You are a legal information assistant specializing in ${jurisdiction} law. 

Provide detailed legal guidance with:
- Clear explanations in plain language
- Relevant legal citations and statutes
- Practical next steps
- Important deadlines or time-sensitive considerations
- Relevant government agencies or resources

Context: ${context}

Always include appropriate disclaimers about seeking professional legal counsel for specific situations.

Format your response as JSON when possible with this structure:
{
  "response": "main response text",
  "citations": ["relevant legal citations"],
  "nextSteps": ["actionable steps"],
  "deadlines": ["important deadlines"],
  "agencies": ["relevant agencies or resources"]
}

If JSON formatting is not suitable, provide a well-structured plain text response.`;
  };

  const generateClarifyingQuestionsResponse = (questions: string[], originalMessage: string): string => {
    return `To provide accurate legal guidance, I need additional information about your situation.

**Your Question**: ${originalMessage}

**Please provide the following details**:

${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

**Why This Information Matters**: Legal advice must be specific to your jurisdiction and circumstances. Providing these details ensures I can give you accurate, relevant guidance with proper legal citations and next steps.

**Once you provide this information**, I can offer detailed guidance including:
• Applicable laws and statutes with citations
• Your legal rights and obligations  
• Practical next steps and deadlines
• Relevant government agencies and resources
• When to consult with a qualified attorney`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleRetry = () => {
    setRateLimitReached(false);
    setError(null);
  };

  const renderLegalResponse = (message: Message) => {
    if (!message.legalData) return message.content;

    const { legalData } = message;
    
    return (
      <div className="space-y-4">
        <div className="prose prose-slate max-w-none">
          <div className="whitespace-pre-wrap">{legalData.response}</div>
        </div>
        
        {legalData.citations && legalData.citations.length > 0 && (
          <div className="bg-sapphire-blue/10 border border-sapphire-blue/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="h-4 w-4 text-sapphire-blue" />
              <h4 className="font-medium text-sapphire-blue">Legal Citations</h4>
            </div>
            <ul className="text-sm text-off-white space-y-1">
              {legalData.citations.map((citation, index) => (
                <li key={index}>• {citation}</li>
              ))}
            </ul>
          </div>
        )}

        {legalData.nextSteps && legalData.nextSteps.length > 0 && (
          <div className="bg-emerald/10 border border-emerald/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-4 w-4 text-emerald" />
              <h4 className="font-medium text-emerald">Recommended Next Steps</h4>
            </div>
            <ol className="text-sm text-off-white space-y-1">
              {legalData.nextSteps.map((step, index) => (
                <li key={index}>{index + 1}. {step}</li>
              ))}
            </ol>
          </div>
        )}

        {legalData.deadlines && legalData.deadlines.length > 0 && (
          <div className="bg-deep-bronze/10 border border-deep-bronze/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-deep-bronze" />
              <h4 className="font-medium text-deep-bronze">Important Deadlines</h4>
            </div>
            <ul className="text-sm text-off-white space-y-1">
              {legalData.deadlines.map((deadline, index) => (
                <li key={index}>• {deadline}</li>
              ))}
            </ul>
          </div>
        )}

        {legalData.agencies && legalData.agencies.length > 0 && (
          <div className="bg-regal-purple/10 border border-regal-purple/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="h-4 w-4 text-regal-purple" />
              <h4 className="font-medium text-regal-purple">Relevant Agencies & Resources</h4>
            </div>
            <ul className="text-sm text-off-white space-y-1">
              {legalData.agencies.map((agency, index) => (
                <li key={index}>• {agency}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-charcoal-gray/50 border border-charcoal-gray rounded-lg p-4">
          <p className="text-xs text-cool-gray">
            <strong>Disclaimer:</strong> This information is for educational purposes only and does not constitute legal advice. 
            For matters specific to your situation, please consult with a qualified attorney in your jurisdiction.
          </p>
        </div>
      </div>
    );
  };

  const configuredProviders = Object.values(providerStatus).filter((p: any) => p.configured).length;
  const availableProviders = Object.values(providerStatus).filter((p: any) => p.available).length;

  return (
    <div className="bg-charcoal-gray rounded-xl shadow-sm border border-sapphire-blue/20 flex flex-col h-[600px]">
      {/* Enhanced Chat Header */}
      <div className="border-b border-sapphire-blue/20 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-midnight-navy p-2 rounded-lg">
              <Scale className="h-5 w-5 text-off-white" />
            </div>
            <div>
              <h3 className="font-semibold text-off-white">Legal Information Assistant</h3>
              <p className="text-sm text-cool-gray">
                {configuredProviders > 0 
                  ? `Powered by ${configuredProviders} AI provider${configuredProviders > 1 ? 's' : ''}`
                  : 'AI services not configured'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {configuredProviders > 0 && (
              <div className="flex items-center space-x-2 bg-emerald/10 px-3 py-1 rounded-full border border-emerald/20">
                <div className="w-2 h-2 bg-emerald rounded-full"></div>
                <span className="text-sm font-medium text-emerald">
                  {availableProviders} Available
                </span>
              </div>
            )}
            {currentJurisdiction && (
              <div className="flex items-center space-x-2 bg-sapphire-blue/10 px-3 py-1 rounded-full border border-sapphire-blue/20">
                <MapPin className="h-4 w-4 text-sapphire-blue" />
                <span className="text-sm font-medium text-sapphire-blue">
                  {currentJurisdiction}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar bg-midnight-navy/30"
      >
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Scale className="h-12 w-12 text-cool-gray mx-auto mb-4" />
            <p className="text-cool-gray mb-2">
              Ask legal questions and get detailed guidance with proper citations
            </p>
            <p className="text-xs text-cool-gray/70">
              Try: "What are my employment rights?" or "How do I review a contract?"
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-sapphire-blue text-off-white'
                  : message.isGreeting
                  ? 'bg-emerald/10 text-off-white border border-emerald/20'
                  : message.isLegalResponse
                  ? 'bg-sapphire-blue/10 text-off-white border border-sapphire-blue/20'
                  : 'bg-charcoal-gray text-off-white'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && (
                  <Scale className={`h-4 w-4 mt-1 flex-shrink-0 ${
                    message.isGreeting ? 'text-emerald' : 
                    message.isLegalResponse ? 'text-sapphire-blue' : 'text-cool-gray'
                  }`} />
                )}
                {message.role === 'user' && (
                  <User className="h-4 w-4 mt-1 flex-shrink-0 text-off-white/80" />
                )}
                <div className="flex-1">
                  <div className="text-sm">
                    {message.isLegalResponse ? renderLegalResponse(message) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                  </div>
                  <div className={`text-xs mt-2 flex items-center justify-between ${
                    message.role === 'user' 
                      ? 'text-off-white/70' 
                      : message.isGreeting
                      ? 'text-emerald/70'
                      : message.isLegalResponse
                      ? 'text-sapphire-blue/70'
                      : 'text-cool-gray'
                  }`}>
                    <span>
                      {message.timestamp.toLocaleTimeString()}
                      {message.isGreeting && (
                        <span className="ml-2 font-medium">• Legal Advisor</span>
                      )}
                      {message.isLegalResponse && (
                        <span className="ml-2 font-medium">• Legal Information</span>
                      )}
                    </span>
                    {message.provider && (
                      <span className="text-xs opacity-75">
                        {message.provider}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-charcoal-gray rounded-lg p-4 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <Scale className="h-4 w-4 text-cool-gray" />
                <Loader2 className="h-4 w-4 animate-spin text-cool-gray" />
                <span className="text-sm text-cool-gray">Analyzing legal question...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-legal-red/10 border border-legal-red/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-legal-red mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-legal-red/90 text-sm">{error}</p>
                {rateLimitReached && (
                  <button
                    onClick={handleRetry}
                    className="mt-2 flex items-center space-x-2 text-legal-red hover:text-legal-red/80 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span className="text-sm">Try Again</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input Section */}
      <div className="border-t border-sapphire-blue/20 p-4 flex-shrink-0 bg-charcoal-gray">
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={configuredProviders > 0 ? placeholder : "Please configure AI providers to use chat"}
              disabled={loading || configuredProviders === 0}
              className="w-full min-w-[250px] resize-none border border-sapphire-blue/30 rounded-lg px-3 py-2 
                         focus:ring-2 focus:ring-sapphire-blue focus:border-transparent 
                         transition-all duration-200 ease-in-out
                         text-off-white placeholder-cool-gray
                         disabled:opacity-50 disabled:cursor-not-allowed
                         min-h-[2.5rem] max-h-[7.5rem]
                         leading-6 text-base
                         sm:text-sm
                         hover:border-sapphire-blue/50
                         focus:shadow-sm
                         custom-scrollbar
                         bg-midnight-navy/50"
              style={{
                height: '40px',
                overflowY: 'hidden'
              }}
              rows={1}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || loading || configuredProviders === 0}
            className="flex-shrink-0 bg-sapphire-blue text-off-white p-3 rounded-lg 
                       hover:bg-sapphire-blue/90 focus:ring-2 focus:ring-sapphire-blue focus:ring-offset-2 focus:ring-offset-charcoal-gray
                       disabled:opacity-50 disabled:cursor-not-allowed 
                       transition-all duration-200 ease-in-out
                       min-h-[2.75rem] min-w-[2.75rem]
                       flex items-center justify-center
                       hover:shadow-md focus:shadow-md
                       active:scale-95"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
        
        {/* Helper Text */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 space-y-1 sm:space-y-0">
          <p className="text-xs text-cool-gray">
            {configuredProviders > 0 
              ? "Ask specific legal questions for detailed guidance with citations"
              : "Configure AI providers in environment variables to enable chat"
            }
          </p>
          <div className="flex items-center space-x-4 text-xs text-cool-gray/70">
            <span className="hidden sm:inline">Press Enter to send</span>
            <span>{input.length} characters</span>
          </div>
        </div>
      </div>
    </div>
  );
}