import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Upload, FileText, AlertCircle, CheckCircle, Loader2, Download, History, Trash2, Info, Eye, EyeOff, Target, Globe, Book, Newspaper, Scale } from 'lucide-react';
import { deepSearchService, DeepSearchResult } from '../services/deepSearchService';
import { DeepSearchPanel } from '../components/deepsearch/DeepSearchPanel';
import { DeepSearchButton } from '../components/deepsearch/DeepSearchButton';
import { useSmoothScroll } from '../hooks/useScrollPosition';

interface DeepSearchPageProps {
  onBack: () => void;
  country: string;
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
  
  // Use the smooth scroll hook
  const { scrollToTop } = useSmoothScroll();

  useEffect(() => {
    // Scroll to top when component mounts
    scrollToTop(false);
    checkConfiguration();
  }, [scrollToTop]);

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

  const handleTabChange = (tab: 'upload' | 'history') => {
    setActiveTab(tab);
    // Scroll to top when changing tabs
    scrollToTop(true);
  };

  return (
    <div className="min-h-screen bg-midnight-navy text-off-white relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {/* Base dark background */}
        <div className="absolute inset-0 bg-midnight-navy"></div>
        
        {/* Animated gradient orbs */}
        <div className="absolute inset-0">
          {/* Large orb 1 */}
          <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-charcoal-gray rounded-full opacity-30 blur-3xl animate-float"></div>
          
          {/* Large orb 2 */}
          <div className="absolute top-[20%] right-[-10%] w-80 h-80 bg-sapphire-blue rounded-full opacity-20 blur-3xl animate-float animation-delay-2000"></div>
          
          {/* Medium orb 3 */}
          <div className="absolute bottom-[10%] left-[20%] w-64 h-64 bg-regal-purple rounded-full opacity-15 blur-3xl animate-float animation-delay-4000"></div>
          
          {/* Medium orb 4 */}
          <div className="absolute top-[60%] right-[30%] w-72 h-72 bg-sapphire-blue rounded-full opacity-20 blur-3xl animate-float animation-delay-6000"></div>
          
          {/* Small orb 5 */}
          <div className="absolute bottom-[30%] right-[10%] w-48 h-48 bg-charcoal-gray rounded-full opacity-25 blur-2xl animate-float animation-delay-8000"></div>
          
          {/* Small orb 6 */}
          <div className="absolute top-[40%] left-[10%] w-56 h-56 bg-regal-purple rounded-full opacity-15 blur-2xl animate-float animation-delay-10000"></div>
          
          {/* Tiny floating particles */}
          <div className="absolute top-[15%] left-[60%] w-24 h-24 bg-sapphire-blue rounded-full opacity-10 blur-xl animate-float"></div>
          <div className="absolute bottom-[50%] left-[80%] w-32 h-32 bg-regal-purple rounded-full opacity-10 blur-xl animate-float animation-delay-3000"></div>
          <div className="absolute top-[80%] left-[40%] w-20 h-20 bg-sapphire-blue rounded-full opacity-10 blur-xl animate-float animation-delay-5000"></div>
        </div>
        
        {/* Grid overlay for professional look */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-midnight-navy/80 via-charcoal-gray/30 to-midnight-navy/60"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(224,225,221,0.03)_1px,transparent_1px),linear-gradient(to_right,rgba(224,225,221,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        </div>
      </div>
      
      {/* Header */}
      <div className="bg-charcoal-gray/70 backdrop-blur-xl border-b border-sapphire-blue/20 sticky top-0 z-40 relative">
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
              <div className="h-6 w-px bg-sapphire-blue/30" />
              <div className="flex items-center space-x-3">
                <div className="bg-sapphire-blue/20 p-2 rounded-lg backdrop-blur-sm">
                  <Search className="h-5 w-5 text-sapphire-blue" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-off-white">DeepSearch</h1>
                  <p className="text-sm text-cool-gray">AI-powered legal research</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={checkConfiguration}
                className="flex items-center space-x-1 text-cool-gray hover:text-off-white transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm">Refresh</span>
              </button>
              <div className="text-sm text-cool-gray">
                Jurisdiction: {country}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Banner */}
      <div className="bg-sapphire-blue/10 backdrop-blur-sm border-b border-sapphire-blue/20 px-4 py-3 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-sapphire-blue mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-off-white">DeepSearch: AI-Powered Legal Research</h3>
              <p className="text-sm text-cool-gray mt-1">
                Upload legal documents to find relevant case law, statutes, and articles. DeepSearch acts like a paralegal, 
                performing deep internet research to provide jurisdiction-specific legal resources.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-sapphire-blue/20">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'upload', label: 'Upload & Search', icon: Upload },
                { id: 'history', label: 'Search History', icon: History }
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as any)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-sapphire-blue text-sapphire-blue'
                        : 'border-transparent text-cool-gray hover:text-off-white hover:border-cool-gray'
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
            <div className="bg-charcoal-gray/70 backdrop-blur-xl rounded-xl shadow-sm border border-sapphire-blue/20 p-6">
              <h2 className="text-xl font-semibold text-off-white mb-4">Upload Document for Legal Research</h2>
              
