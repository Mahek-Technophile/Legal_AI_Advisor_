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
        return <Scale className="h-5 w-5 text-sapphire-blue" />;
      case 'statute':
        return <BookOpen className="h-5 w-5 text-emerald" />;
      case 'article':
        return <ExternalLink className="h-5 w-5 text-regal-purple" />;
      case 'news':
        return <Newspaper className="h-5 w-5 text-deep-bronze" />;
      default:
        return <Info className="h-5 w-5 text-cool-gray" />;
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
        return 'bg-sapphire-blue/20 text-sapphire-blue border-sapphire-blue/30';
      case 'statute':
        return 'bg-emerald/20 text-emerald border-emerald/30';
      case 'article':
        return 'bg-regal-purple/20 text-regal-purple border-regal-purple/30';
      case 'news':
        return 'bg-deep-bronze/20 text-deep-bronze border-deep-bronze/30';
      default:
        return 'bg-cool-gray/20 text-cool-gray border-cool-gray/30';
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'bg-emerald/20 text-emerald border-emerald/30';
    if (score >= 0.6) return 'bg-sapphire-blue/20 text-sapphire-blue border-sapphire-blue/30';
    if (score >= 0.4) return 'bg-deep-bronze/20 text-deep-bronze border-deep-bronze/30';
    return 'bg-cool-gray/20 text-cool-gray border-cool-gray/30';
  };

  return (
    <div className="bg-charcoal-gray/90 backdrop-blur-xl rounded-xl shadow-sm border border-sapphire-blue/20 overflow-hidden">
      {/* Header */}
      <div className="bg-midnight-navy/70 border-b border-sapphire-blue/20 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Search className="h-5 w-5 text-sapphire-blue" />
          <div>
            <h3 className="font-semibold text-off-white">DeepSearch Results</h3>
            <p className="text-sm text-cool-gray">
              {results.length > 0 
                ? `Found ${results.length} relevant legal resources` 
                : 'Searching for relevant legal resources...'}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-cool-gray hover:text-off-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[600px] overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sapphire-blue"></div>
            <span className="ml-3 text-cool-gray">Searching legal databases...</span>
          </div>
        ) : error ? (
          <div className="bg-legal-red/10 border border-legal-red/20 rounded-lg p-4 flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-legal-red mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-legal-red/90 font-medium">Search Error</p>
              <p className="text-legal-red/70 text-sm mt-1">{error}</p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-cool-gray mx-auto mb-4" />
            <p className="text-cool-gray mb-2">No results found</p>
            <p className="text-cool-gray/70 text-sm">Try modifying your search terms or uploading a different document.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((result) => (
              <div 
                key={result.id} 
                className="bg-midnight-navy/50 border border-sapphire-blue/20 rounded-lg overflow-hidden"
              >
                {/* Result Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-midnight-navy/70 transition-colors"
                  onClick={() => toggleExpand(result.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getResultIcon(result.type)}
                      <div>
                        <h4 className="font-medium text-off-white">{result.title}</h4>
                        <div className="flex items-center space-x-2 mt-1 text-xs text-cool-gray">
                          <span className="text-cool-gray/90">{result.source}</span>
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
                        <ChevronUp className="h-4 w-4 text-cool-gray" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-cool-gray" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedResults[result.id] && (
                  <div className="border-t border-sapphire-blue/20 p-4">
                    <p className="text-cool-gray mb-4">{result.summary}</p>
                    
                    {/* Tags */}
                    {result.tags && result.tags.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Tag className="h-4 w-4 text-cool-gray" />
                          <span className="text-sm text-cool-gray">Tags:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {result.tags.map((tag, index) => (
                            <span 
                              key={index}
                              className="px-2 py-1 text-xs rounded-full bg-midnight-navy/70 text-cool-gray border border-sapphire-blue/20"
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
                          className="flex items-center space-x-1 text-sapphire-blue hover:text-sapphire-blue/80 transition-colors text-sm"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Read Full Source</span>
                        </a>
                      )}
                    </div>
                    
                    {/* Ask for Clarification */}
                    <div className="mt-4 pt-4 border-t border-sapphire-blue/20">
                      <div className="flex items-center space-x-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-cool-gray" />
                        <span className="text-sm text-cool-gray">Ask AI for clarification:</span>
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={clarificationQuestions[result.id] || ''}
                          onChange={(e) => handleClarificationChange(result.id, e.target.value)}
                          placeholder="Ask a specific question about this result..."
                          className="flex-1 bg-midnight-navy/50 border border-sapphire-blue/30 rounded-lg px-3 py-2 text-sm text-off-white placeholder-cool-gray focus:ring-2 focus:ring-sapphire-blue focus:border-transparent"
                        />
                        <button
                          onClick={() => handleAskClarification(result)}
                          disabled={!clarificationQuestions[result.id] || loadingClarification[result.id]}
                          className="bg-sapphire-blue text-off-white px-3 py-2 rounded-lg hover:bg-sapphire-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center"
                        >
                          {loadingClarification[result.id] ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-off-white mr-2"></div>
                              <span>Processing...</span>
                            </>
                          ) : (
                            <span>Ask</span>
                          )}
                        </button>
                      </div>
                      
                      {/* Clarification Response */}
                      {clarifications[result.id] && (
                        <div className="mt-3 p-3 bg-sapphire-blue/10 border border-sapphire-blue/20 rounded-lg">
                          <p className="text-sm text-cool-gray">{clarifications[result.id]}</p>
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