import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, FileText, AlertTriangle, CheckCircle, Loader2, Download, History, Trash2, FolderOpen, RefreshCw, Info, Eye, EyeOff, AlertCircle, Target, Globe, Book, Newspaper, Scale, Clock, TrendingUp, Search } from 'lucide-react';
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext';
import { documentAnalysisService, DocumentAnalysisResult, BatchAnalysisResult } from '../services/documentAnalysis';
import { deepSearchService, DeepSearchResult } from '../services/deepSearchService';
import { ReportExportService } from '../services/reportExport';
import { DeepSearchPanel } from '../components/deepsearch/DeepSearchPanel';
import { DeepSearchButton } from '../components/deepsearch/DeepSearchButton';

interface DocumentAnalysisPageProps {
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

export function DocumentAnalysisPage({ onBack, country }: DocumentAnalysisPageProps) {
  const { user } = useFirebaseAuth();
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'batch' | 'history'>('upload');
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchAnalysisResult | null>(null);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [deepSearchResults, setDeepSearchResults] = useState<DeepSearchResult[]>([]);
  const [deepSearching, setDeepSearching] = useState(false);
  const [deepSearchError, setDeepSearchError] = useState<string | null>(null);
  const [showDeepSearchPanel, setShowDeepSearchPanel] = useState(false);
  
  // Analysis History State
  const [analysisHistory, setAnalysisHistory] = useState<DocumentAnalysisResult[]>([]);
  const [batchHistory, setBatchHistory] = useState<BatchAnalysisResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<DocumentAnalysisResult | null>(null);

  useEffect(() => {
    checkConfiguration();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadAnalysisHistory();
    }
  }, [activeTab]);

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
    try {
      const [docHistory, batchHist] = await Promise.all([
        documentAnalysisService.getAnalysisHistory(20),
        documentAnalysisService.getBatchAnalysisHistory(10)
      ]);
      setAnalysisHistory(docHistory);
      setBatchHistory(batchHist);
    } catch (error) {
      console.error('Error loading analysis history:', error);
      setError('Failed to load analysis history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteAnalysis = async (id: string) => {
    if (!confirm('Are you sure you want to delete this analysis?')) return;
    
    try {
      const success = await documentAnalysisService.deleteAnalysis(id);
      if (success) {
        setAnalysisHistory(prev => prev.filter(item => item.id !== id));
        if (selectedHistoryItem?.id === id) {
          setSelectedHistoryItem(null);
        }
      } else {
        setError('Failed to delete analysis');
      }
    } catch (error) {
      console.error('Error deleting analysis:', error);
      setError('Failed to delete analysis');
    }
  };

  const handleViewHistoryItem = (item: DocumentAnalysisResult) => {
    setSelectedHistoryItem(item);
    setAnalysisResult(item);
    setActiveTab('upload'); // Switch to main view to show the analysis
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

  const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(file => validateFile(file, false));
      setBatchFiles(validFiles);
      if (validFiles.length !== files.length) {
        setError(`${files.length - validFiles.length} files were skipped due to invalid format or size.`);
      } else {
        setError(null);
      }
    }
  };

