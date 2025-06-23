import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Send, Clock, AlertCircle } from 'lucide-react';
import { ChatInterface } from '../components/chat/ChatInterface';

interface LegalQuestionsPageProps {
  onBack: () => void;
  country: string;
}

// Salcosta-inspired animated background component
function SalcostaBackground() {
  return (
    <div className="salcosta-background">
      {/* Animated gradient orbs */}
      <div className="floating-orb orb-1"></div>
      <div className="floating-orb orb-2"></div>
      <div className="floating-orb orb-3"></div>
      <div className="floating-orb orb-4"></div>
      <div className="floating-orb orb-5"></div>
      <div className="floating-orb orb-6"></div>
      
      {/* Animated grid overlay */}
      <div className="grid-overlay"></div>
      
      {/* Floating particles */}
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
    </div>
  );
}

export function LegalQuestionsPage({ onBack, country }: LegalQuestionsPageProps) {
  const [question, setQuestion] = useState('');

  const commonQuestions = [
    "What are my rights as an employee regarding overtime pay?",
    "How do I properly terminate a contract?",
    "What should I include in a non-disclosure agreement?",
    "What are the requirements for forming an LLC?",
    "How long do I have to file a personal injury claim?",
    "What constitutes trademark infringement?"
  ];

  const handleQuestionSelect = (selectedQuestion: string) => {
    setQuestion(selectedQuestion);
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <SalcostaBackground />
      
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40 content-layer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors text-enhanced-contrast"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Main</span>
              </button>
              <div className="h-6 w-px bg-white/30" />
              <div className="flex items-center space-x-3">
                <div className="bg-green-100/20 p-2 rounded-lg backdrop-blur-sm">
                  <MessageSquare className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white text-enhanced-contrast">Legal Questions</h1>
                  <p className="text-sm text-gray-300 text-enhanced-contrast">Get expert legal guidance</p>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-300 text-enhanced-contrast">
              Jurisdiction: {country}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 content-layer">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Question Input Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-sm border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 text-enhanced-contrast">Your Legal Question</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="question" className="block text-sm font-medium text-gray-300 mb-2 text-enhanced-contrast">
                    Describe your legal situation
                  </label>
                  <textarea
                    id="question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Describe your legal situation or question in detail. Include relevant facts, dates, and any specific concerns you have..."
                    className="w-full h-32 p-4 border border-white/20 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none bg-white/5 backdrop-blur-sm text-white placeholder-gray-400"
                  />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-start space-x-3">
                    <Clock className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-200 mb-1 text-enhanced-contrast">Response Time</h4>
                      <p className="text-sm text-blue-300 text-enhanced-contrast">
                        Typical response: 30-60 seconds with detailed analysis
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Common Questions */}
            <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-sm border border-white/10 p-6">
              <h3 className="font-semibold text-white mb-4 text-enhanced-contrast">Common Questions</h3>
              <div className="space-y-2">
                {commonQuestions.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuestionSelect(q)}
                    className="w-full text-left p-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors border border-transparent hover:border-white/20 text-enhanced-contrast"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* What You'll Receive */}
            <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-sm border border-white/10 p-6">
              <h3 className="font-semibold text-white mb-4 text-enhanced-contrast">You'll Receive:</h3>
              <ul className="space-y-3">
                {[
                  'Relevant statutory references',
                  'Plain-language explanation',
                  'Practical next steps',
                  'Time-sensitive considerations',
                  'Case law examples',
                  'Risk assessment'
                ].map((item, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-300 text-enhanced-contrast">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <ChatInterface
              context="legal-questions"
              placeholder="Ask your legal question here..."
              initialMessage={question}
              systemPrompt={`You are a legal AI assistant specializing in ${country} law. Provide detailed legal guidance with statutory references, practical advice, and clear next steps. Always include appropriate disclaimers about seeking professional legal counsel.`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}