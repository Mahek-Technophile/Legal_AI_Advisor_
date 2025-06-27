import React, { useState } from 'react';
import { ExternalLink, Search, AlertTriangle, BookOpen, Scale, Newspaper, MessageSquare, ChevronDown, ChevronUp, Tag, Calendar, Globe, Info, X } from 'lucide-react';
import { DeepSearchResult } from '../../services/deepSearchService';

interface DeepSearchPanelProps {
  results: DeepSearchResult[];
  isLoading: boolean;
  error: string | null;
  onAskForClarification: (result: DeepSearchResult, question: string) => Promise<void>;
  onClose: () => void;
}

export function DeepSearchPanel({ 
  results, 
  isLoading, 
  error, 
  onAskForClarification,
  onClose
}: DeepSearchPanelProps) {
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const [clarificationQuestions, setClarificationQuestions] = useState<Record<string, string>>({});
  const [loadingClarification, setLoadingClarification] = useState<Record<string, boolean>>({});
  const [clarifications, setClarifications] = useState<Record<string, string>>({});

  const toggleExpand = (id: string) => {
    setExpandedResults(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleClarificationChange = (id: string, question: string) => {
    setClarificationQuestions(prev => ({
      ...prev,
      [id]: question
    }));
  };

  const handleAskClarification = async (result: DeepSearchResult) => {
    const question = clarificationQuestions[result.id];
    if (!question) return;
    
    setLoadingClarification(prev => ({
      ...prev,
      [result.id]: true
    }));
    
    try {
      const clarification = await onAskForClarification(result, question);
      setClarifications(prev => ({
        ...prev,
        [result.id]: clarification
      }));
    } catch (error) {
      console.error('Error getting clarification:', error);
    } finally {
      setLoadingClarification(prev => ({
        ...prev,
        [result.id]: false
      }));
    }
  };

  const getResultIcon = (type: DeepSearchResult['type']) => {
    switch (type) {
      case 'case_law':
        return <Scale className="h-5 w-5 text-blue-400" />;
      case 'statute':
        return <BookOpen className="h-5 w-5 text-green-400" />;
      case 'article':
        return <ExternalLink className="h-5 w-5 text-purple-400" />;
      case 'news':
        return <Newspaper className="h-5 w-5 text-amber-400" />;
      default:
        return <Info className="h-5 w-5 text-gray-400" />;
    }
  };

  const getResultTypeLabel = (type: DeepSearchResult['type']) => {
    switch (type) {
      case 'case_law':
        return 'Case Law';
      case 'statute':
        return 'Statute/Regulation';
      case 'article':
        return 'Legal Article';
      case 'news':
        return 'Legal News';
      default:
        return 'Resource';
    }
  };

  const getResultTypeColor = (type: DeepSearchResult['type']) => {
    switch (type) {
      case 'case_law':
        return 'bg-blue-600/20 text-blue-300 border-blue-600/30';
      case 'statute':
        return 'bg-green-600/20 text-green-300 border-green-600/30';
      case 'article':
        return 'bg-purple-600/20 text-purple-300 border-purple-600/30';
      case 'news':
        return 'bg-amber-600/20 text-amber-300 border-amber-600/30';
      default:
        return 'bg-gray-600/20 text-gray-300 border-gray-600/30';
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-600/20 text-green-300 border-green-600/30';
    if (score >= 0.6) return 'bg-blue-600/20 text-blue-300 border-blue-600/30';
    if (score >= 0.4) return 'bg-amber-600/20 text-amber-300 border-amber-600/30';
    return 'bg-gray-600/20 text-gray-300 border-gray-600/30';
  };

  return (
    <div className="bg-gray-700/30 backdrop-blur-xl rounded-xl shadow-sm border border-gray-600 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-600/30 border-b border-gray-600 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Search className="h-5 w-5 text-blue-400" />
          <div>
            <h3 className="font-semibold text-white">DeepSearch Results</h3>
            <p className="text-sm text-gray-300">
              {results.length > 0 
                ? `Found ${results.length} relevant legal resources` 
                : 'Searching for relevant legal resources...'}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[600px] overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-300">Searching legal databases...</span>
          </div>
        ) : error ? (
          <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-4 flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-300 font-medium">Search Error</p>
              <p className="text-red-400 text-sm mt-1">{error}</p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300 mb-2">No results found</p>
            <p className="text-gray-400 text-sm">Try modifying your search terms or uploading a different document.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((result) => (
              <div 
                key={result.id} 
                className="bg-gray-600/20 border border-gray-600 rounded-lg overflow-hidden"
              >
                {/* Result Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-600/30 transition-colors"
                  onClick={() => toggleExpand(result.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getResultIcon(result.type)}
                      <div>
                        <h4 className="font-medium text-white">{result.title}</h4>
                        <div className="flex items-center space-x-2 mt-1 text-xs text-gray-400">
                          <span className="text-gray-300">{result.source}</span>
                          {result.date && (
                            <>
                              <span>•</span>
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {result.date}
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span className="flex items-center">
                            <Globe className="h-3 w-3 mr-1" />
                            {result.jurisdiction}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getResultTypeColor(result.type)}`}>
                        {getResultTypeLabel(result.type)}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getRelevanceColor(result.relevanceScore)}`}>
                        {Math.round(result.relevanceScore * 100)}% Relevant
                      </span>
                      {expandedResults[result.id] ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedResults[result.id] && (
                  <div className="border-t border-gray-600 p-4">
                    <p className="text-gray-300 mb-4">{result.summary}</p>
                    
                    {/* Tags */}
                    {result.tags && result.tags.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Tag className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-300">Tags:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {result.tags.map((tag, index) => (
                            <span 
                              key={index}
                              className="px-2 py-1 text-xs rounded-full bg-gray-700/50 text-gray-300 border border-gray-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3 mt-4">
                      {result.url && (
                        <a 
                          href={result.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors text-sm"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Read Full Source</span>
                        </a>
                      )}
                    </div>
                    
                    {/* Ask for Clarification */}
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <div className="flex items-center space-x-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-300">Ask AI for clarification:</span>
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={clarificationQuestions[result.id] || ''}
                          onChange={(e) => handleClarificationChange(result.id, e.target.value)}
                          placeholder="Ask a specific question about this result..."
                          className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => handleAskClarification(result)}
                          disabled={!clarificationQuestions[result.id] || loadingClarification[result.id]}
                          className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center"
                        >
                          {loadingClarification[result.id] ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              <span>Processing...</span>
                            </>
                          ) : (
                            <span>Ask</span>
                          )}
                        </button>
                      </div>
                      
                      {/* Clarification Response */}
                      {clarifications[result.id] && (
                        <div className="mt-3 p-3 bg-blue-600/10 border border-blue-600/20 rounded-lg">
                          <p className="text-sm text-gray-300">{clarifications[result.id]}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}