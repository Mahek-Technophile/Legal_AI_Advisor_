import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  context: string;
  placeholder?: string;
  initialMessage?: string;
  systemPrompt?: string;
}

export function ChatInterface({ 
  context, 
  placeholder = "Type your message...", 
  initialMessage = "",
  systemPrompt = "You are a helpful legal AI assistant."
}: ChatInterfaceProps) {
  const { user, logActivity } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialMessage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitReached, setRateLimitReached] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setInput(initialMessage);
  }, [initialMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea functionality
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      
      // Calculate new height
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120; // ~5 lines of text
      const minHeight = 40; // Initial height
      
      // Set height with constraints
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
      
      // Show/hide scrollbar based on content
      if (scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  }, [input]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    setInput('');
    setLoading(true);
    setError(null);

    try {
      // Log user activity
      await logActivity('chat', `User sent message in ${context}`, { 
        context, 
        messageLength: userMessage.content.length 
      });

      // Simulate API call to OpenAI (replace with actual implementation)
      const response = await simulateOpenAICall(userMessage.content, systemPrompt, messages);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Log assistant response
      await logActivity('chat', `AI responded in ${context}`, { 
        context, 
        responseLength: response.length 
      });

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

  const simulateOpenAICall = async (message: string, systemPrompt: string, previousMessages: Message[]): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

    // Simulate rate limiting (10% chance)
    if (Math.random() < 0.1) {
      throw new Error('Rate limit exceeded');
    }

    // Generate contextual response based on the message and context
    const responses = {
      'document-analysis': generateDocumentAnalysisResponse(message),
      'legal-questions': generateLegalQuestionResponse(message),
      'general-guidance': generateGeneralGuidanceResponse(message),
      'redaction-review': generateRedactionReviewResponse(message)
    };

    return responses[context as keyof typeof responses] || generateGenericResponse(message);
  };

  const generateDocumentAnalysisResponse = (message: string): string => {
    const responses = [
      `Based on your document analysis question, here are the key considerations:

**Risk Assessment:**
- The document appears to have standard commercial terms
- Consider reviewing liability limitations and indemnification clauses
- Ensure termination procedures are clearly defined

**Recommendations:**
1. Review payment terms for clarity
2. Verify compliance with local regulations
3. Consider adding dispute resolution mechanisms

**Next Steps:**
- Have a qualified attorney review the specific clauses mentioned
- Ensure all parties understand their obligations
- Consider negotiating any unfavorable terms

*This analysis is for informational purposes only and does not constitute legal advice.*`,

      `Regarding your document analysis inquiry:

**Key Findings:**
- The contract structure follows standard industry practices
- Several clauses may benefit from clarification
- Risk level appears moderate based on visible terms

**Areas of Concern:**
1. Intellectual property ownership could be clearer
2. Force majeure provisions may need strengthening
3. Confidentiality terms should be reviewed

**Professional Recommendation:**
Given the complexity of legal documents, I recommend consulting with a qualified attorney who can provide jurisdiction-specific advice tailored to your situation.`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const generateLegalQuestionResponse = (message: string): string => {
    const responses = [
      `Thank you for your legal question. Here's a comprehensive analysis:

**Legal Framework:**
Under current legislation, the key principles that apply to your situation include statutory protections and common law precedents.

**Your Rights:**
1. You have the right to seek legal remedy
2. Statutory protections may apply depending on circumstances
3. Time limitations may affect your options

**Recommended Actions:**
- Document all relevant facts and communications
- Gather supporting evidence
- Consider alternative dispute resolution
- Consult with a qualified attorney for specific guidance

**Important Note:**
This information is general in nature. For advice specific to your situation, please consult with a licensed attorney in your jurisdiction.`,

      `Based on your question, here are the key legal considerations:

**Applicable Law:**
The relevant statutes and regulations that govern this area provide specific protections and procedures.

**Analysis:**
1. **Immediate Concerns:** Address any time-sensitive issues first
2. **Legal Options:** Multiple pathways may be available
3. **Risk Assessment:** Consider potential outcomes and costs

**Next Steps:**
- Review all relevant documentation
- Understand your legal obligations
- Consider the strength of your position
- Seek professional legal counsel

*Remember: This is general information only and should not replace professional legal advice.*`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const generateGeneralGuidanceResponse = (message: string): string => {
    const responses = [
      `Here's comprehensive guidance on your legal topic:

**Overview:**
This area of law involves several key principles and regulatory requirements that vary by jurisdiction.

**Key Considerations:**
1. **Compliance Requirements:** Ensure adherence to all applicable regulations
2. **Best Practices:** Follow industry standards and professional guidelines
3. **Risk Management:** Identify and mitigate potential legal exposures

**Implementation Steps:**
- Conduct thorough research on applicable laws
- Develop compliant policies and procedures
- Regular review and updates as laws change
- Professional consultation for complex matters

**Resources:**
- Relevant statutes and regulations
- Professional associations and guidelines
- Legal databases and research tools

*This guidance is educational and should be supplemented with professional legal advice.*`,

      `Regarding your inquiry about this legal area:

**Legal Framework:**
The governing principles include both statutory requirements and common law developments.

**Practical Considerations:**
1. **Documentation:** Maintain proper records and documentation
2. **Compliance:** Stay current with regulatory changes
3. **Professional Support:** Engage qualified professionals when needed

**Common Issues:**
- Misunderstanding of legal requirements
- Inadequate documentation
- Failure to update practices with law changes

**Recommendations:**
- Regular legal compliance reviews
- Professional development and training
- Consultation with specialized attorneys

*This information is for educational purposes and does not constitute legal advice for your specific situation.*`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const generateRedactionReviewResponse = (message: string): string => {
    const responses = [
      `Regarding redacted document analysis:

**Analysis Limitations:**
When documents contain redacted sections, our analysis is necessarily limited to visible content only.

**Key Considerations:**
1. **Missing Information Impact:** Redacted sections may contain critical terms
2. **Risk Assessment:** Higher uncertainty due to incomplete information
3. **Professional Review:** Essential for redacted documents

**Recommendations:**
- Request unredacted versions when possible
- Identify specific sections needing clarification
- Professional legal review is strongly recommended
- Consider risk mitigation strategies

**Important Note:**
Redacted document analysis cannot provide complete legal assessment. The hidden information may significantly impact the overall evaluation and risk profile.`,

      `For redacted document review:

**Analytical Approach:**
We can only analyze visible content, which creates inherent limitations in our assessment.

**Critical Gaps:**
- Financial terms may be hidden
- Liability provisions could be redacted
- Key obligations might not be visible

**Risk Implications:**
1. **Incomplete Risk Assessment:** Cannot fully evaluate exposure
2. **Hidden Obligations:** May contain undisclosed requirements
3. **Legal Exposure:** Unknown terms could create liability

**Next Steps:**
- Seek disclosure of critical redacted sections
- Professional legal counsel is essential
- Consider requesting specific clarifications
- Develop contingency plans for unknown terms

*Given the limitations of redacted document analysis, professional legal consultation is strongly advised.*`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const generateGenericResponse = (message: string): string => {
    return `Thank you for your question. I'm here to help with legal guidance and analysis.

**General Approach:**
For any legal matter, it's important to consider the specific facts, applicable law, and potential consequences.

**Recommendations:**
1. Gather all relevant information and documentation
2. Research applicable laws and regulations
3. Consider consulting with a qualified attorney
4. Evaluate your options and potential outcomes

**Important Disclaimer:**
This information is for educational purposes only and does not constitute legal advice. For matters specific to your situation, please consult with a licensed attorney in your jurisdiction.

How can I assist you further with your legal inquiry?`;
  };

  const handleRetry = () => {
    setRateLimitReached(false);
    setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
      {/* Chat Header */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Bot className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Legal AI Assistant</h3>
            <p className="text-sm text-slate-500">Ask questions and get detailed legal guidance</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              Start a conversation to get legal guidance and analysis
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-900'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && (
                  <Bot className="h-4 w-4 mt-1 flex-shrink-0" />
                )}
                {message.role === 'user' && (
                  <User className="h-4 w-4 mt-1 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </div>
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-200' : 'text-slate-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
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
                <Bot className="h-4 w-4" />
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-slate-600">Thinking...</span>
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
      <div className="border-t border-slate-200 p-4">
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
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                         transition-all duration-200 ease-in-out
                         text-slate-900 placeholder-slate-500
                         disabled:opacity-50 disabled:cursor-not-allowed
                         min-h-[2.5rem] max-h-[7.5rem]
                         leading-6 text-base
                         sm:text-sm
                         hover:border-slate-400
                         focus:shadow-sm"
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
            className="flex-shrink-0 bg-blue-600 text-white p-3 rounded-lg 
                       hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
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
            Press Enter to send, Shift+Enter for new line
          </p>
          <div className="flex items-center space-x-4 text-xs text-slate-400">
            <span className="hidden sm:inline">Max 5 lines</span>
            <span>{input.length} characters</span>
          </div>
        </div>
      </div>
    </div>
  );
}