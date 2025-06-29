import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FileText, Upload, AlertTriangle, CheckCircle, Loader2, Download, History, Trash2, Info, Eye, EyeOff, Search } from 'lucide-react';
import { documentAnalysisService, DocumentAnalysisResult } from '../services/documentAnalysis';
import { ReportExportService } from '../services/reportExport';
import { useTokenCheck } from '../hooks/useTokenCheck';
import { InsufficientTokensModal } from '../components/subscription/InsufficientTokensModal';
import { DeepSearchButton } from '../components/deepsearch/DeepSearchButton';
import { DeepSearchPanel } from '../components/deepsearch/DeepSearchPanel';
import { deepSearchService, DeepSearchResult } from '../services/deepSearchService';

interface DocumentAnalysisPageProps {
  onBack: () => void;
  country: string;
}

export function DocumentAnalysisPage({ onBack, country }: DocumentAnalysisPageProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [analysisHistory, setAnalysisHistory] = useState<DocumentAnalysisResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [searchResults, setSearchResults] = useState<DeepSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [historyLoadAttempted, setHistoryLoadAttempted] = useState(false);
  
  const { 
    checkAndDeductTokens, 
    isCheckingTokens,
    showInsufficientTokensModal,
    closeInsufficientTokensModal,
    handleUpgradeSubscription,
    currentFeature
  } = useTokenCheck();

  useEffect(() => {
    checkConfiguration();
  }, []);

  useEffect(() => {
    if (activeTab === 'history' && !historyLoadAttempted) {
      loadAnalysisHistory();
      setHistoryLoadAttempted(true);
    }
  }, [activeTab, historyLoadAttempted]);

  const checkConfiguration = async () => {
    try {
      const status = await documentAnalysisService.getConfigurationStatus();
      setConfigStatus(status);
    } catch (error) {
      console.error('Error checking configuration:', error);
      setConfigStatus({
        configured: false,
        message: 'Failed to check document analysis configuration'
      });
    }
  };

  const loadAnalysisHistory = async () => {
    setLoadingHistory(true);
    setError(null);
    try {
      console.log('Loading analysis history...');
      const history = await documentAnalysisService.getAnalysisHistory();
      console.log('Analysis history loaded:', history);
      setAnalysisHistory(history);
    } catch (error) {
      console.error('Error loading history:', error);
      setError('Failed to load analysis history. Please try again.');
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
      const content = await documentAnalysisService.extractTextFromFile(file);
      setDocumentContent(content);
    } catch (err: any) {
      setError(err.message);
      setUploadedFile(null);
      setDocumentContent('');
    }
  };

  const handleAnalyze = async () => {
    if (!uploadedFile || !documentContent) return;

    if (!configStatus?.configured) {
      setError('Document analysis is not configured. Please check your AI provider API keys in the environment variables.');
      return;
    }

    // Check if user has enough tokens
    const hasTokens = await checkAndDeductTokens('DOCUMENT_ANALYSIS', uploadedFile.name);
    if (!hasTokens) return;

    setAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await documentAnalysisService.analyzeDocument({
        content: documentContent,
        jurisdiction: country,
        analysisType: 'comprehensive',
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        fileType: uploadedFile.type
      });

      setAnalysisResult(result);
      // Refresh history after successful analysis
      loadAnalysisHistory();
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeepSearch = async () => {
    if (!analysisResult || !documentContent) return;

    setSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      // Extract legal terms from document
      const legalTerms = await deepSearchService.extractLegalTerms(documentContent, country);
      
      // Perform deep search
      const searchRequest = {
        documentContent,
        jurisdiction: country,
        legalClauses: legalTerms,
        searchTerms: []
      };

      const results = await deepSearchService.performDeepSearch(searchRequest);
      setSearchResults(results.results);
    } catch (err: any) {
      console.error('DeepSearch error:', err);
      setSearchError(err.message || 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleAskForClarification = async (result: DeepSearchResult, question: string): Promise<void> => {
    try {
      const clarification = await deepSearchService.getClarification(result, question);
      return Promise.resolve(clarification);
    } catch (error) {
      console.error('Error getting clarification:', error);
      return Promise.reject(error);
    }
  };

  const handleExportPDF = async () => {
    if (!analysisResult) return;
    
    try {
      await ReportExportService.exportToPDF(analysisResult);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setError('Failed to export report to PDF. Please try again.');
    }
  };

  const handleExportJSON = async () => {
    if (!analysisResult) return;
    
    try {
      await ReportExportService.exportToJSON(analysisResult);
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      setError('Failed to export report to JSON. Please try again.');
    }
  };

  const handleDeleteAnalysis = async (id: string) => {
    try {
      const success = await documentAnalysisService.deleteAnalysis(id);
      if (success) {
        await loadAnalysisHistory();
      } else {
        setError('Failed to delete analysis. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting analysis:', error);
      setError('Failed to delete analysis. Please try again.');
    }
  };

  const handleViewHistoryItem = (result: DocumentAnalysisResult) => {
    setAnalysisResult(result);
    setActiveTab('upload');
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'bg-emerald text-off-white';
      case 'MEDIUM':
        return 'bg-deep-bronze text-off-white';
      case 'HIGH':
        return 'bg-legal-red text-off-white';
      case 'CRITICAL':
        return 'bg-legal-red text-off-white';
      default:
        return 'bg-cool-gray text-off-white';
    }
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
                  <FileText className="h-5 w-5 text-sapphire-blue" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-off-white">Document Analysis</h1>
                  <p className="text-sm text-cool-gray">AI-powered legal document review</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {configStatus?.configured ? (
                <div className="flex items-center space-x-2 bg-emerald/20 px-3 py-1 rounded-full border border-emerald/30">
                  <div className="w-2 h-2 bg-emerald rounded-full"></div>
                  <span className="text-sm font-medium text-emerald">Analysis Ready</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-deep-bronze/20 px-3 py-1 rounded-full border border-deep-bronze/30">
                  <div className="w-2 h-2 bg-deep-bronze rounded-full"></div>
                  <span className="text-sm font-medium text-deep-bronze">Configuration Required</span>
                </div>
              )}
              <div className="text-sm text-cool-gray">
                Jurisdiction: {country}
              </div>
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
                { id: 'upload', label: 'Document Analysis', icon: FileText },
                { id: 'history', label: 'Analysis History', icon: History }
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
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
              <h2 className="text-xl font-semibold text-off-white mb-4">Upload Legal Document</h2>
              
              {error && (
                <div className="mb-4 bg-legal-red/10 border border-legal-red/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
                  <AlertTriangle className="h-5 w-5 text-legal-red mt-0.5 flex-shrink-0" />
                  <p className="text-legal-red/90 text-sm">{error}</p>
                </div>
              )}

              {!analysisResult && (
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
              )}

              {/* Document Preview */}
              {uploadedFile && documentContent && !analysisResult && (
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

                  <div className="flex items-center justify-between p-3 bg-sapphire-blue/10 border border-sapphire-blue/20 rounded-lg mt-4 backdrop-blur-sm">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-sapphire-blue" />
                      <div>
                        <p className="font-medium text-off-white">{uploadedFile.name}</p>
                        <p className="text-sm text-cool-gray">
                          {(uploadedFile.size / 1024).toFixed(1)} KB • {uploadedFile.type.split('/')[1].toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        setDocumentContent('');
                      }}
                      className="text-cool-gray hover:text-off-white transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={handleAnalyze}
                      disabled={analyzing || !configStatus?.configured || !uploadedFile}
                      className="bg-sapphire-blue text-off-white px-6 py-3 rounded-lg hover:bg-sapphire-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center space-x-2"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="h-5 w-5" />
                          <span>Analyze Document</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Analysis Result */}
              {analysisResult && (
                <div className="mt-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-off-white">Analysis Results</h3>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleExportPDF}
                        className="flex items-center space-x-2 bg-charcoal-gray/50 text-off-white px-3 py-2 rounded-lg hover:bg-charcoal-gray/70 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        <span className="text-sm">Export PDF</span>
                      </button>
                      <button
                        onClick={handleExportJSON}
                        className="flex items-center space-x-2 bg-charcoal-gray/50 text-off-white px-3 py-2 rounded-lg hover:bg-charcoal-gray/70 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        <span className="text-sm">Export JSON</span>
                      </button>
                      <button
                        onClick={() => setAnalysisResult(null)}
                        className="flex items-center space-x-2 bg-legal-red/20 text-legal-red px-3 py-2 rounded-lg hover:bg-legal-red/30 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="text-sm">Clear</span>
                      </button>
                    </div>
                  </div>

                  {/* Document Info */}
                  <div className="bg-charcoal-gray/50 rounded-lg p-4 backdrop-blur-sm">
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-cool-gray" />
                        <span className="text-sm text-cool-gray">{analysisResult.documentInfo.fileName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Info className="h-5 w-5 text-cool-gray" />
                        <span className="text-sm text-cool-gray">{analysisResult.documentInfo.jurisdiction}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getRiskLevelColor(analysisResult.riskAssessment.level)}`}>
                          {analysisResult.riskAssessment.level} RISK
                        </span>
                        <span className="text-sm text-cool-gray">Score: {analysisResult.riskAssessment.score}/10</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-charcoal-gray/50 rounded-lg p-6 backdrop-blur-sm">
                    <h4 className="text-lg font-medium text-off-white mb-3">Executive Summary</h4>
                    <p className="text-cool-gray">{analysisResult.summary}</p>
                  </div>

                  {/* Risk Assessment */}
                  <div className="bg-charcoal-gray/50 rounded-lg p-6 backdrop-blur-sm">
                    <h4 className="text-lg font-medium text-off-white mb-3">Risk Assessment</h4>
                    
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      {analysisResult.riskAssessment.serviceProviderRisks && (
                        <div className="bg-legal-red/10 rounded-lg p-4 border border-legal-red/20">
                          <h5 className="font-medium text-legal-red mb-2">Service Provider Risks</h5>
                          <ul className="space-y-1 text-sm text-cool-gray">
                            {analysisResult.riskAssessment.serviceProviderRisks.map((risk, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-legal-red rounded-full mt-1.5 flex-shrink-0"></div>
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysisResult.riskAssessment.clientRisks && (
                        <div className="bg-deep-bronze/10 rounded-lg p-4 border border-deep-bronze/20">
                          <h5 className="font-medium text-deep-bronze mb-2">Client Risks</h5>
                          <ul className="space-y-1 text-sm text-cool-gray">
                            {analysisResult.riskAssessment.clientRisks.map((risk, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-deep-bronze rounded-full mt-1.5 flex-shrink-0"></div>
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysisResult.riskAssessment.mutualRisks && (
                        <div className="bg-regal-purple/10 rounded-lg p-4 border border-regal-purple/20">
                          <h5 className="font-medium text-regal-purple mb-2">Mutual Risks</h5>
                          <ul className="space-y-1 text-sm text-cool-gray">
                            {analysisResult.riskAssessment.mutualRisks.map((risk, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-regal-purple rounded-full mt-1.5 flex-shrink-0"></div>
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {!analysisResult.riskAssessment.serviceProviderRisks && !analysisResult.riskAssessment.clientRisks && analysisResult.riskAssessment.factors && (
                        <div className="bg-sapphire-blue/10 rounded-lg p-4 border border-sapphire-blue/20">
                          <h5 className="font-medium text-sapphire-blue mb-2">Risk Factors</h5>
                          <ul className="space-y-1 text-sm text-cool-gray">
                            {analysisResult.riskAssessment.factors.map((factor, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-sapphire-blue rounded-full mt-1.5 flex-shrink-0"></div>
                                <span>{factor}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Key Findings */}
                  {analysisResult.keyFindings && analysisResult.keyFindings.length > 0 && (
                    <div className="bg-charcoal-gray/50 rounded-lg p-6 backdrop-blur-sm">
                      <h4 className="text-lg font-medium text-off-white mb-3">Key Findings</h4>
                      <div className="space-y-4">
                        {analysisResult.keyFindings.map((finding, index) => (
                          <div key={index} className="bg-charcoal-gray/70 rounded-lg p-4 border border-sapphire-blue/20">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-off-white">{finding.category}</h5>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  finding.severity === 'critical' ? 'bg-legal-red/20 text-legal-red' :
                                  finding.severity === 'warning' ? 'bg-deep-bronze/20 text-deep-bronze' :
                                  'bg-sapphire-blue/20 text-sapphire-blue'
                                }`}>
                                  {finding.severity.toUpperCase()}
                                </span>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  finding.affectedParty === 'service_provider' ? 'bg-regal-purple/20 text-regal-purple' :
                                  finding.affectedParty === 'client' ? 'bg-emerald/20 text-emerald' :
                                  'bg-sapphire-blue/20 text-sapphire-blue'
                                }`}>
                                  {finding.affectedParty.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <p className="text-cool-gray">{finding.finding}</p>
                            {finding.impact && (
                              <p className="text-sm text-cool-gray mt-2">
                                <span className="font-medium text-off-white/90">Impact:</span> {finding.impact}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysisResult.recommendations && (
                    <div className="bg-charcoal-gray/50 rounded-lg p-6 backdrop-blur-sm">
                      <h4 className="text-lg font-medium text-off-white mb-3">Recommendations</h4>
                      <div className="space-y-4">
                        {Array.isArray(analysisResult.recommendations) && analysisResult.recommendations.length > 0 ? (
                          typeof analysisResult.recommendations[0] === 'string' ? (
                            <ul className="space-y-2 text-cool-gray">
                              {analysisResult.recommendations.map((rec, index) => (
                                <li key={index} className="flex items-start space-x-2">
                                  <div className="w-1.5 h-1.5 bg-emerald rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            analysisResult.recommendations.map((rec: any, index) => (
                              <div key={index} className="bg-emerald/10 rounded-lg p-4 border border-emerald/20">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-emerald">{rec.category || 'Recommendation'}</h5>
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      rec.priority === 'critical' ? 'bg-legal-red/20 text-legal-red' :
                                      rec.priority === 'high' ? 'bg-deep-bronze/20 text-deep-bronze' :
                                      rec.priority === 'medium' ? 'bg-sapphire-blue/20 text-sapphire-blue' :
                                      'bg-emerald/20 text-emerald'
                                    }`}>
                                      {rec.priority?.toUpperCase() || 'MEDIUM'}
                                    </span>
                                    {rec.targetParty && (
                                      <span className={`px-2 py-1 text-xs rounded-full ${
                                        rec.targetParty === 'service_provider' ? 'bg-regal-purple/20 text-regal-purple' :
                                        rec.targetParty === 'client' ? 'bg-sapphire-blue/20 text-sapphire-blue' :
                                        'bg-cool-gray/20 text-cool-gray'
                                      }`}>
                                        {rec.targetParty.replace('_', ' ').toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className="text-cool-gray">{rec.recommendation}</p>
                                {rec.implementation && (
                                  <p className="text-sm text-cool-gray mt-2">
                                    <span className="font-medium text-off-white/90">Implementation:</span> {rec.implementation}
                                  </p>
                                )}
                              </div>
                            ))
                          )
                        ) : (
                          <p className="text-cool-gray">No specific recommendations provided.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Next Steps */}
                  {analysisResult.nextSteps && (
                    <div className="bg-charcoal-gray/50 rounded-lg p-6 backdrop-blur-sm">
                      <h4 className="text-lg font-medium text-off-white mb-3">Next Steps</h4>
                      
                      {analysisResult.nextSteps.immediate && analysisResult.nextSteps.immediate.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium text-sapphire-blue mb-2">Immediate Actions</h5>
                          <ul className="space-y-1 text-cool-gray">
                            {analysisResult.nextSteps.immediate.map((step, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-legal-red rounded-full mt-1.5 flex-shrink-0"></div>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysisResult.nextSteps.shortTerm && analysisResult.nextSteps.shortTerm.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium text-deep-bronze mb-2">Short-term Actions (30 days)</h5>
                          <ul className="space-y-1 text-cool-gray">
                            {analysisResult.nextSteps.shortTerm.map((step, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-deep-bronze rounded-full mt-1.5 flex-shrink-0"></div>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysisResult.nextSteps.longTerm && analysisResult.nextSteps.longTerm.length > 0 && (
                        <div>
                          <h5 className="font-medium text-emerald mb-2">Long-term Actions</h5>
                          <ul className="space-y-1 text-cool-gray">
                            {analysisResult.nextSteps.longTerm.map((step, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-emerald rounded-full mt-1.5 flex-shrink-0"></div>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Handle legacy format */}
                      {!analysisResult.nextSteps.immediate && Array.isArray(analysisResult.nextSteps) && (
                        <ul className="space-y-1 text-cool-gray">
                          {analysisResult.nextSteps.map((step, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <div className="w-1.5 h-1.5 bg-sapphire-blue rounded-full mt-1.5 flex-shrink-0"></div>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* DeepSearch Button */}
                  <div className="flex justify-center mt-8">
                    <DeepSearchButton
                      onClick={handleDeepSearch}
                      isLoading={searching}
                      isDisabled={!configStatus?.configured || !analysisResult}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Search Results */}
            {(searchResults.length > 0 || searching) && (
              <DeepSearchPanel
                results={searchResults}
                isLoading={searching}
                error={searchError}
                onAskForClarification={handleAskForClarification}
                onClose={() => setSearchResults([])}
              />
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-charcoal-gray/70 backdrop-blur-xl rounded-xl shadow-sm border border-sapphire-blue/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-off-white">Analysis History</h2>
              <button 
                onClick={loadAnalysisHistory}
                className="flex items-center space-x-2 bg-sapphire-blue/20 text-sapphire-blue px-3 py-2 rounded-lg hover:bg-sapphire-blue/30 transition-colors"
              >
                <History className="h-4 w-4" />
                <span className="text-sm">Refresh History</span>
              </button>
            </div>
            
            {loadingHistory ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-sapphire-blue" />
                <p className="text-cool-gray">Loading history...</p>
              </div>
            ) : error ? (
              <div className="bg-legal-red/10 border border-legal-red/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
                <AlertTriangle className="h-5 w-5 text-legal-red mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-legal-red/90 text-sm">{error}</p>
                  <button 
                    onClick={loadAnalysisHistory}
                    className="text-legal-red hover:text-legal-red/80 text-sm mt-2 underline"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : analysisHistory.length > 0 ? (
              <div className="space-y-4">
                {analysisHistory.map((analysis) => (
                  <div 
                    key={analysis.id} 
                    className="bg-charcoal-gray/50 rounded-lg p-4 border border-sapphire-blue/20 hover:bg-charcoal-gray/70 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="bg-sapphire-blue/20 p-2 rounded-lg">
                          <FileText className="h-5 w-5 text-sapphire-blue" />
                        </div>
                        <div>
                          <h3 className="font-medium text-off-white">{analysis.documentInfo.fileName}</h3>
                          <div className="flex items-center space-x-2 mt-1 text-xs text-cool-gray">
                            <span>{analysis.documentInfo.jurisdiction}</span>
                            <span>•</span>
                            <span>{new Date(analysis.documentInfo.analysisDate).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className={`px-2 py-0.5 rounded-full ${getRiskLevelColor(analysis.riskAssessment.level)}`}>
                              {analysis.riskAssessment.level}
                            </span>
                          </div>
                          <p className="text-sm text-cool-gray mt-2 line-clamp-2">{analysis.summary}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewHistoryItem(analysis)}
                          className="text-sapphire-blue hover:text-sapphire-blue/80 transition-colors p-2"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAnalysis(analysis.id!)}
                          className="text-legal-red hover:text-legal-red/80 transition-colors p-2"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-cool-gray mx-auto mb-4" />
                <p className="text-cool-gray">No analysis history found</p>
                <p className="text-cool-gray/70 text-sm mt-2">
                  Upload and analyze documents to see your history here
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Insufficient Tokens Modal */}
      <InsufficientTokensModal
        isOpen={showInsufficientTokensModal}
        onClose={closeInsufficientTokensModal}
        feature={currentFeature || 'DOCUMENT_ANALYSIS'}
        onUpgrade={handleUpgradeSubscription}
      />
    </div>
  );
}