  const validateFile = (file: File, showError = true) => {
    const allowedTypes = [
      'text/plain', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.type === 'application/pdf') {
      if (showError) {
        setError('PDF files are currently not supported. Please convert to DOC, DOCX, or TXT format for analysis.');
      }
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      if (showError) {
        setError('Please upload TXT, DOC, or DOCX files only. PDF support is temporarily unavailable.');
      }
      return false;
    }

    if (file.size > maxSize) {
      if (showError) {
        setError('File size must be less than 10MB.');
      }
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
      setSelectedHistoryItem(null); // Clear history selection when new analysis is done
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBatchAnalyze = async () => {
    if (batchFiles.length === 0) return;

    if (!configStatus?.configured) {
      setError('Document analysis is not configured. Please check your AI provider API keys in the environment variables.');
      return;
    }

    setBatchAnalyzing(true);
    setError(null);
    setBatchResult(null);

    try {
      const result = await documentAnalysisService.batchAnalyzeDocuments(batchFiles, country);
      setBatchResult(result);
    } catch (err: any) {
      console.error('Batch analysis error:', err);
      setError(err.message);
    } finally {
      setBatchAnalyzing(false);
    }
  };

  const handleDeepSearch = async () => {
    if (!uploadedFile || !documentContent) return;

    setDeepSearching(true);
    setDeepSearchError(null);
    setDeepSearchResults([]);

    try {
      const legalTerms = await deepSearchService.extractLegalTerms(documentContent, country);
      
      const searchRequest = {
        documentContent,
        jurisdiction: country,
        legalClauses: legalTerms,
        searchTerms: []
      };

      const results = await deepSearchService.performDeepSearch(searchRequest);
      setDeepSearchResults(results.results);
      setShowDeepSearchPanel(true);
    } catch (err: any) {
      console.error('DeepSearch error:', err);
      setDeepSearchError(err.message);
    } finally {
      setDeepSearching(false);
    }
  };

  const handleAskForClarification = async (result: DeepSearchResult, question: string): Promise<void> => {
    try {
      const clarification = await deepSearchService.getClarification(result, question);
      console.log('Clarification received:', clarification);
      return Promise.resolve();
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
      console.error('Export error:', error);
      setError('Failed to export PDF. Please try again.');
    }
  };

  const handleExportJSON = async () => {
    if (!analysisResult) return;
    
    try {
      await ReportExportService.exportToJSON(analysisResult);
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export JSON. Please try again.');
    }
  };

  const handleExportHTML = async () => {
    if (!analysisResult) return;
    
    try {
      await ReportExportService.exportToHTML(analysisResult);
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export HTML. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-emerald border-emerald/30 bg-emerald/10';
      case 'MEDIUM': return 'text-deep-bronze border-deep-bronze/30 bg-deep-bronze/10';
      case 'HIGH': return 'text-legal-red border-legal-red/30 bg-legal-red/10';
      case 'CRITICAL': return 'text-legal-red border-legal-red/30 bg-legal-red/20';
      default: return 'text-cool-gray border-cool-gray/30 bg-cool-gray/10';
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
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white text-enhanced-contrast">Document Analysis</h1>
                  <p className="text-sm text-gray-300 text-enhanced-contrast">AI-powered legal document review</p>
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
              <h3 className="font-medium text-blue-200 text-enhanced-contrast">Enhanced Document Analysis with AI</h3>
              <p className="text-sm text-blue-300 mt-1 text-enhanced-contrast">
                Upload legal documents for comprehensive risk assessment, clause analysis, and jurisdiction-specific guidance. 
                Includes performance metrics analysis and counterparty perspective evaluation.
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
                { id: 'upload', label: 'Single Analysis', icon: Upload },
                { id: 'batch', label: 'Batch Analysis', icon: FolderOpen },
                { id: 'history', label: 'Analysis History', icon: History }
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
              <h2 className="text-xl font-semibold text-white mb-4 text-enhanced-contrast">Upload Document for Analysis</h2>
              
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

                  <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mt-4 backdrop-blur-sm">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-blue-400" />
                      <div>
                        <p className="font-medium text-blue-200 text-enhanced-contrast">{uploadedFile.name}</p>
                        <p className="text-sm text-blue-300 text-enhanced-contrast">
                          Ready for analysis • {Math.round(uploadedFile.size / 1024)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        setDocumentContent('');
                        setAnalysisResult(null);
                        setSelectedHistoryItem(null);
                      }}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex justify-center space-x-4">
                    <button
                      onClick={handleAnalyze}
                      disabled={analyzing || !configStatus?.configured}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          <span>Analyze Document</span>
                        </>
                      )}
                    </button>

                    <DeepSearchButton
                      onClick={handleDeepSearch}
                      isLoading={deepSearching}
                      isDisabled={!configStatus?.configured || !uploadedFile}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Analysis Results */}
            {analysisResult && (
              <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-sm border border-white/10 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white text-enhanced-contrast">
                    Analysis Results
                    {selectedHistoryItem && (
                      <span className="text-sm text-blue-400 ml-2">(From History)</span>
                    )}
                  </h2>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-300 text-enhanced-contrast">Export:</span>
                      <button
                        onClick={handleExportPDF}
                        className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                      >
                        PDF
                      </button>
                      <button
                        onClick={handleExportJSON}
                        className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                      >
                        JSON
                      </button>
                      <button
                        onClick={handleExportHTML}
                        className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                      >
                        HTML
                      </button>
                    </div>
                  </div>
                </div>

                {/* Risk Assessment */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Risk Assessment</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-300 text-enhanced-contrast">Risk Level</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskLevelColor(analysisResult.riskAssessment.level)}`}>
                          {analysisResult.riskAssessment.level}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(analysisResult.riskAssessment.score / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-white font-medium text-enhanced-contrast">
                          {analysisResult.riskAssessment.score}/10
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                      <h4 className="font-medium text-white mb-2 text-enhanced-contrast">Document Info</h4>
                      <div className="space-y-1 text-sm text-gray-300 text-enhanced-contrast">
                        <p>File: {analysisResult.documentInfo.fileName}</p>
                        <p>Jurisdiction: {analysisResult.documentInfo.jurisdiction}</p>
                        <p>Analyzed: {formatDate(analysisResult.documentInfo.analysisDate)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Factors by Party */}
                {(analysisResult.riskAssessment.serviceProviderRisks || 
                  analysisResult.riskAssessment.clientRisks || 
                  analysisResult.riskAssessment.mutualRisks) && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Risk Analysis by Party</h3>
                    <div className="grid md:grid-cols-3 gap-6">
                      {analysisResult.riskAssessment.serviceProviderRisks && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                          <h4 className="font-medium text-red-200 mb-3 text-enhanced-contrast">Service Provider Risks</h4>
                          <ul className="space-y-2">
                            {analysisResult.riskAssessment.serviceProviderRisks.map((risk, index) => (
                              <li key={index} className="text-sm text-red-300 flex items-start space-x-2 text-enhanced-contrast">
                                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysisResult.riskAssessment.clientRisks && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                          <h4 className="font-medium text-blue-200 mb-3 text-enhanced-contrast">Client Risks</h4>
                          <ul className="space-y-2">
                            {analysisResult.riskAssessment.clientRisks.map((risk, index) => (
                              <li key={index} className="text-sm text-blue-300 flex items-start space-x-2 text-enhanced-contrast">
                                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysisResult.riskAssessment.mutualRisks && (
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                          <h4 className="font-medium text-purple-200 mb-3 text-enhanced-contrast">Mutual Risks</h4>
                          <ul className="space-y-2">
                            {analysisResult.riskAssessment.mutualRisks.map((risk, index) => (
                              <li key={index} className="text-sm text-purple-300 flex items-start space-x-2 text-enhanced-contrast">
                                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Executive Summary */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Executive Summary</h3>
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-gray-300 leading-relaxed text-enhanced-contrast">{analysisResult.summary}</p>
                  </div>
                </div>

                {/* Performance Metrics */}
                {analysisResult.performanceMetrics && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Performance Metrics & SLA Requirements</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <h4 className="font-medium text-blue-200 mb-3 text-enhanced-contrast">SLA Requirements</h4>
                        <div className="space-y-2 text-sm text-blue-300 text-enhanced-contrast">
                          <p><strong>Uptime:</strong> {analysisResult.performanceMetrics.slaRequirements.uptime}</p>
                          <p><strong>Response Time:</strong> {analysisResult.performanceMetrics.slaRequirements.responseTime}</p>
                          <p><strong>Availability:</strong> {analysisResult.performanceMetrics.slaRequirements.availability}</p>
                        </div>
                        {analysisResult.performanceMetrics.slaRequirements.performanceThresholds.length > 0 && (
                          <div className="mt-3">
                            <p className="font-medium text-blue-200 mb-2 text-enhanced-contrast">Performance Thresholds:</p>
                            <ul className="space-y-1">
                              {analysisResult.performanceMetrics.slaRequirements.performanceThresholds.map((threshold, index) => (
                                <li key={index} className="text-sm text-blue-300 text-enhanced-contrast">• {threshold}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <h4 className="font-medium text-green-200 mb-3 text-enhanced-contrast">Reporting & Penalties</h4>
                        <div className="space-y-2 text-sm text-green-300 text-enhanced-contrast">
                          <p><strong>Frequency:</strong> {analysisResult.performanceMetrics.reporting.frequency}</p>
                        </div>
                        {analysisResult.performanceMetrics.penalties.uptimePenalties.length > 0 && (
                          <div className="mt-3">
                            <p className="font-medium text-green-200 mb-2 text-enhanced-contrast">Uptime Penalties:</p>
                            <ul className="space-y-1">
                              {analysisResult.performanceMetrics.penalties.uptimePenalties.map((penalty, index) => (
                                <li key={index} className="text-sm text-green-300 text-enhanced-contrast">• {penalty}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Counterparty Analysis */}
                {analysisResult.counterpartyAnalysis && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Counterparty Perspective Analysis</h3>
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                        <h4 className="font-medium text-purple-200 mb-3 text-enhanced-contrast">Service Provider Perspective</h4>
                        
                        {analysisResult.counterpartyAnalysis.serviceProviderPerspective.advantages.length > 0 && (
                          <div className="mb-3">
                            <p className="font-medium text-purple-200 text-sm mb-2 text-enhanced-contrast">Advantages:</p>
                            <ul className="space-y-1">
                              {analysisResult.counterpartyAnalysis.serviceProviderPerspective.advantages.map((item, index) => (
                                <li key={index} className="text-sm text-purple-300 text-enhanced-contrast">• {item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {analysisResult.counterpartyAnalysis.serviceProviderPerspective.risks.length > 0 && (
                          <div>
                            <p className="font-medium text-purple-200 text-sm mb-2 text-enhanced-contrast">Risks:</p>
                            <ul className="space-y-1">
                              {analysisResult.counterpartyAnalysis.serviceProviderPerspective.risks.map((item, index) => (
                                <li key={index} className="text-sm text-purple-300 text-enhanced-contrast">• {item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <h4 className="font-medium text-green-200 mb-3 text-enhanced-contrast">Client Perspective</h4>
                        
                        {analysisResult.counterpartyAnalysis.clientPerspective.advantages.length > 0 && (
                          <div className="mb-3">
                            <p className="font-medium text-green-200 text-sm mb-2 text-enhanced-contrast">Advantages:</p>
                            <ul className="space-y-1">
                              {analysisResult.counterpartyAnalysis.clientPerspective.advantages.map((item, index) => (
                                <li key={index} className="text-sm text-green-300 text-enhanced-contrast">• {item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {analysisResult.counterpartyAnalysis.clientPerspective.risks.length > 0 && (
                          <div>
                            <p className="font-medium text-green-200 text-sm mb-2 text-enhanced-contrast">Risks:</p>
                            <ul className="space-y-1">
                              {analysisResult.counterpartyAnalysis.clientPerspective.risks.map((item, index) => (
                                <li key={index} className="text-sm text-green-300 text-enhanced-contrast">• {item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-200 mb-3 text-enhanced-contrast">Balance Assessment</h4>
                      <div className="space-y-2">
                        <p className="text-sm text-yellow-300 text-enhanced-contrast">
                          <strong>Overall:</strong> {analysisResult.counterpartyAnalysis.balanceAssessment.overall.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-sm text-yellow-300 text-enhanced-contrast">
                          {analysisResult.counterpartyAnalysis.balanceAssessment.reasoning}
                        </p>
                        {analysisResult.counterpartyAnalysis.balanceAssessment.recommendations.length > 0 && (
                          <div className="mt-3">
                            <p className="font-medium text-yellow-200 text-sm mb-2 text-enhanced-contrast">Rebalancing Recommendations:</p>
                            <ul className="space-y-1">
                              {analysisResult.counterpartyAnalysis.balanceAssessment.recommendations.map((rec, index) => (
                                <li key={index} className="text-sm text-yellow-300 text-enhanced-contrast">• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Key Findings */}
                {analysisResult.keyFindings && analysisResult.keyFindings.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Key Findings</h3>
                    <div className="space-y-4">
                      {analysisResult.keyFindings.map((finding, index) => (
                        <div key={index} className="bg-white/5 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-white text-enhanced-contrast">{finding.category}</h4>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                finding.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                                finding.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-blue-500/20 text-blue-300'
                              }`}>
                                {finding.severity.toUpperCase()}
                              </span>
                              {finding.affectedParty && (
                                <span className="px-2 py-1 rounded text-xs bg-gray-500/20 text-gray-300">
                                  {finding.affectedParty.replace('_', ' ').toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-300 mb-2 text-enhanced-contrast">{finding.finding}</p>
                          {finding.impact && (
                            <p className="text-sm text-gray-400 text-enhanced-contrast">
                              <strong>Impact:</strong> {finding.impact}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Problematic Clauses */}
                {analysisResult.problematicClauses && analysisResult.problematicClauses.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Problematic Clauses</h3>
                    <div className="space-y-4">
                      {analysisResult.problematicClauses.map((clause, index) => (
                        <div key={index} className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-red-200 text-enhanced-contrast">Issue {index + 1}</h4>
                            <div className="flex items-center space-x-2">
                              {clause.severity && (
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  clause.severity === 'critical' ? 'bg-red-500/30 text-red-200' :
                                  clause.severity === 'major' ? 'bg-red-500/20 text-red-300' :
                                  clause.severity === 'moderate' ? 'bg-yellow-500/20 text-yellow-300' :
                                  'bg-blue-500/20 text-blue-300'
                                }`}>
                                  {clause.severity.toUpperCase()}
                                </span>
                              )}
                              {clause.affectedParty && (
                                <span className="px-2 py-1 rounded text-xs bg-gray-500/20 text-gray-300">
                                  {clause.affectedParty.replace('_', ' ').toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <p className="text-red-300 text-enhanced-contrast">
                              <strong>Clause:</strong> "{clause.clause}"
                            </p>
                            <p className="text-red-300 text-enhanced-contrast">
                              <strong>Problem:</strong> {clause.issue}
                            </p>
                            <p className="text-red-300 text-enhanced-contrast">
                              <strong>Suggestion:</strong> {clause.suggestion}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Clauses */}
                {analysisResult.missingClauses && analysisResult.missingClauses.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Missing Protective Clauses</h3>
                    <div className="space-y-4">
                      {analysisResult.missingClauses.map((missing, index) => (
                        <div key={index} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-yellow-200 text-enhanced-contrast">{missing.clause}</h4>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                missing.importance === 'critical' ? 'bg-red-500/20 text-red-300' :
                                missing.importance === 'high' ? 'bg-yellow-500/20 text-yellow-300' :
                                missing.importance === 'medium' ? 'bg-blue-500/20 text-blue-300' :
                                'bg-gray-500/20 text-gray-300'
                              }`}>
                                {missing.importance.toUpperCase()}
                              </span>
                              <span className="px-2 py-1 rounded text-xs bg-gray-500/20 text-gray-300">
                                {missing.beneficiary.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <p className="text-yellow-300 text-sm text-enhanced-contrast">
                            <strong>Risk Mitigation:</strong> {missing.riskMitigation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {analysisResult.recommendations && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Recommendations</h3>
                    <div className="space-y-4">
                      {Array.isArray(analysisResult.recommendations) && analysisResult.recommendations.length > 0 ? (
                        typeof analysisResult.recommendations[0] === 'string' ? (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                            <ol className="space-y-2">
                              {analysisResult.recommendations.map((rec, index) => (
                                <li key={index} className="text-green-300 text-enhanced-contrast">
                                  {index + 1}. {rec}
                                </li>
                              ))}
                            </ol>
                          </div>
                        ) : (
                          analysisResult.recommendations.map((rec: any, index) => (
                            <div key={index} className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-green-200 text-enhanced-contrast">{rec.category || 'Recommendation'}</h4>
                                <div className="flex items-center space-x-2">
                                  {rec.priority && (
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      rec.priority === 'critical' ? 'bg-red-500/20 text-red-300' :
                                      rec.priority === 'high' ? 'bg-yellow-500/20 text-yellow-300' :
                                      rec.priority === 'medium' ? 'bg-blue-500/20 text-blue-300' :
                                      'bg-gray-500/20 text-gray-300'
                                    }`}>
                                      {rec.priority.toUpperCase()}
                                    </span>
                                  )}
                                  {rec.targetParty && (
                                    <span className="px-2 py-1 rounded text-xs bg-gray-500/20 text-gray-300">
                                      {rec.targetParty.replace('_', ' ').toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-green-300 mb-2 text-enhanced-contrast">{rec.recommendation}</p>
                              {rec.implementation && (
                                <p className="text-sm text-green-400 text-enhanced-contrast">
                                  <strong>Implementation:</strong> {rec.implementation}
                                </p>
                              )}
                            </div>
                          ))
                        )
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Legal Citations */}
                {analysisResult.legalCitations && analysisResult.legalCitations.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Legal Citations</h3>
                    <div className="bg-white/5 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                      <ul className="space-y-2">
                        {analysisResult.legalCitations.map((citation, index) => (
                          <li key={index} className="text-gray-300 flex items-start space-x-2 text-enhanced-contrast">
                            <Scale className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
                            <span>{citation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                {analysisResult.nextSteps && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Implementation Timeline</h3>
                    
                    {analysisResult.nextSteps.immediate || analysisResult.nextSteps.shortTerm || analysisResult.nextSteps.longTerm ? (
                      <div className="grid md:grid-cols-3 gap-6">
                        {analysisResult.nextSteps.immediate && analysisResult.nextSteps.immediate.length > 0 && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                            <h4 className="font-medium text-red-200 mb-3 flex items-center space-x-2 text-enhanced-contrast">
                              <Clock className="h-4 w-4" />
                              <span>Immediate Actions</span>
                            </h4>
                            <ol className="space-y-2">
                              {analysisResult.nextSteps.immediate.map((step, index) => (
                                <li key={index} className="text-sm text-red-300 text-enhanced-contrast">
                                  {index + 1}. {step}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {analysisResult.nextSteps.shortTerm && analysisResult.nextSteps.shortTerm.length > 0 && (
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                            <h4 className="font-medium text-yellow-200 mb-3 flex items-center space-x-2 text-enhanced-contrast">
                              <Clock className="h-4 w-4" />
                              <span>Short-term (30 days)</span>
                            </h4>
                            <ol className="space-y-2">
                              {analysisResult.nextSteps.shortTerm.map((step, index) => (
                                <li key={index} className="text-sm text-yellow-300 text-enhanced-contrast">
                                  {index + 1}. {step}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {analysisResult.nextSteps.longTerm && analysisResult.nextSteps.longTerm.length > 0 && (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                            <h4 className="font-medium text-green-200 mb-3 flex items-center space-x-2 text-enhanced-contrast">
                              <Clock className="h-4 w-4" />
                              <span>Long-term</span>
                            </h4>
                            <ol className="space-y-2">
                              {analysisResult.nextSteps.longTerm.map((step, index) => (
                                <li key={index} className="text-sm text-green-300 text-enhanced-contrast">
                                  {index + 1}. {step}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    ) : Array.isArray(analysisResult.nextSteps) && analysisResult.nextSteps.length > 0 ? (
                      <div className="bg-white/5 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                        <ol className="space-y-2">
                          {analysisResult.nextSteps.map((step, index) => (
                            <li key={index} className="text-gray-300 text-enhanced-contrast">
                              {index + 1}. {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Disclaimer */}
                <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                  <p className="text-sm text-gray-400 text-enhanced-contrast">
                    <strong>Disclaimer:</strong> This analysis is for informational purposes only and does not constitute legal advice. 
                    Please consult with a qualified attorney for specific legal matters in your jurisdiction.
                  </p>
                </div>
              </div>
            )}

            {/* DeepSearch Results */}
            {showDeepSearchPanel && (
              <DeepSearchPanel
                results={deepSearchResults}
                isLoading={deepSearching}
                error={deepSearchError}
                onAskForClarification={handleAskForClarification}
                onClose={() => setShowDeepSearchPanel(false)}
              />
            )}
          </div>
        )}

        {activeTab === 'batch' && (
          <div className="space-y-8">
            {/* Batch Upload Section */}
            <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-sm border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 text-enhanced-contrast">Batch Document Analysis</h2>
              
              {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-300 text-sm text-enhanced-contrast">{error}</p>
                </div>
              )}

              <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center bg-white/5 backdrop-blur-sm">
                <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-white mb-2 text-enhanced-contrast">
                  {batchFiles.length > 0 ? `${batchFiles.length} files selected` : 'Select multiple documents for batch analysis'}
                </p>
                <p className="text-sm text-gray-400 mb-4 text-enhanced-contrast">
                  Supports TXT, DOC, DOCX formats up to 10MB each
                </p>
                <input
                  type="file"
                  id="batch-file-upload"
                  className="hidden"
                  accept=".txt,.doc,.docx"
                  multiple
                  onChange={handleBatchFileSelect}
                />
                <label
                  htmlFor="batch-file-upload"
                  className="inline-block bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer font-medium"
                >
                  Choose Files
                </label>
              </div>

              {batchFiles.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium text-white mb-3 text-enhanced-contrast">Selected Files ({batchFiles.length})</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {batchFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white/5 border border-white/20 rounded-lg backdrop-blur-sm">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-4 w-4 text-blue-400" />
                          <span className="text-white text-sm text-enhanced-contrast">{file.name}</span>
                          <span className="text-gray-400 text-xs text-enhanced-contrast">({Math.round(file.size / 1024)} KB)</span>
                        </div>
                        <button
                          onClick={() => setBatchFiles(files => files.filter((_, i) => i !== index))}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={handleBatchAnalyze}
                      disabled={batchAnalyzing || !configStatus?.configured}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
                    >
                      {batchAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <FolderOpen className="h-4 w-4" />
                          <span>Analyze All Documents</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Batch Results */}
            {batchResult && (
              <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-sm border border-white/10 p-6">
                <h2 className="text-xl font-semibold text-white mb-4 text-enhanced-contrast">Batch Analysis Results</h2>
                
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="h-5 w-5 text-blue-400" />
                      <span className="font-medium text-blue-200 text-enhanced-contrast">Total Files</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-400">{batchResult.totalFiles}</p>
                  </div>
                  
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      <span className="font-medium text-green-200 text-enhanced-contrast">Completed</span>
                    </div>
                    <p className="text-2xl font-bold text-green-400">{batchResult.completedFiles}</p>
                  </div>
                  
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      <span className="font-medium text-red-200 text-enhanced-contrast">Errors</span>
                    </div>
                    <p className="text-2xl font-bold text-red-400">{batchResult.errors.length}</p>
                  </div>
                </div>

                {batchResult.errors.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium text-white mb-3 text-enhanced-contrast">Errors</h3>
                    <div className="space-y-2">
                      {batchResult.errors.map((error, index) => (
                        <div key={index} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                          <p className="text-red-300 text-sm text-enhanced-contrast">{error}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {batchResult.results.length > 0 && (
                  <div>
                    <h3 className="font-medium text-white mb-3 text-enhanced-contrast">Analysis Results</h3>
                    <div className="space-y-4">
                      {batchResult.results.map((result, index) => (
                        <div key={index} className="bg-white/5 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-white text-enhanced-contrast">{result.documentInfo.fileName}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskLevelColor(result.riskAssessment.level)}`}>
                              {result.riskAssessment.level}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm mb-2 text-enhanced-contrast">{result.summary.substring(0, 200)}...</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 text-enhanced-contrast">
                              Risk Score: {result.riskAssessment.score}/10
                            </span>
                            <button
                              onClick={() => {
                                setAnalysisResult(result);
                                setActiveTab('upload');
                              }}
                              className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8">
            {/* Analysis History */}
            <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-sm border border-white/10 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white text-enhanced-contrast">Analysis History</h2>
                <button
                  onClick={loadAnalysisHistory}
                  disabled={loadingHistory}
                  className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                  <span className="text-sm">Refresh</span>
                </button>
              </div>

              {loadingHistory ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
                  <p className="text-gray-400 text-enhanced-contrast">Loading analysis history...</p>
                </div>
              ) : analysisHistory.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-medium text-white mb-3 text-enhanced-contrast">Document Analyses</h3>
                  {analysisHistory.map((item) => (
                    <div key={item.id} className="bg-white/5 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-white text-enhanced-contrast">{item.documentInfo.fileName}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskLevelColor(item.riskAssessment.level)}`}>
                              {item.riskAssessment.level}
                            </span>
                            <span className="text-xs text-gray-400 text-enhanced-contrast">
                              Score: {item.riskAssessment.score}/10
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm mb-2 text-enhanced-contrast">
                            {item.summary.substring(0, 150)}...
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-400 text-enhanced-contrast">
                            <span>Jurisdiction: {item.documentInfo.jurisdiction}</span>
                            <span>Analyzed: {formatDate(item.documentInfo.analysisDate)}</span>
                            <span>Size: {Math.round(item.documentInfo.fileSize / 1024)} KB</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleViewHistoryItem(item)}
                            className="text-blue-400 hover:text-blue-300 transition-colors text-sm px-3 py-1 rounded border border-blue-400/30 hover:border-blue-300/50"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteAnalysis(item.id!)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 text-enhanced-contrast">No analysis history found</p>
                  <p className="text-sm text-gray-500 mt-2 text-enhanced-contrast">
                    Upload and analyze documents to see them here
                  </p>
                </div>
              )}

              {/* Batch History */}
              {batchHistory.length > 0 && (
                <div className="mt-8 pt-6 border-t border-white/20">
                  <h3 className="font-medium text-white mb-3 text-enhanced-contrast">Batch Analyses</h3>
                  <div className="space-y-4">
                    {batchHistory.map((batch) => (
                      <div key={batch.id} className="bg-white/5 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-medium text-white text-enhanced-contrast">
                                Batch Analysis ({batch.totalFiles} files)
                              </h4>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                batch.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                                batch.status === 'failed' ? 'bg-red-500/20 text-red-300' :
                                batch.status === 'processing' ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-gray-500/20 text-gray-300'
                              }`}>
                                {batch.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-gray-400 text-enhanced-contrast">
                              <span>Completed: {batch.completedFiles}/{batch.totalFiles}</span>
                              <span>Errors: {batch.errors.length}</span>
                              <span>Created: {formatDate(batch.createdAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => {
                                setBatchResult(batch);
                                setActiveTab('batch');
                              }}
                              className="text-blue-400 hover:text-blue-300 transition-colors text-sm px-3 py-1 rounded border border-blue-400/30 hover:border-blue-300/50"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}