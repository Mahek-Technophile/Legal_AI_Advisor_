import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Search } from 'lucide-react';
import { ChatInterface } from '../components/chat/ChatInterface';

interface LegalQuestionsPageProps {
  onBack: () => void;
  country: string;
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
    <div className="min-h-screen bg-midnight-navy text-off-white relative">
      {/* Header */}
      <div className="bg-midnight-navy/90 backdrop-blur-xl border-b border-sapphire-blue/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-off-white hover:text-cool-gray transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Main</span>
              </button>
              <div className="h-6 w-px bg-sapphire-blue/20" />
              <div className="flex items-center space-x-3">
                <div className="bg-emerald/20 p-2 rounded-lg backdrop-blur-sm">
                  <MessageSquare className="h-5 w-5 text-emerald" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-off-white">Legal Questions</h1>
                  <p className="text-sm text-cool-gray">Get expert legal guidance</p>
                </div>
              </div>
            </div>
            <div className="text-sm text-cool-gray">
              Jurisdiction: {country}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Question Input Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-charcoal-gray/70 backdrop-blur-xl rounded-xl shadow-sm border border-sapphire-blue/20 p-6">
              <h2 className="text-xl font-semibold text-off-white mb-4">Your Legal Question</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="question" className="block text-sm font-medium text-cool-gray mb-2">
                    Describe your legal situation
                  </label>
                  <textarea
                    id="question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Describe your legal situation or question in detail. Include relevant facts, dates, and any specific concerns you have..."
                    className="w-full h-32 p-4 border border-sapphire-blue/30 rounded-lg focus:ring-2 focus:ring-sapphire-blue focus:border-transparent resize-none bg-midnight-navy/50 backdrop-blur-sm text-off-white placeholder-cool-gray"
                  />
                </div>

                <div className="bg-sapphire-blue/10 border border-sapphire-blue/20 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-start space-x-3">
                    <MessageSquare className="h-5 w-5 text-sapphire-blue mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-sapphire-blue mb-1">Response Time</h4>
                      <p className="text-sm text-cool-gray">
                        Typical response: 30-60 seconds with detailed analysis
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Common Questions */}
            <div className="bg-charcoal-gray/70 backdrop-blur-xl rounded-xl shadow-sm border border-sapphire-blue/20 p-6">
              <h3 className="font-semibold text-off-white mb-4">Common Questions</h3>
              <div className="space-y-2">
                {commonQuestions.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuestionSelect(q)}
                    className="w-full text-left p-3 text-sm text-cool-gray hover:bg-midnight-navy/50 hover:text-off-white rounded-lg transition-colors border border-transparent hover:border-sapphire-blue/20"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* What You'll Receive */}
            <div className="bg-charcoal-gray/70 backdrop-blur-xl rounded-xl shadow-sm border border-sapphire-blue/20 p-6">
              <h3 className="font-semibold text-off-white mb-4">You'll Receive:</h3>
              <ul className="space-y-3">
                {[
                  'Relevant statutory references',
                  'Plain-language explanation',
                  'Practical next steps',
                  'Time-sensitive considerations',
                  'Case law examples',
                  'Risk assessment'
                ].map((item, index) => (
                  <li key={index} className="flex items-center text-sm text-cool-gray">
                    <div className="w-2 h-2 bg-emerald rounded-full mr-3 flex-shrink-0" />
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