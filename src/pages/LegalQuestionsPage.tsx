import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Send, Clock, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-900 text-gray-100 relative overflow-hidden">
      
      {/* Header */}
      <div className="bg-slate-800/90 backdrop-blur-xl border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-gray-100 hover:text-gray-300 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Main</span>
              </button>
              <div className="h-6 w-px bg-slate-600" />
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-600/20 p-2 rounded-lg backdrop-blur-sm">
                  <MessageSquare className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-100">Legal Questions</h1>
                  <p className="text-sm text-gray-400">Get expert legal guidance</p>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              Jurisdiction: {country}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Question Input Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-sm border border-slate-700 p-6">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">Your Legal Question</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="question" className="block text-sm font-medium text-gray-300 mb-2">
                    Describe your legal situation
                  </label>
                  <textarea
                    id="question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Describe your legal situation or question in detail. Include relevant facts, dates, and any specific concerns you have..."
                    className="w-full h-32 p-4 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none bg-slate-700/50 backdrop-blur-sm text-gray-100 placeholder-gray-400"
                  />
                </div>

                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-start space-x-3">
                    <Clock className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-indigo-200 mb-1">Response Time</h4>
                      <p className="text-sm text-indigo-300">
                        Typical response: 30-60 seconds with detailed analysis
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Common Questions */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-sm border border-slate-700 p-6">
              <h3 className="font-semibold text-gray-100 mb-4">Common Questions</h3>
              <div className="space-y-2">
                {commonQuestions.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuestionSelect(q)}
                    className="w-full text-left p-3 text-sm text-gray-300 hover:bg-slate-700/50 hover:text-gray-100 rounded-lg transition-colors border border-transparent hover:border-slate-600"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* What You'll Receive */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-sm border border-slate-700 p-6">
              <h3 className="font-semibold text-gray-100 mb-4">You'll Receive:</h3>
              <ul className="space-y-3">
                {[
                  'Relevant statutory references',
                  'Plain-language explanation',
                  'Practical next steps',
                  'Time-sensitive considerations',
                  'Case law examples',
                  'Risk assessment'
                ].map((item, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-300">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3 flex-shrink-0" />
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