              {error && (
                <div className="mb-4 bg-legal-red/10 border border-legal-red/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
                  <AlertCircle className="h-5 w-5 text-legal-red mt-0.5 flex-shrink-0" />
                  <p className="text-legal-red/90 text-sm">{error}</p>
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors backdrop-blur-sm ${
                  dragActive ? 'border-sapphire-blue/50 bg-sapphire-blue/10' : 'border-sapphire-blue/20 bg-charcoal-gray/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-cool-gray mx-auto mb-4" />
                <p className="text-off-white mb-2">
                  {uploadedFile ? uploadedFile.name : 'Drop your legal document here'}
                </p>
                <p className="text-sm text-cool-gray mb-4">
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
                  className="inline-block bg-sapphire-blue text-off-white px-4 py-2 rounded-lg hover:bg-sapphire-blue/90 transition-colors cursor-pointer font-medium"
                >
                  Choose File
                </label>
              </div>

              {/* Document Preview */}
              {uploadedFile && documentContent && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-off-white">Document Preview</h3>
                    <button
                      onClick={() => setShowDocumentPreview(!showDocumentPreview)}
                      className="flex items-center space-x-2 text-sapphire-blue hover:text-sapphire-blue/80 transition-colors"
                    >
                      {showDocumentPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="text-sm">{showDocumentPreview ? 'Hide' : 'Show'} Preview</span>
                    </button>
                  </div>

                  {showDocumentPreview && (
                    <div className="bg-charcoal-gray/50 border border-sapphire-blue/20 rounded-lg p-4 max-h-64 overflow-y-auto custom-scrollbar backdrop-blur-sm">
                      <div className="text-sm text-cool-gray whitespace-pre-wrap">
                        {documentContent.substring(0, 2000) + (documentContent.length > 2000 ? '...' : '')}
                      </div>
                    </div>
                  )}

                  {/* Extracted Legal Terms */}
                  {extractedTerms.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-off-white mb-2">Extracted Legal Terms</h4>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {extractedTerms.map((term, index) => (
                          <span 
                            key={index}
                            className="px-3 py-1 text-sm rounded-full bg-sapphire-blue/10 text-sapphire-blue border border-sapphire-blue/30"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Search Terms */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-off-white/90 mb-2">
                      Add Custom Search Terms (comma separated)
                    </label>
                    <input
                      type="text"
                      value={customSearchTerms}
                      onChange={(e) => setCustomSearchTerms(e.target.value)}
                      placeholder="e.g., breach of contract, damages, liability"
                      className="w-full bg-charcoal-gray/50 border border-sapphire-blue/30 rounded-lg px-3 py-2 text-off-white placeholder-cool-gray focus:ring-2 focus:ring-sapphire-blue focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-sapphire-blue/10 border border-sapphire-blue/20 rounded-lg mt-4 backdrop-blur-sm">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-sapphire-blue" />
                      <div>
                        <p className="font-medium text-off-white">{uploadedFile.name}</p>
                        <p className="text-sm text-cool-gray">
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
                      className="text-cool-gray hover:text-off-white transition-colors"
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
            <div className="bg-charcoal-gray/70 backdrop-blur-xl rounded-xl shadow-sm border border-sapphire-blue/20 p-6">
              <h3 className="font-semibold text-off-white mb-4">DeepSearch Features</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-sapphire-blue/10 border border-sapphire-blue/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Scale className="h-5 w-5 text-sapphire-blue" />
                    <h4 className="font-medium text-off-white">Case Law</h4>
                  </div>
                  <p className="text-sm text-cool-gray">
                    Find relevant court cases and legal precedents that apply to your document's legal context.
                  </p>
                </div>
                
                <div className="bg-emerald/10 border border-emerald/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Book className="h-5 w-5 text-emerald" />
                    <h4 className="font-medium text-off-white">Statutes & Regulations</h4>
                  </div>
                  <p className="text-sm text-cool-gray">
                    Discover applicable laws, statutes, and regulations specific to your jurisdiction.
                  </p>
                </div>
                
                <div className="bg-regal-purple/10 border border-regal-purple/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Newspaper className="h-5 w-5 text-regal-purple" />
                    <h4 className="font-medium text-off-white">Articles & News</h4>
                  </div>
                  <p className="text-sm text-cool-gray">
                    Access recent legal articles, blog posts, and news relevant to your document's subject matter.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 space-y-3">
                <div className="flex items-center">
                  <Target className="h-4 w-4 text-sapphire-blue mr-3 flex-shrink-0" />
                  <span className="text-cool-gray">AI-enhanced relevance scoring for accurate results</span>
                </div>
                <div className="flex items-center">
                  <Target className="h-4 w-4 text-sapphire-blue mr-3 flex-shrink-0" />
                  <span className="text-cool-gray">Jurisdiction-specific search to ensure applicable law</span>
                </div>
                <div className="flex items-center">
                  <Target className="h-4 w-4 text-sapphire-blue mr-3 flex-shrink-0" />
                  <span className="text-cool-gray">Ask AI for clarification on any search result</span>
                </div>
                <div className="flex items-center">
                  <Target className="h-4 w-4 text-sapphire-blue mr-3 flex-shrink-0" />
                  <span className="text-cool-gray">Direct links to original sources for further research</span>
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
          <div className="bg-charcoal-gray/70 backdrop-blur-xl rounded-xl shadow-sm border border-sapphire-blue/20 p-6">
            <h2 className="text-xl font-semibold text-off-white mb-6">Search History</h2>
            
            {loadingHistory ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-sapphire-blue" />
                <p className="text-cool-gray">Loading history...</p>
              </div>
            ) : searchHistory.length > 0 ? (
              <div className="space-y-4">
                {/* Search history items would go here */}
                <p className="text-cool-gray">Search history items</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-cool-gray mx-auto mb-4" />
                <p className="text-cool-gray">No search history found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// RefreshCw icon component
function RefreshCw({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}