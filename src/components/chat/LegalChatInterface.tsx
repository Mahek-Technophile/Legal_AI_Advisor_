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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isGreeting?: boolean;
  isLegalResponse?: boolean;
  legalData?: LegalResponse;
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
        // Handle legal query with structured response
        const extractedJurisdiction = extractJurisdiction(currentInput) || currentJurisdiction;
        
        const legalQuery: LegalQuery = {
          message: currentInput,
          jurisdiction: extractedJurisdiction,
          context
        };

        // Validate query completeness
        const validation = validateLegalQuery(legalQuery);
        
        let legalResponse: LegalResponse;
        
        if (!validation.isValid && validation.clarifyingQuestions.length > 0) {
          // Generate clarifying questions
          legalResponse = {
            requiresJurisdiction: !extractedJurisdiction,
            response: generateClarifyingQuestionsResponse(validation.clarifyingQuestions, currentInput)
          };
        } else {
          // Generate structured legal response
          legalResponse = generateLegalResponse(legalQuery);
          
          // Update jurisdiction if extracted
          if (extractedJurisdiction && extractedJurisdiction !== currentJurisdiction) {
            setCurrentJurisdiction(extractedJurisdiction);
          }
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: legalResponse.response,
          timestamp: new Date(),
          isLegalResponse: true,
          legalData: legalResponse
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        await logActivity('legal_chat', `AI provided legal guidance in ${context}`, { 
          context,
          jurisdiction: extractedJurisdiction,
          requiresJurisdiction: legalResponse.requiresJurisdiction,
          responseLength: legalResponse.response.length
        });
      } else {
        // Handle general conversation
        const response = await simulateGeneralResponse(currentInput, systemPrompt, messages);
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        await logActivity('legal_chat', `AI provided general response in ${context}`, { 
          context, 
          responseLength: response.length 
        });
      }

    } catch (err: any) {
      console.error('Chat error:', err);
      
      if (err.message.includes('rate limit')) {
        setRateLimitReached(true);
        setError('Rate limit reached. Please wait a moment before sending another message.');
      } else {
        setError('Failed to get response. Please try again.');
      }
    } finally {
      setLoading(false);
    }
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

  const simulateGeneralResponse = async (message: string, systemPrompt: string, previousMessages: Message[]): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));

    return `I understand you're looking for information. However, I'm specifically designed to provide legal guidance and information.

**How I Can Help You**:
• Answer questions about laws and legal procedures
• Review and analyze legal documents
• Provide jurisdiction-specific legal information
• Explain legal concepts in plain language

**To Get Started**: Please ask a legal question or describe a legal situation you need guidance on. I'll provide detailed information with proper citations and next steps.

**Example Questions**:
• "What are my rights as an employee in [your location]?"
• "How do I terminate a contract legally?"
• "What should I include in a non-disclosure agreement?"

What legal matter can I assist you with today?`;
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-blue-900">Legal Citations</h4>
            </div>
            <ul className="text-sm text-blue-800 space-y-1">
              {legalData.citations.map((citation, index) => (
                <li key={index}>• {citation}</li>
              ))}
            </ul>
          </div>
        )}

        {legalData.nextSteps && legalData.nextSteps.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-4 w-4 text-green-600" />
              <h4 className="font-medium text-green-900">Recommended Next Steps</h4>
            </div>
            <ol className="text-sm text-green-800 space-y-1">
              {legalData.nextSteps.map((step, index) => (
                <li key={index}>{index + 1}. {step}</li>
              ))}
            </ol>
          </div>
        )}

        {legalData.deadlines && legalData.deadlines.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <h4 className="font-medium text-amber-900">Important Deadlines</h4>
            </div>
            <ul className="text-sm text-amber-800 space-y-1">
              {legalData.deadlines.map((deadline, index) => (
                <li key={index}>• {deadline}</li>
              ))}
            </ul>
          </div>
        )}

        {legalData.agencies && legalData.agencies.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="h-4 w-4 text-purple-600" />
              <h4 className="font-medium text-purple-900">Relevant Agencies & Resources</h4>
            </div>
            <ul className="text-sm text-purple-800 space-y-1">
              {legalData.agencies.map((agency, index) => (
                <li key={index}>• {agency}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-600">
            <strong>Disclaimer:</strong> This information is for educational purposes only and does not constitute legal advice. 
            For matters specific to your situation, please consult with a qualified attorney in your jurisdiction.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
      {/* Enhanced Chat Header */}
      <div className="border-b border-slate-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-slate-900 p-2 rounded-lg">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Legal Information Assistant</h3>
              <p className="text-sm text-slate-500">Jurisdiction-specific legal guidance with citations</p>
            </div>
          </div>
          {currentJurisdiction && (
            <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                {currentJurisdiction}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar"
      >
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Scale className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-2">
              Ask legal questions and get detailed guidance with proper citations
            </p>
            <p className="text-xs text-slate-400">
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
                  ? 'bg-slate-900 text-white'
                  : message.isGreeting
                  ? 'bg-green-50 text-green-900 border border-green-200'
                  : message.isLegalResponse
                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                  : 'bg-slate-100 text-slate-900'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && (
                  <Scale className={`h-4 w-4 mt-1 flex-shrink-0 ${
                    message.isGreeting ? 'text-green-600' : 
                    message.isLegalResponse ? 'text-blue-600' : 'text-slate-600'
                  }`} />
                )}
                {message.role === 'user' && (
                  <User className="h-4 w-4 mt-1 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="text-sm">
                    {message.isLegalResponse ? renderLegalResponse(message) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                  </div>
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' 
                      ? 'text-slate-300' 
                      : message.isGreeting
                      ? 'text-green-600'
                      : message.isLegalResponse
                      ? 'text-blue-600'
                      : 'text-slate-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                    {message.isGreeting && (
                      <span className="ml-2 font-medium">• Legal Advisor</span>
                    )}
                    {message.isLegalResponse && (
                      <span className="ml-2 font-medium">• Legal Information</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-lg p-4 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <Scale className="h-4 w-4" />
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-slate-600">Analyzing legal question...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-700 text-sm">{error}</p>
                {rateLimitReached && (
                  <button
                    onClick={handleRetry}
                    className="mt-2 flex items-center space-x-2 text-red-600 hover:text-red-800 transition-colors"
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
      <div className="border-t border-slate-200 p-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={loading}
              className="w-full min-w-[250px] resize-none border border-slate-300 rounded-lg px-3 py-2 
                         focus:ring-2 focus:ring-slate-500 focus:border-transparent 
                         transition-all duration-200 ease-in-out
                         text-slate-900 placeholder-slate-500
                         disabled:opacity-50 disabled:cursor-not-allowed
                         min-h-[2.5rem] max-h-[7.5rem]
                         leading-6 text-base
                         sm:text-sm
                         hover:border-slate-400
                         focus:shadow-sm
                         custom-scrollbar"
              style={{
                height: '40px',
                overflowY: 'hidden'
              }}
              rows={1}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex-shrink-0 bg-slate-900 text-white p-3 rounded-lg 
                       hover:bg-slate-800 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2
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
          <p className="text-xs text-slate-500">
            Ask specific legal questions for detailed guidance with citations
          </p>
          <div className="flex items-center space-x-4 text-xs text-slate-400">
            <span className="hidden sm:inline">Press Enter to send</span>
            <span>{input.length} characters</span>
          </div>
        </div>
      </div>
    </div>
  );
}