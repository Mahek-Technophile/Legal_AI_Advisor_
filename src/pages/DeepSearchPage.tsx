import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Upload, FileText, AlertTriangle, CheckCircle, Loader2, Download, History, Trash2, Info, Eye, EyeOff, AlertCircle, RefreshCw, Target, Globe, Book, Newspaper, Scale } from 'lucide-react';
import { deepSearchService, DeepSearchResult } from '../services/deepSearchService';
import { DeepSearchPanel } from '../components/deepsearch/DeepSearchPanel';
import { DeepSearchButton } from '../components/deepsearch/DeepSearchButton';

interface DeepSearchPageProps {
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

export function DeepSearchPage({ onBack, country }: DeepSearchPageProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DeepSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [extractedTerms, setExtractedTerms] = useState<string[]>([]);
  const [customSearchTerms, setCustomSearchTerms] = useState<string>('');

  useEffect(() => {
    checkConfiguration();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadSearchHistory();
    }
  }, [activeTab]);

  const checkConfiguration = async () => {
    try {
      const status = await deepSearchService.getConfigurationStatus();
      setConfigStatus(status);
    } catch (error) {
      console.error('Error checking configuration:', error);
      setConfigStatus({
        configured: false,
        message: 'Failed to check DeepSearch configuration'
      });
    }
  };

  const loadSearchHistory = async () => {
    setLoadingHistory(true);
    try {
      // This would be implemented to fetch search history from database
      setSearchHistory([]);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setUploadedFile(file);
        setError(null);
        extractAndPreviewContent(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setUploadedFile(file);
        setError(null);
        extractAndPreviewContent(file);
      }
    }
  };

  const validateFile = (file: File) => {
    const allowedTypes = [
      'text/plain', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.type === 'application/pdf') {
      setError('PDF files are currently not supported. Please convert to DOC, DOCX, or TXT format for analysis.');
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      setError('Please upload TXT, DOC, or DOCX files only. PDF support is temporarily unavailable.');
      return false;
    }

    if (file.size > maxSize) {
      setError('File size must be less than 10MB.');
      return false;
    }

    return true;
  };

