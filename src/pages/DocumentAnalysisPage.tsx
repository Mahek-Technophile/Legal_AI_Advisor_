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
      const history = await documentAnalysisService.getAnalysisHistory();
      setAnalysisHistory(history);
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
        return 'bg-emerald text-white';
      case 'MEDIUM':
        return 'bg-deep-bronze text-white';
      case 'HIGH':
        return 'bg-legal-red text-white';
      case 'CRITICAL':
        return 'bg-legal-red text-white';
      default:
        return 'bg-cool-gray text-white';
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
              {configStatus?.configured ? (
                <div className="flex items-center space-x-2 bg-green-500/20 px-3 py-1 rounded-full border border-green-500/30">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-400">Analysis Ready</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-yellow-500/20 px-3 py-1 rounded-full border border-yellow-500/30">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium text-yellow-400">Configuration Required</span>
                </div>
              )}
              <div className="text-sm text-gray-300 text-enhanced-contrast">
                Jurisdiction: {country}
              </div>
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
                { id: 'upload', label: 'Document Analysis', icon: FileText },
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
              <h2 className="text-xl font-semibold text-white mb-4 text-enhanced-contrast">Upload Legal Document</h2>
              
              {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
                  <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-300 text-sm text-enhanced-contrast">{error}</p>
                </div>
              )}

              {!analysisResult && (
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
              )}

              {/* Document Preview */}
              {uploadedFile && documentContent && !analysisResult && (
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
                          {(uploadedFile.size / 1024).toFixed(1)} KB • {uploadedFile.type.split('/')[1].toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        setDocumentContent('');
                      }}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={handleAnalyze}
                      disabled={analyzing || !configStatus?.configured || !uploadedFile}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center space-x-2"
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
                    <h3 className="text-xl font-semibold text-white text-enhanced-contrast">Analysis Results</h3>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleExportPDF}
                        className="flex items-center space-x-2 bg-white/10 text-white px-3 py-2 rounded-lg hover:bg-white/20 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        <span className="text-sm">Export PDF</span>
                      </button>
                      <button
                        onClick={handleExportJSON}
                        className="flex items-center space-x-2 bg-white/10 text-white px-3 py-2 rounded-lg hover:bg-white/20 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        <span className="text-sm">Export JSON</span>
                      </button>
                      <button
                        onClick={() => setAnalysisResult(null)}
                        className="flex items-center space-x-2 bg-red-500/20 text-red-300 px-3 py-2 rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="text-sm">Clear</span>
                      </button>
                    </div>
                  </div>

                  {/* Document Info */}
                  <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-300">{analysisResult.documentInfo.fileName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Info className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-300">{analysisResult.documentInfo.jurisdiction}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getRiskLevelColor(analysisResult.riskAssessment.level)}`}>
                          {analysisResult.riskAssessment.level} RISK
                        </span>
                        <span className="text-sm text-gray-300">Score: {analysisResult.riskAssessment.score}/10</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-white/5 rounded-lg p-6 backdrop-blur-sm">
                    <h4 className="text-lg font-medium text-white mb-3 text-enhanced-contrast">Executive Summary</h4>
                    <p className="text-gray-300 text-enhanced-contrast">{analysisResult.summary}</p>
                  </div>

                  {/* Risk Assessment */}
                  <div className="bg-white/5 rounded-lg p-6 backdrop-blur-sm">
                    <h4 className="text-lg font-medium text-white mb-3 text-enhanced-contrast">Risk Assessment</h4>
                    
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      {analysisResult.riskAssessment.serviceProviderRisks && (
                        <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                          <h5 className="font-medium text-red-300 mb-2">Service Provider Risks</h5>
                          <ul className="space-y-1 text-sm text-gray-300">
                            {analysisResult.riskAssessment.serviceProviderRisks.map((risk, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 flex-shrink-0"></div>
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysisResult.riskAssessment.clientRisks && (
                        <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
                          <h5 className="font-medium text-yellow-300 mb-2">Client Risks</h5>
                          <ul className="space-y-1 text-sm text-gray-300">
                            {analysisResult.riskAssessment.clientRisks.map((risk, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-1.5 flex-shrink-0"></div>
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysisResult.riskAssessment.mutualRisks && (
                        <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
                          <h5 className="font-medium text-purple-300 mb-2">Mutual Risks</h5>
                          <ul className="space-y-1 text-sm text-gray-300">
                            {analysisResult.riskAssessment.mutualRisks.map((risk, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 flex-shrink-0"></div>
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {!analysisResult.riskAssessment.serviceProviderRisks && !analysisResult.riskAssessment.clientRisks && analysisResult.riskAssessment.factors && (
                        <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                          <h5 className="font-medium text-blue-300 mb-2">Risk Factors</h5>
                          <ul className="space-y-1 text-sm text-gray-300">
                            {analysisResult.riskAssessment.factors.map((factor, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></div>
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
                    <div className="bg-white/5 rounded-lg p-6 backdrop-blur-sm">
                      <h4 className="text-lg font-medium text-white mb-3 text-enhanced-contrast">Key Findings</h4>
                      <div className="space-y-4">
                        {analysisResult.keyFindings.map((finding, index) => (
                          <div key={index} className="bg-white/10 rounded-lg p-4 border border-white/20">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-white">{finding.category}</h5>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  finding.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                                  finding.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                                  'bg-blue-500/20 text-blue-300'
                                }`}>
                                  {finding.severity.toUpperCase()}
                                </span>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  finding.affectedParty === 'service_provider' ? 'bg-purple-500/20 text-purple-300' :
                                  finding.affectedParty === 'client' ? 'bg-green-500/20 text-green-300' :
                                  'bg-blue-500/20 text-blue-300'
                                }`}>
                                  {finding.affectedParty.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <p className="text-gray-300">{finding.finding}</p>
                            {finding.impact && (
                              <p className="text-sm text-gray-400 mt-2">
                                <span className="font-medium text-gray-300">Impact:</span> {finding.impact}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysisResult.recommendations && (
                    <div className="bg-white/5 rounded-lg p-6 backdrop-blur-sm">
                      <h4 className="text-lg font-medium text-white mb-3 text-enhanced-contrast">Recommendations</h4>
                      <div className="space-y-4">
                        {Array.isArray(analysisResult.recommendations) && analysisResult.recommendations.length > 0 ? (
                          typeof analysisResult.recommendations[0] === 'string' ? (
                            <ul className="space-y-2 text-gray-300">
                              {analysisResult.recommendations.map((rec, index) => (
                                <li key={index} className="flex items-start space-x-2">
                                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            analysisResult.recommendations.map((rec: any, index) => (
                              <div key={index} className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-green-300">{rec.category || 'Recommendation'}</h5>
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      rec.priority === 'critical' ? 'bg-red-500/20 text-red-300' :
                                      rec.priority === 'high' ? 'bg-yellow-500/20 text-yellow-300' :
                                      rec.priority === 'medium' ? 'bg-blue-500/20 text-blue-300' :
                                      'bg-green-500/20 text-green-300'
                                    }`}>
                                      {rec.priority?.toUpperCase() || 'MEDIUM'}
                                    </span>
                                    {rec.targetParty && (
                                      <span className={`px-2 py-1 text-xs rounded-full ${
                                        rec.targetParty === 'service_provider' ? 'bg-purple-500/20 text-purple-300' :
                                        rec.targetParty === 'client' ? 'bg-blue-500/20 text-blue-300' :
                                        'bg-gray-500/20 text-gray-300'
                                      }`}>
                                        {rec.targetParty.replace('_', ' ').toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className="text-gray-300">{rec.recommendation}</p>
                                {rec.implementation && (
                                  <p className="text-sm text-gray-400 mt-2">
                                    <span className="font-medium text-gray-300">Implementation:</span> {rec.implementation}
                                  </p>
                                )}
                              </div>
                            ))
                          )
                        ) : (
                          <p className="text-gray-400">No specific recommendations provided.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Next Steps */}
                  {analysisResult.nextSteps && (
                    <div className="bg-white/5 rounded-lg p-6 backdrop-blur-sm">
                      <h4 className="text-lg font-medium text-white mb-3 text-enhanced-contrast">Next Steps</h4>
                      
                      {analysisResult.nextSteps.immediate && analysisResult.nextSteps.immediate.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium text-blue-300 mb-2">Immediate Actions</h5>
                          <ul className="space-y-1 text-gray-300">
                            {analysisResult.nextSteps.immediate.map((step, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 flex-shrink-0"></div>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysisResult.nextSteps.shortTerm && analysisResult.nextSteps.shortTerm.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium text-yellow-300 mb-2">Short-term Actions (30 days)</h5>
                          <ul className="space-y-1 text-gray-300">
                            {analysisResult.nextSteps.shortTerm.map((step, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-1.5 flex-shrink-0"></div>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysisResult.nextSteps.longTerm && analysisResult.nextSteps.longTerm.length > 0 && (
                        <div>
                          <h5 className="font-medium text-green-300 mb-2">Long-term Actions</h5>
                          <ul className="space-y-1 text-gray-300">
                            {analysisResult.nextSteps.longTerm.map((step, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 flex-shrink-0"></div>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Handle legacy format */}
                      {!analysisResult.nextSteps.immediate && Array.isArray(analysisResult.nextSteps) && (
                        <ul className="space-y-1 text-gray-300">
                          {analysisResult.nextSteps.map((step, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></div>
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
          <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-sm border border-white/10 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 text-enhanced-contrast">Analysis History</h2>
            
            {loadingHistory ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
                <p className="text-gray-400 text-enhanced-contrast">Loading history...</p>
              </div>
            ) : analysisHistory.length > 0 ? (
              <div className="space-y-4">
                {analysisHistory.map((analysis) => (
                  <div 
                    key={analysis.id} 
                    className="bg-white/10 rounded-lg p-4 border border-white/20 hover:bg-white/15 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="bg-white/10 p-2 rounded-lg">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{analysis.documentInfo.fileName}</h3>
                          <div className="flex items-center space-x-2 mt-1 text-xs text-gray-400">
                            <span>{analysis.documentInfo.jurisdiction}</span>
                            <span>•</span>
                            <span>{new Date(analysis.documentInfo.analysisDate).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className={`px-2 py-0.5 rounded-full ${getRiskLevelColor(analysis.riskAssessment.level)}`}>
                              {analysis.riskAssessment.level}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 mt-2 line-clamp-2">{analysis.summary}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewHistoryItem(analysis)}
                          className="text-blue-400 hover:text-blue-300 transition-colors p-2"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAnalysis(analysis.id!)}
                          className="text-red-400 hover:text-red-300 transition-colors p-2"
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
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 text-enhanced-contrast">No analysis history found</p>
                <p className="text-gray-500 text-sm mt-2 text-enhanced-contrast">
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