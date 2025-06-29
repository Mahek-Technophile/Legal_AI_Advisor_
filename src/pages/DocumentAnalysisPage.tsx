import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, FileText, AlertTriangle, CheckCircle, Loader2, Download, History, Trash2, FolderOpen, RefreshCw, Info, Eye, EyeOff, AlertCircle, Target, Globe, Book, Newspaper, Scale, Clock, TrendingUp, Search, BarChart3, Users, Shield } from 'lucide-react';
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

export function DocumentAnalysisPage({ onBack, country }: DocumentAnalysisPageProps) {
  const { user } = useFirebaseAuth();
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  const [batchResult, setBatchResult] = useState<BatchAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'batch'>('upload');
  const [analysisHistory, setAnalysisHistory] = useState<DocumentAnalysisResult[]>([]);
  const [batchHistory, setBatchHistory] = useState<BatchAnalysisResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [configStatus, setConfigStatus] = useState<any>(null);
  
  // DeepSearch state
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DeepSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [deepSearchConfigStatus, setDeepSearchConfigStatus] = useState<any>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [extractedTerms, setExtractedTerms] = useState<string[]>([]);

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
      const [analysisStatus, searchStatus] = await Promise.all([
        documentAnalysisService.getConfigurationStatus(),
        deepSearchService.getConfigurationStatus()
      ]);
      
      setConfigStatus(analysisStatus);
      setDeepSearchConfigStatus(searchStatus);
    } catch (error) {
      console.error('Error checking configuration:', error);
      setConfigStatus({
        configured: false,
        message: 'Failed to check AI configuration'
      });
    }
  };

  const loadAnalysisHistory = async () => {
    setLoadingHistory(true);
    try {
      const [analyses, batches] = await Promise.all([
        documentAnalysisService.getAnalysisHistory(20),
        documentAnalysisService.getBatchAnalysisHistory(10)
      ]);
      setAnalysisHistory(analyses);
      setBatchHistory(batches);
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
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => validateFile(file));
    
    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      setError(null);
      
      // If it's a single file, extract content for DeepSearch
      if (validFiles.length === 1) {
        extractDocumentContent(validFiles[0]);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(file => validateFile(file));
      
      if (validFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...validFiles]);
        setError(null);
        
        // If it's a single file, extract content for DeepSearch
        if (validFiles.length === 1) {
          extractDocumentContent(validFiles[0]);
        }
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

  const extractDocumentContent = async (file: File) => {
    try {
      const content = await documentAnalysisService.extractTextFromFile(file);
      setDocumentContent(content);
      
      // Extract legal terms for DeepSearch
      if (deepSearchConfigStatus?.configured) {
        const terms = await deepSearchService.extractLegalTerms(content, country);
        setExtractedTerms(terms);
      }
    } catch (error) {
      console.error('Error extracting document content:', error);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    
    // If removing the only file, clear document content and terms
    if (uploadedFiles.length === 1) {
      setDocumentContent('');
      setExtractedTerms([]);
    }
  };

  const handleAnalyze = async () => {
    if (uploadedFiles.length === 0) return;

    if (!configStatus?.configured) {
      setError('AI services are not configured. Please check your API keys in the environment variables.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    setBatchResult(null);

    try {
      if (uploadedFiles.length === 1) {
        // Single file analysis
        const file = uploadedFiles[0];
        const documentContent = await documentAnalysisService.extractTextFromFile(file);
        
        const result = await documentAnalysisService.analyzeDocument({
          content: documentContent,
          jurisdiction: country,
          analysisType: 'comprehensive',
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        });

        setAnalysisResult(result);
      } else {
        // Batch analysis
        const result = await documentAnalysisService.batchAnalyzeDocuments(uploadedFiles, country);
        setBatchResult(result);
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeepSearch = async () => {
    if (uploadedFiles.length !== 1 || !documentContent) {
      setSearchError('Please upload a single document for DeepSearch.');
      return;
    }

    if (!deepSearchConfigStatus?.configured) {
      setSearchError('DeepSearch is not configured. Please check your search API keys in the environment variables.');
      return;
    }

    setSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const searchRequest = {
        documentContent,
        jurisdiction: country,
        legalClauses: extractedTerms,
        searchTerms: []
      };

      const response = await deepSearchService.performDeepSearch(searchRequest);
      setSearchResults(response.results);
    } catch (err: any) {
      console.error('DeepSearch error:', err);
      setSearchError(err.message || 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleAskForClarification = async (result: DeepSearchResult, question: string) => {
    try {
      const clarification = await deepSearchService.getClarification(result, question);
      // Update the UI with the clarification
      // This would be implemented to show the clarification in the UI
    } catch (error) {
      console.error('Error getting clarification:', error);
    }
  };

  const handleExport = async (format: 'pdf' | 'json' | 'html', analysis: DocumentAnalysisResult) => {
    setExporting(true);
    try {
      switch (format) {
        case 'pdf':
          await ReportExportService.exportToPDF(analysis);
          break;
        case 'json':
          await ReportExportService.exportToJSON(analysis);
          break;
        case 'html':
          await ReportExportService.exportToHTML(analysis);
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAnalysis = async (id: string) => {
    if (confirm('Are you sure you want to delete this analysis?')) {
      const success = await documentAnalysisService.deleteAnalysis(id);
      if (success) {
        setAnalysisHistory(prev => prev.filter(a => a.id !== id));
      }
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getBalanceColor = (balance: string) => {
    switch (balance) {
      case 'heavily_favors_provider': return 'text-red-600 bg-red-50';
      case 'favors_provider': return 'text-orange-600 bg-orange-50';
      case 'balanced': return 'text-green-600 bg-green-50';
      case 'favors_client': return 'text-blue-600 bg-blue-50';
      case 'heavily_favors_client': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white relative">
      {/* Header */}
      <div className="bg-gray-900/90 backdrop-blur-xl border-b border-gray-600 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Main</span>
              </button>
              <div className="h-6 w-px bg-gray-600" />
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600/20 p-2 rounded-lg backdrop-blur-sm">
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">Enhanced Document Analysis</h1>
                  <p className="text-sm text-gray-300">AI-powered legal document review with performance metrics</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={checkConfiguration}
                className="flex items-center space-x-1 text-white hover:text-gray-300 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm">Refresh</span>
              </button>
              <div className="text-sm text-gray-300">
                Jurisdiction: {country}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Features Notice */}
      <div className="bg-blue-600/10 backdrop-blur-sm border-b border-blue-600/20 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-blue-200 text-sm">
                <strong>Enhanced Analysis:</strong> Now includes specific performance metrics, counterparty perspective analysis, and improved formatting with hierarchical structure.
              </p>
              <p className="text-blue-300 text-xs">
                Features: SLA requirements, uptime monitoring thresholds, balanced risk assessment, and structured recommendations.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-600">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'upload', label: 'Upload & Analyze', icon: Upload },
                { id: 'history', label: 'Analysis History', icon: History },
                { id: 'batch', label: 'Batch Analysis', icon: FolderOpen }
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-400 text-blue-400'
                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
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
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div className="space-y-6">
              <div className="bg-gray-700/30 backdrop-blur-xl rounded-xl shadow-sm border border-gray-600 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Upload Documents</h2>
                
                {error && (
                  <div className="mb-4 bg-red-600/10 border border-red-600/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
                    <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors backdrop-blur-sm ${
                    dragActive ? 'border-blue-400/50 bg-blue-600/10' : 'border-gray-600 bg-gray-700/20'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-white mb-2">
                    Drop your legal documents here or click to browse
                  </p>
                  <p className="text-sm text-gray-400 mb-4">
                    Supports TXT, DOC, DOCX formats up to 10MB each
                  </p>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".txt,.doc,.docx"
                    multiple
                    onChange={handleFileSelect}
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer font-medium"
                  >
                    Choose Files
                  </label>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h3 className="font-medium text-white">Uploaded Files ({uploadedFiles.length})</h3>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-600/10 border border-green-600/20 rounded-lg backdrop-blur-sm">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-400" />
                          <div>
                            <p className="font-medium text-green-200">{file.name}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-green-400 hover:text-green-300 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <div className="flex space-x-3">
                      <button
                        onClick={handleAnalyze}
                        disabled={analyzing}
                        className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center space-x-2"
                      >
                        {analyzing ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>
                              {uploadedFiles.length === 1 ? 'Analyzing with Enhanced AI...' : 'Processing Batch...'}
                            </span>
                          </>
                        ) : (
                          <span>
                            {uploadedFiles.length === 1 ? 'Analyze with Enhanced AI' : `Analyze ${uploadedFiles.length} Documents`}
                          </span>
                        )}
                      </button>
                      
                      {uploadedFiles.length === 1 && deepSearchConfigStatus?.configured && (
                        <DeepSearchButton
                          onClick={handleDeepSearch}
                          isLoading={searching}
                          isDisabled={!documentContent || searching}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Analysis Features */}
              <div className="bg-gray-700/30 backdrop-blur-xl rounded-xl shadow-sm border border-gray-600 p-6">
                <h3 className="font-semibold text-white mb-4">Enhanced Analysis Features</h3>
                <div className="space-y-3">
                  {[
                    { icon: BarChart3, text: 'Specific SLA requirements and uptime monitoring thresholds' },
                    { icon: Users, text: 'Counterparty perspective analysis (service provider vs client)' },
                    { icon: Target, text: 'Performance metrics with measurable criteria' },
                    { icon: Scale, text: 'Balanced risk assessment for both parties' },
                    { icon: TrendingUp, text: 'Hierarchical formatting with clear subheadings' },
                    { icon: Clock, text: 'Implementation timelines and priority levels' },
                    { icon: Shield, text: 'Comprehensive legal compliance checking' },
                    { icon: FileText, text: 'Structured recommendations by category' },
                    { icon: Search, text: 'DeepSearch for relevant case law and statutes' },
                    { icon: CheckCircle, text: 'Export to PDF, HTML, JSON formats' }
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <feature.icon className="h-4 w-4 text-blue-400 mr-3 flex-shrink-0" />
                      <span className="text-gray-300">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Enhanced Results Section */}
            <div className="space-y-6">
              {analysisResult ? (
                <div className="bg-gray-700/30 backdrop-blur-xl rounded-xl shadow-sm border border-gray-600 p-6 overflow-auto max-h-[80vh]">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Enhanced Analysis Results</h2>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleExport('pdf', analysisResult)}
                        disabled={exporting}
                        className="flex items-center space-x-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={() => handleExport('html', analysisResult)}
                        disabled={exporting}
                        className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        <span>HTML</span>
                      </button>
                      <button
                        onClick={() => handleExport('json', analysisResult)}
                        disabled={exporting}
                        className="flex items-center space-x-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        <span>JSON</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Enhanced Risk Assessment */}
                  <div className={`p-4 rounded-lg border mb-6 backdrop-blur-sm ${getRiskColor(analysisResult.riskAssessment.level)}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center">
                        <Shield className="h-5 w-5 mr-2" />
                        Risk Assessment
                      </h3>
                      <span className="font-bold">{analysisResult.riskAssessment.level}</span>
                    </div>
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-sm">Risk Score:</span>
                      <div className="flex-1 bg-white rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-current" 
                          style={{ width: `${analysisResult.riskAssessment.score * 10}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{analysisResult.riskAssessment.score}/10</span>
                    </div>
                    
                    {/* Categorized Risk Factors */}
                    <div className="grid md:grid-cols-3 gap-4 mt-4">
                      {analysisResult.riskAssessment.serviceProviderRisks && analysisResult.riskAssessment.serviceProviderRisks.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Service Provider Risks:</h4>
                          <ul className="text-xs space-y-1">
                            {analysisResult.riskAssessment.serviceProviderRisks.map((risk, index) => (
                              <li key={index}>• {risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysisResult.riskAssessment.clientRisks && analysisResult.riskAssessment.clientRisks.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Client Risks:</h4>
                          <ul className="text-xs space-y-1">
                            {analysisResult.riskAssessment.clientRisks.map((risk, index) => (
                              <li key={index}>• {risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysisResult.riskAssessment.mutualRisks && analysisResult.riskAssessment.mutualRisks.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Mutual Risks:</h4>
                          <ul className="text-xs space-y-1">
                            {analysisResult.riskAssessment.mutualRisks.map((risk, index) => (
                              <li key={index}>• {risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-white mb-2 flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Executive Summary
                    </h3>
                    <p className="text-gray-300">{analysisResult.summary}</p>
                  </div>

                  {/* Performance Metrics */}
                  {analysisResult.performanceMetrics && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-white mb-3 flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2" />
                        Performance Metrics & SLA Requirements
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4 backdrop-blur-sm">
                          <h4 className="font-medium text-blue-200 mb-2">SLA Requirements</h4>
                          <div className="space-y-2 text-sm text-blue-300">
                            <p><strong>Uptime:</strong> {analysisResult.performanceMetrics.slaRequirements.uptime}</p>
                            <p><strong>Response Time:</strong> {analysisResult.performanceMetrics.slaRequirements.responseTime}</p>
                            <p><strong>Availability:</strong> {analysisResult.performanceMetrics.slaRequirements.availability}</p>
                            {analysisResult.performanceMetrics.slaRequirements.performanceThresholds.length > 0 && (
                              <div>
                                <p><strong>Performance Thresholds:</strong></p>
                                <ul className="ml-4">
                                  {analysisResult.performanceMetrics.slaRequirements.performanceThresholds.map((threshold, index) => (
                                    <li key={index}>• {threshold}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysisResult.performanceMetrics.slaRequirements.monitoringRequirements && 
                             analysisResult.performanceMetrics.slaRequirements.monitoringRequirements.length > 0 && (
                              <div>
                                <p><strong>Monitoring Requirements:</strong></p>
                                <ul className="ml-4">
                                  {analysisResult.performanceMetrics.slaRequirements.monitoringRequirements.map((req, index) => (
                                    <li key={index}>• {req}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-orange-600/10 border border-orange-600/20 rounded-lg p-4 backdrop-blur-sm">
                          <h4 className="font-medium text-orange-200 mb-2">Penalties & Reporting</h4>
                          <div className="space-y-2 text-sm text-orange-300">
                            <p><strong>Reporting:</strong> {analysisResult.performanceMetrics.reporting.frequency}</p>
                            {analysisResult.performanceMetrics.penalties.uptimePenalties.length > 0 && (
                              <div>
                                <p><strong>Uptime Penalties:</strong></p>
                                <ul className="ml-4">
                                  {analysisResult.performanceMetrics.penalties.uptimePenalties.map((penalty, index) => (
                                    <li key={index}>• {penalty}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysisResult.performanceMetrics.penalties.performancePenalties && 
                             analysisResult.performanceMetrics.penalties.performancePenalties.length > 0 && (
                              <div>
                                <p><strong>Performance Penalties:</strong></p>
                                <ul className="ml-4">
                                  {analysisResult.performanceMetrics.penalties.performancePenalties.map((penalty, index) => (
                                    <li key={index}>• {penalty}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysisResult.performanceMetrics.penalties.escalationProcedures && 
                             analysisResult.performanceMetrics.penalties.escalationProcedures.length > 0 && (
                              <div>
                                <p><strong>Escalation Procedures:</strong></p>
                                <ul className="ml-4">
                                  {analysisResult.performanceMetrics.penalties.escalationProcedures.map((procedure, index) => (
                                    <li key={index}>• {procedure}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysisResult.performanceMetrics.reporting.metrics && 
                             analysisResult.performanceMetrics.reporting.metrics.length > 0 && (
                              <div>
                                <p><strong>Reporting Metrics:</strong></p>
                                <ul className="ml-4">
                                  {analysisResult.performanceMetrics.reporting.metrics.map((metric, index) => (
                                    <li key={index}>• {metric}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysisResult.performanceMetrics.reporting.auditRequirements && 
                             analysisResult.performanceMetrics.reporting.auditRequirements.length > 0 && (
                              <div>
                                <p><strong>Audit Requirements:</strong></p>
                                <ul className="ml-4">
                                  {analysisResult.performanceMetrics.reporting.auditRequirements.map((req, index) => (
                                    <li key={index}>• {req}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Counterparty Analysis */}
                  {analysisResult.counterpartyAnalysis && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-white mb-3 flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Counterparty Perspective Analysis
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-purple-600/10 border border-purple-600/20 rounded-lg p-4 backdrop-blur-sm">
                          <h4 className="font-medium text-purple-200 mb-2">Service Provider Perspective</h4>
                          <div className="space-y-3 text-sm text-purple-300">
                            {analysisResult.counterpartyAnalysis.serviceProviderPerspective.advantages.length > 0 && (
                              <div>
                                <p className="font-medium">Advantages:</p>
                                <ul className="ml-4">
                                  {analysisResult.counterpartyAnalysis.serviceProviderPerspective.advantages.map((item, index) => (
                                    <li key={index}>• {item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysisResult.counterpartyAnalysis.serviceProviderPerspective.risks.length > 0 && (
                              <div>
                                <p className="font-medium">Risks:</p>
                                <ul className="ml-4">
                                  {analysisResult.counterpartyAnalysis.serviceProviderPerspective.risks.map((item, index) => (
                                    <li key={index}>• {item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysisResult.counterpartyAnalysis.serviceProviderPerspective.obligations.length > 0 && (
                              <div>
                                <p className="font-medium">Obligations:</p>
                                <ul className="ml-4">
                                  {analysisResult.counterpartyAnalysis.serviceProviderPerspective.obligations.map((item, index) => (
                                    <li key={index}>• {item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysisResult.counterpartyAnalysis.serviceProviderPerspective.protections.length > 0 && (
                              <div>
                                <p className="font-medium">Protections:</p>
                                <ul className="ml-4">
                                  {analysisResult.counterpartyAnalysis.serviceProviderPerspective.protections.map((item, index) => (
                                    <li key={index}>• {item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4 backdrop-blur-sm">
                          <h4 className="font-medium text-blue-200 mb-2">Client Perspective</h4>
                          <div className="space-y-3 text-sm text-blue-300">
                            {analysisResult.counterpartyAnalysis.clientPerspective.advantages.length > 0 && (
                              <div>
                                <p className="font-medium">Advantages:</p>
                                <ul className="ml-4">
                                  {analysisResult.counterpartyAnalysis.clientPerspective.advantages.map((item, index) => (
                                    <li key={index}>• {item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysisResult.counterpartyAnalysis.clientPerspective.risks.length > 0 && (
                              <div>
                                <p className="font-medium">Risks:</p>
                                <ul className="ml-4">
                                  {analysisResult.counterpartyAnalysis.clientPerspective.risks.map((item, index) => (
                                    <li key={index}>• {item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysisResult.counterpartyAnalysis.clientPerspective.obligations.length > 0 && (
                              <div>
                                <p className="font-medium">Obligations:</p>
                                <ul className="ml-4">
                                  {analysisResult.counterpartyAnalysis.clientPerspective.obligations.map((item, index) => (
                                    <li key={index}>• {item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysisResult.counterpartyAnalysis.clientPerspective.protections.length > 0 && (
                              <div>
                                <p className="font-medium">Protections:</p>
                                <ul className="ml-4">
                                  {analysisResult.counterpartyAnalysis.clientPerspective.protections.map((item, index) => (
                                    <li key={index}>• {item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-gray-600/10 border border-gray-600/20 rounded-lg backdrop-blur-sm">
                        <h4 className="font-medium text-white mb-2">Balance Assessment</h4>
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-sm">Balance:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getBalanceColor(analysisResult.counterpartyAnalysis.balanceAssessment.overall)}`}>
                            {analysisResult.counterpartyAnalysis.balanceAssessment.overall.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-3">{analysisResult.counterpartyAnalysis.balanceAssessment.reasoning}</p>
                        
                        {analysisResult.counterpartyAnalysis.balanceAssessment.recommendations.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-white">Recommendations to Improve Balance:</p>
                            <ul className="ml-4 text-sm text-gray-300">
                              {analysisResult.counterpartyAnalysis.balanceAssessment.recommendations.map((rec, index) => (
                                <li key={index}>• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Key Findings */}
                  {analysisResult.keyFindings && analysisResult.keyFindings.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-white mb-3 flex items-center">
                        <Target className="h-5 w-5 mr-2" />
                        Key Findings
                      </h3>
                      <div className="space-y-4">
                        {analysisResult.keyFindings.map((finding, index) => (
                          <div key={index} className="p-4 bg-gray-600/10 border border-gray-600/20 rounded-lg backdrop-blur-sm">
                            <div className="flex items-start space-x-3">
                              {getSeverityIcon(finding.severity)}
                              <div>
                                <h4 className="font-medium text-white">{finding.category}</h4>
                                <p className="text-sm text-gray-300 mt-1">{finding.finding}</p>
                                {finding.impact && (
                                  <p className="text-sm text-gray-400 mt-2"><strong>Impact:</strong> {finding.impact}</p>
                                )}
                                {finding.affectedParty && (
                                  <div className="mt-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      finding.affectedParty === 'service_provider' ? 'bg-purple-600/20 text-purple-300' :
                                      finding.affectedParty === 'client' ? 'bg-blue-600/20 text-blue-300' :
                                      'bg-green-600/20 text-green-300'
                                    }`}>
                                      {finding.affectedParty.replace('_', ' ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Problematic Clauses */}
                  {analysisResult.problematicClauses && analysisResult.problematicClauses.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-white mb-3 flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        Problematic Clauses
                      </h3>
                      <div className="space-y-4">
                        {analysisResult.problematicClauses.map((clause, index) => (
                          <div key={index} className="p-4 bg-red-600/10 border border-red-600/20 rounded-lg backdrop-blur-sm">
                            <h4 className="font-medium text-red-200">Clause Issue</h4>
                            <div className="mt-2 p-3 bg-gray-800/50 rounded border border-gray-700 text-sm text-gray-300">
                              "{clause.clause}"
                            </div>
                            <div className="mt-3 space-y-2 text-sm">
                              <p><strong className="text-red-300">Issue:</strong> <span className="text-gray-300">{clause.issue}</span></p>
                              <p><strong className="text-green-300">Suggestion:</strong> <span className="text-gray-300">{clause.suggestion}</span></p>
                              {clause.affectedParty && (
                                <p>
                                  <strong className="text-blue-300">Affected Party:</strong>{' '}
                                  <span className="text-gray-300">{clause.affectedParty.replace('_', ' ')}</span>
                                </p>
                              )}
                              {clause.severity && (
                                <p>
                                  <strong className="text-orange-300">Severity:</strong>{' '}
                                  <span className="text-gray-300">{clause.severity}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Clauses */}
                  {analysisResult.missingClauses && analysisResult.missingClauses.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-white mb-3 flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Missing Clauses
                      </h3>
                      <div className="space-y-4">
                        {analysisResult.missingClauses.map((clause, index) => (
                          <div key={index} className="p-4 bg-yellow-600/10 border border-yellow-600/20 rounded-lg backdrop-blur-sm">
                            <h4 className="font-medium text-yellow-200">{clause.clause}</h4>
                            <div className="mt-2 space-y-2 text-sm">
                              <p>
                                <strong className="text-yellow-300">Importance:</strong>{' '}
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  clause.importance === 'critical' ? 'bg-red-600/20 text-red-300' :
                                  clause.importance === 'high' ? 'bg-orange-600/20 text-orange-300' :
                                  clause.importance === 'medium' ? 'bg-yellow-600/20 text-yellow-300' :
                                  'bg-blue-600/20 text-blue-300'
                                }`}>
                                  {clause.importance.toUpperCase()}
                                </span>
                              </p>
                              <p>
                                <strong className="text-yellow-300">Beneficiary:</strong>{' '}
                                <span className="text-gray-300">{clause.beneficiary.replace('_', ' ')}</span>
                              </p>
                              <p><strong className="text-yellow-300">Risk Mitigation:</strong> <span className="text-gray-300">{clause.riskMitigation}</span></p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysisResult.recommendations && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-white mb-3 flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Recommendations
                      </h3>
                      <div className="space-y-4">
                        {Array.isArray(analysisResult.recommendations) && analysisResult.recommendations.length > 0 ? (
                          typeof analysisResult.recommendations[0] === 'string' ? (
                            <div className="p-4 bg-green-600/10 border border-green-600/20 rounded-lg backdrop-blur-sm">
                              <ul className="space-y-2 text-sm text-gray-300">
                                {analysisResult.recommendations.map((rec, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="text-green-400 mr-2">•</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            analysisResult.recommendations.map((rec: any, index) => (
                              <div key={index} className="p-4 bg-green-600/10 border border-green-600/20 rounded-lg backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium text-green-200">{rec.category || 'Recommendation'}</h4>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(rec.priority || 'medium')}`}>
                                    {(rec.priority || 'medium').toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-300 mb-2">{rec.recommendation}</p>
                                <div className="text-sm space-y-1">
                                  {rec.implementation && (
                                    <p><strong className="text-green-300">Implementation:</strong> <span className="text-gray-300">{rec.implementation}</span></p>
                                  )}
                                  {rec.targetParty && (
                                    <p>
                                      <strong className="text-green-300">Target Party:</strong>{' '}
                                      <span className={`px-2 py-0.5 rounded text-xs ${
                                        rec.targetParty === 'service_provider' ? 'bg-purple-600/20 text-purple-300' :
                                        rec.targetParty === 'client' ? 'bg-blue-600/20 text-blue-300' :
                                        'bg-green-600/20 text-green-300'
                                      }`}>
                                        {rec.targetParty.replace('_', ' ')}
                                      </span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))
                          )
                        ) : (
                          <p className="text-gray-400">No specific recommendations provided.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Legal Citations */}
                  {analysisResult.legalCitations && analysisResult.legalCitations.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-white mb-3 flex items-center">
                        <Book className="h-5 w-5 mr-2" />
                        Legal Citations
                      </h3>
                      <div className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-lg backdrop-blur-sm">
                        <ul className="space-y-2 text-sm text-gray-300">
                          {analysisResult.legalCitations.map((citation, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-blue-400 mr-2">•</span>
                              <span>{citation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Next Steps */}
                  {analysisResult.nextSteps && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-white mb-3 flex items-center">
                        <Clock className="h-5 w-5 mr-2" />
                        Implementation Timeline
                      </h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        {analysisResult.nextSteps.immediate && analysisResult.nextSteps.immediate.length > 0 && (
                          <div className="p-4 bg-red-600/10 border border-red-600/20 rounded-lg backdrop-blur-sm">
                            <h4 className="font-medium text-red-200 mb-2">Immediate Actions</h4>
                            <ul className="space-y-2 text-sm text-gray-300">
                              {analysisResult.nextSteps.immediate.map((step, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-red-400 mr-2">{index + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {analysisResult.nextSteps.shortTerm && analysisResult.nextSteps.shortTerm.length > 0 && (
                          <div className="p-4 bg-yellow-600/10 border border-yellow-600/20 rounded-lg backdrop-blur-sm">
                            <h4 className="font-medium text-yellow-200 mb-2">Short-term (30 days)</h4>
                            <ul className="space-y-2 text-sm text-gray-300">
                              {analysisResult.nextSteps.shortTerm.map((step, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-yellow-400 mr-2">{index + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {analysisResult.nextSteps.longTerm && analysisResult.nextSteps.longTerm.length > 0 && (
                          <div className="p-4 bg-green-600/10 border border-green-600/20 rounded-lg backdrop-blur-sm">
                            <h4 className="font-medium text-green-200 mb-2">Long-term Actions</h4>
                            <ul className="space-y-2 text-sm text-gray-300">
                              {analysisResult.nextSteps.longTerm.map((step, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-green-400 mr-2">{index + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Handle legacy format */}
                        {!analysisResult.nextSteps.immediate && Array.isArray(analysisResult.nextSteps) && (
                          <div className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-lg backdrop-blur-sm md:col-span-3">
                            <h4 className="font-medium text-blue-200 mb-2">Next Steps</h4>
                            <ul className="space-y-2 text-sm text-gray-300">
                              {(analysisResult.nextSteps as unknown as string[]).map((step, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-blue-400 mr-2">{index + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Document Info */}
                  <div className="p-4 bg-gray-600/10 border border-gray-600/20 rounded-lg backdrop-blur-sm">
                    <h4 className="font-medium text-white mb-2">Document Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p><strong className="text-gray-400">File Name:</strong> <span className="text-gray-300">{analysisResult.documentInfo.fileName}</span></p>
                      <p><strong className="text-gray-400">File Type:</strong> <span className="text-gray-300">{analysisResult.documentInfo.fileType}</span></p>
                      <p><strong className="text-gray-400">File Size:</strong> <span className="text-gray-300">{(analysisResult.documentInfo.fileSize / 1024).toFixed(2)} KB</span></p>
                      <p><strong className="text-gray-400">Jurisdiction:</strong> <span className="text-gray-300">{analysisResult.documentInfo.jurisdiction}</span></p>
                      <p><strong className="text-gray-400">Analysis Date:</strong> <span className="text-gray-300">{new Date(analysisResult.documentInfo.analysisDate).toLocaleString()}</span></p>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="mt-6 p-4 bg-gray-600/10 border border-gray-600/20 rounded-lg backdrop-blur-sm">
                    <p className="text-xs text-gray-400">
                      <strong>Disclaimer:</strong> This analysis is for informational purposes only and does not constitute legal advice. 
                      Please consult with a qualified attorney for specific legal matters.
                    </p>
                  </div>
                </div>
              ) : batchResult ? (
                <div className="bg-gray-700/30 backdrop-blur-xl rounded-xl shadow-sm border border-gray-600 p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Batch Analysis Results</h2>
                  
                  <div className="mb-6 p-4 bg-blue-600/10 border border-blue-600/20 rounded-lg backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">Progress</span>
                      <span className="text-sm text-gray-300">{batchResult.completedFiles}/{batchResult.totalFiles} files</span>
                    </div>
                    <div className="w-full bg-blue-200/20 rounded-full h-2">
                      <div 
                        className="bg-blue-400 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${(batchResult.completedFiles / batchResult.totalFiles) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-blue-300 mt-2">Status: {batchResult.status}</p>
                  </div>

                  {batchResult.results.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-white">Completed Analyses</h3>
                      {batchResult.results.map((result, index) => (
                        <div key={index} className="p-4 bg-gray-600/10 border border-gray-600/20 rounded-lg backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-white">{result.documentInfo.fileName}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(result.riskAssessment.level)}`}>
                              {result.riskAssessment.level}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 mb-3">{result.summary}</p>
                          <div className="flex justify-end">
                            <button
                              onClick={() => setAnalysisResult(result)}
                              className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                              View Full Analysis
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {batchResult.errors.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-white mb-3">Errors</h3>
                      <div className="p-4 bg-red-600/10 border border-red-600/20 rounded-lg backdrop-blur-sm">
                        <ul className="space-y-2 text-sm text-red-300">
                          {batchResult.errors.map((error, index) => (
                            <li key={index} className="flex items-start">
                              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                              <span>{error}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-700/30 backdrop-blur-xl rounded-xl shadow-sm border border-gray-600 p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">Analysis Results</h2>
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">
                      Upload documents to see enhanced analysis results with performance metrics and counterparty perspective
                    </p>
                  </div>
                </div>
              )}
              
              {/* DeepSearch Results */}
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
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-gray-700/30 backdrop-blur-xl rounded-xl shadow-sm border border-gray-600 p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Analysis History</h2>
            
            {loadingHistory ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
                <p className="text-gray-400">Loading history...</p>
              </div>
            ) : analysisHistory.length > 0 ? (
              <div className="space-y-4">
                {analysisHistory.map((analysis) => (
                  <div key={analysis.id} className="border border-gray-600 rounded-lg p-4 bg-gray-700/20 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-white">{analysis.documentInfo.fileName}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(analysis.riskAssessment.level)}`}>
                          {analysis.riskAssessment.level}
                        </span>
                        <button
                          onClick={() => handleDeleteAnalysis(analysis.id!)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{analysis.summary}</p>
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>{new Date(analysis.documentInfo.analysisDate).toLocaleDateString()}</span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setAnalysisResult(analysis)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleExport('pdf', analysis)}
                          className="text-green-400 hover:text-green-300"
                        >
                          Export PDF
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No analysis history found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'batch' && (
          <div className="bg-gray-700/30 backdrop-blur-xl rounded-xl shadow-sm border border-gray-600 p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Batch Analysis History</h2>
            
            {loadingHistory ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
                <p className="text-gray-400">Loading history...</p>
              </div>
            ) : batchHistory.length > 0 ? (
              <div className="space-y-6">
                {batchHistory.map((batch) => (
                  <div key={batch.id} className="border border-gray-600 rounded-lg overflow-hidden">
                    <div className="p-4 bg-gray-700/40 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-white">Batch Analysis ({batch.completedFiles}/{batch.totalFiles} files)</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          batch.status === 'completed' ? 'bg-green-600/20 text-green-300' :
                          batch.status === 'processing' ? 'bg-blue-600/20 text-blue-300' :
                          batch.status === 'failed' ? 'bg-red-600/20 text-red-300' :
                          'bg-yellow-600/20 text-yellow-300'
                        }`}>
                          {batch.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">Created: {new Date(batch.createdAt).toLocaleString()}</p>
                    </div>
                    
                    {batch.results.length > 0 && (
                      <div className="p-4 border-t border-gray-600">
                        <h4 className="font-medium text-white mb-3">Results</h4>
                        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                          {batch.results.map((result, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-700/30 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-300">{result.documentInfo.fileName}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${getRiskColor(result.riskAssessment.level)}`}>
                                  {result.riskAssessment.level}
                                </span>
                                <button
                                  onClick={() => setAnalysisResult(result)}
                                  className="text-blue-400 hover:text-blue-300 text-xs"
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {batch.errors.length > 0 && (
                      <div className="p-4 border-t border-gray-600 bg-red-600/5">
                        <h4 className="font-medium text-red-300 mb-3">Errors</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                          {batch.errors.map((error, index) => (
                            <div key={index} className="text-sm text-red-300 flex items-start">
                              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                              <span>{error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No batch analysis history found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}