  const extractAndPreviewContent = async (file: File) => {
    try {
      // This would use the same text extraction as document analysis
      const content = await extractTextFromFile(file);
      setDocumentContent(content);
      
      // Extract legal terms
      const terms = await deepSearchService.extractLegalTerms(content, country);
      setExtractedTerms(terms);
    } catch (err: any) {
      setError(err.message);
      setUploadedFile(null);
      setDocumentContent('');
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target?.result as string);
      };
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  };

  const handleDeepSearch = async () => {
    if (!uploadedFile || !documentContent) return;

    if (!configStatus?.configured) {
      setError('DeepSearch is not configured. Please check your search API keys in the environment variables.');
      return;
    }

    setSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      // Combine extracted terms with custom search terms
      const customTermsList = customSearchTerms
        .split(',')
        .map(term => term.trim())
        .filter(term => term.length > 0);
      
      const searchRequest = {
        documentContent,
        jurisdiction: country,
        legalClauses: extractedTerms,
        searchTerms: customTermsList
      };

      const results = await deepSearchService.performDeepSearch(searchRequest);
      setSearchResults(results.results);
    } catch (err: any) {
      console.error('DeepSearch error:', err);
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleAskForClarification = async (result: DeepSearchResult, question: string): Promise<void> => {
    try {
      const clarification = await deepSearchService.getClarification(result, question);
      // In a real implementation, this would update the UI with the clarification
      console.log('Clarification received:', clarification);
      return Promise.resolve();
    } catch (error) {
      console.error('Error getting clarification:', error);
      return Promise.reject(error);
    }
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
                <div className="bg-blue-100/20 p-2 rounded-lg backdrop-blur-sm">
                  <Search className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white text-enhanced-contrast">DeepSearch</h1>
                  <p className="text-sm text-gray-300 text-enhanced-contrast">AI-powered legal research</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={checkConfiguration}
                className="flex items-center space-x-1 text-white hover:text-gray-300 transition-colors text-enhanced-contrast"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm">Refresh</span>
              </button>
              <div className="text-sm text-gray-300 text-enhanced-contrast">
                Jurisdiction: {country}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Banner */}
      <div className="bg-blue-500/10 backdrop-blur-sm border-b border-blue-200/20 px-4 py-3 content-layer">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-200 text-enhanced-contrast">DeepSearch: AI-Powered Legal Research</h3>
              <p className="text-sm text-blue-300 mt-1 text-enhanced-contrast">
                Upload legal documents to find relevant case law, statutes, and articles. DeepSearch acts like a paralegal, 
                performing deep internet research to provide jurisdiction-specific legal resources.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 content-layer">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-white/20">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'upload', label: 'Upload & Search', icon: Upload },
                { id: 'history', label: 'Search History', icon: History }
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors text-enhanced-contrast ${
                      activeTab === tab.id
                        ? 'border-blue-400 text-blue-400'
                        : 'border-transparent text-gray-400 hover:text-white hover:border-white/30'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {activeTab === 'upload' && (
          <div className="space-y-8">
            {/* Upload Section */}
            <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-sm border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 text-enhanced-contrast">Upload Document for Legal Research</h2>
              
              {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-300 text-sm text-enhanced-contrast">{error}</p>
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors backdrop-blur-sm ${
                  dragActive ? 'border-blue-400/50 bg-blue-500/10' : 'border-white/20 bg-white/5'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-white mb-2 text-enhanced-contrast">
                  {uploadedFile ? uploadedFile.name : 'Drop your legal document here'}
                </p>
                <p className="text-sm text-gray-400 mb-4 text-enhanced-contrast">
                  Supports TXT, DOC, DOCX formats up to 10MB
                </p>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".txt,.doc,.docx"
                  onChange={handleFileSelect}
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer font-medium"
                >
                  Choose File
                </label>
              </div>

              {/* Document Preview */}
              {uploadedFile && documentContent && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-white text-enhanced-contrast">Document Preview</h3>
                    <button
                      onClick={() => setShowDocumentPreview(!showDocumentPreview)}
                      className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {showDocumentPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="text-sm">{showDocumentPreview ? 'Hide' : 'Show'} Preview</span>
                    </button>
                  </div>

                  {showDocumentPreview && (
                    <div className="bg-white/5 border border-white/20 rounded-lg p-4 max-h-64 overflow-y-auto custom-scrollbar backdrop-blur-sm">
                      <div className="text-sm text-gray-300 whitespace-pre-wrap text-enhanced-contrast">
                        {documentContent.substring(0, 2000) + (documentContent.length > 2000 ? '...' : '')}
                      </div>
                    </div>
                  )}

                  {/* Extracted Legal Terms */}
                  {extractedTerms.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-white mb-2 text-enhanced-contrast">Extracted Legal Terms</h4>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {extractedTerms.map((term, index) => (
                          <span 
                            key={index}
                            className="px-3 py-1 text-sm rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Search Terms */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2 text-enhanced-contrast">
                      Add Custom Search Terms (comma separated)
                    </label>
                    <input
                      type="text"
                      value={customSearchTerms}
                      onChange={(e) => setCustomSearchTerms(e.target.value)}
                      placeholder="e.g., breach of contract, damages, liability"
                      className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mt-4 backdrop-blur-sm">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-blue-400" />
                      <div>
                        <p className="font-medium text-blue-200 text-enhanced-contrast">{uploadedFile.name}</p>
                        <p className="text-sm text-blue-300 text-enhanced-contrast">
                          Ready for DeepSearch
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        setDocumentContent('');
                        setExtractedTerms([]);
                        setCustomSearchTerms('');
                      }}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex justify-center">
                    <DeepSearchButton
                      onClick={handleDeepSearch}
                      isLoading={searching}
                      isDisabled={!configStatus?.configured || !uploadedFile}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* DeepSearch Features */}
            <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-sm border border-white/10 p-6">
              <h3 className="font-semibold text-white mb-4 text-enhanced-contrast">DeepSearch Features</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Scale className="h-5 w-5 text-blue-400" />
                    <h4 className="font-medium text-blue-200 text-enhanced-contrast">Case Law</h4>
                  </div>
                  <p className="text-sm text-blue-300 text-enhanced-contrast">
                    Find relevant court cases and legal precedents that apply to your document's legal context.
                  </p>
                </div>
                
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Book className="h-5 w-5 text-green-400" />
                    <h4 className="font-medium text-green-200 text-enhanced-contrast">Statutes & Regulations</h4>
                  </div>
                  <p className="text-sm text-green-300 text-enhanced-contrast">
                    Discover applicable laws, statutes, and regulations specific to your jurisdiction.
                  </p>
                </div>
                
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Newspaper className="h-5 w-5 text-purple-400" />
                    <h4 className="font-medium text-purple-200 text-enhanced-contrast">Articles & News</h4>
                  </div>
                  <p className="text-sm text-purple-300 text-enhanced-contrast">
                    Access recent legal articles, blog posts, and news relevant to your document's subject matter.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 space-y-3">
                <div className="flex items-center">
                  <Target className="h-4 w-4 text-blue-400 mr-3 flex-shrink-0" />
                  <span className="text-gray-300 text-enhanced-contrast">AI-enhanced relevance scoring for accurate results</span>
                </div>
                <div className="flex items-center">
                  <Target className="h-4 w-4 text-blue-400 mr-3 flex-shrink-0" />
                  <span className="text-gray-300 text-enhanced-contrast">Jurisdiction-specific search to ensure applicable law</span>
                </div>
                <div className="flex items-center">
                  <Target className="h-4 w-4 text-blue-400 mr-3 flex-shrink-0" />
                  <span className="text-gray-300 text-enhanced-contrast">Ask AI for clarification on any search result</span>
                </div>
                <div className="flex items-center">
                  <Target className="h-4 w-4 text-blue-400 mr-3 flex-shrink-0" />
                  <span className="text-gray-300 text-enhanced-contrast">Direct links to original sources for further research</span>
                </div>
              </div>
            </div>

            {/* Search Results */}
            {(searchResults.length > 0 || searching) && (
              <DeepSearchPanel
                results={searchResults}
                isLoading={searching}
                error={error}
                onAskForClarification={handleAskForClarification}
                onClose={() => setSearchResults([])}
              />
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-sm border border-white/10 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 text-enhanced-contrast">Search History</h2>
            
            {loadingHistory ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
                <p className="text-gray-400 text-enhanced-contrast">Loading history...</p>
              </div>
            ) : searchHistory.length > 0 ? (
              <div className="space-y-4">
                {/* Search history items would go here */}
                <p className="text-gray-300 text-enhanced-contrast">Search history items</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 text-enhanced-contrast">No search history found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}