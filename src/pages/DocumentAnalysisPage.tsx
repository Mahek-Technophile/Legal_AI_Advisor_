import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle, Loader2, Shield, AlertTriangle, Download, History, Trash2, FolderOpen, RefreshCw, Info, Users, Target, BarChart3, Scale, Clock, TrendingUp } from 'lucide-react';
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext';
import { documentAnalysisService, DocumentAnalysisResult, BatchAnalysisResult } from '../services/documentAnalysis';
import { ReportExportService } from '../services/reportExport';

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
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(file => validateFile(file));
      
      if (validFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...validFiles]);
        setError(null);
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

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Main</span>
              </button>
              <div className="h-6 w-px bg-slate-300" />
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">Enhanced Document Analysis</h1>
                  <p className="text-sm text-slate-500">AI-powered legal document review with performance metrics</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={checkConfiguration}
                className="flex items-center space-x-1 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm">Refresh</span>
              </button>
              <div className="text-sm text-slate-500">
                Jurisdiction: {country}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Features Notice */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-blue-800 text-sm">
                <strong>Enhanced Analysis:</strong> Now includes specific performance metrics, counterparty perspective analysis, and improved formatting with hierarchical structure.
              </p>
              <p className="text-blue-700 text-xs">
                Features: SLA requirements, uptime monitoring thresholds, balanced risk assessment, and structured recommendations.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'upload', label: 'Upload & Analyze', icon: Upload },
                { id: 'history', label: 'Analysis History', icon: History },
                { id: 'batch', label: 'Batch Analysis', icon: FolderOpen }
              ].map((tab) => {
                const IconComponent =  tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
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
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Upload Documents</h2>
                
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-2">
                    Drop your legal documents here or click to browse
                  </p>
                  <p className="text-sm text-slate-500 mb-4">
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
                    className="inline-block bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Choose Files
                  </label>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h3 className="font-medium text-slate-900">Uploaded Files ({uploadedFiles.length})</h3>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium text-green-900">{file.name}</p>
                            <p className="text-sm text-green-700">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-green-600 hover:text-green-800 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center space-x-2"
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
                  </div>
                )}
              </div>

              {/* Enhanced Analysis Features */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Enhanced Analysis Features</h3>
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
                    { icon: CheckCircle, text: 'Export to PDF, HTML, JSON formats' }
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <feature.icon className="h-4 w-4 text-blue-500 mr-3 flex-shrink-0" />
                      <span className="text-slate-600">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Enhanced Results Section */}
            <div className="space-y-6">
              {analysisResult ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-slate-900">Enhanced Analysis Results</h2>
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
                  <div className={`p-4 rounded-lg border mb-6 ${getRiskColor(analysisResult.riskAssessment.level)}`}>
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
                    <h3 className="font-semibold text-slate-900 mb-2 flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Executive Summary
                    </h3>
                    <p className="text-slate-700">{analysisResult.summary}</p>
                  </div>

                  {/* Performance Metrics */}
                  {analysisResult.performanceMetrics && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2" />
                        Performance Metrics & SLA Requirements
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium text-blue-900 mb-2">SLA Requirements</h4>
                          <div className="space-y-2 text-sm text-blue-800">
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
                          </div>
                        </div>

                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <h4 className="font-medium text-orange-900 mb-2">Penalties & Reporting</h4>
                          <div className="space-y-2 text-sm text-orange-800">
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
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Counterparty Analysis */}
                  {analysisResult.counterpartyAnalysis && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Counterparty Perspective Analysis
                      </h3>
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-medium text-green-900 mb-3">Service Provider Perspective</h4>
                          <div className="space-y-3 text-sm">
                            {analysisResult.counterpartyAnalysis.serviceProviderPerspective.advantages.length > 0 && (
                              <div>
                                <p className="font-medium text-green-800">Advantages:</p>
                                <ul className="text-green-700 ml-4">
                                  {analysisResult.counterpartyAnalysis.serviceProviderPerspective.advantages.map((advantage, index) => (
                                    <li key={index}>• {advantage}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysisResult.counterpartyAnalysis.serviceProviderPerspective.risks.length > 0 && (
                              <div>
                                <p className="font-medium text-green-800">Risks:</p>
                                <ul className="text-green-700 ml-4">
                                  {analysisResult.counterpartyAnalysis.serviceProviderPerspective.risks.map((risk, index) => (
                                    <li key={index}>• {risk}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium text-blue-900 mb-3">Client Perspective</h4>
                          <div className="space-y-3 text-sm">
                            {analysisResult.counterpartyAnalysis.clientPerspective.advantages.length > 0 && (
                              <div>
                                <p className="font-medium text-blue-800">Advantages:</p>
                                <ul className="text-blue-700 ml-4">
                                  {analysisResult.counterpartyAnalysis.clientPerspective.advantages.map((advantage, index) => (
                                    <li key={index}>• {advantage}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysisResult.counterpartyAnalysis.clientPerspective.risks.length > 0 && (
                              <div>
                                <p className="font-medium text-blue-800">Risks:</p>
                                <ul className="text-blue-700 ml-4">
                                  {analysisResult.counterpartyAnalysis.clientPerspective.risks.map((risk, index) => (
                                    <li key={index}>• {risk}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Balance Assessment */}
                      <div className={`p-4 rounded-lg border ${getBalanceColor(analysisResult.counterpartyAnalysis.balanceAssessment.overall)}`}>
                        <h4 className="font-medium mb-2">Contract Balance Assessment</h4>
                        <p className="text-sm mb-2">
                          <strong>Overall Balance:</strong> {analysisResult.counterpartyAnalysis.balanceAssessment.overall.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-sm mb-2">{analysisResult.counterpartyAnalysis.balanceAssessment.reasoning}</p>
                        {analysisResult.counterpartyAnalysis.balanceAssessment.recommendations.length > 0 && (
                          <div>
                            <p className="font-medium text-sm">Rebalancing Recommendations:</p>
                            <ul className="text-sm ml-4">
                              {analysisResult.counterpartyAnalysis.balanceAssessment.recommendations.map((rec, index) => (
                                <li key={index}>• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Key Findings */}
                  {analysisResult.keyFindings.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center">
                        <Target className="h-5 w-5 mr-2" />
                        Key Findings
                      </h3>
                      <div className="space-y-3">
                        {analysisResult.keyFindings.map((finding, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            {getSeverityIcon(finding.severity)}
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-medium text-slate-900">{finding.category}</h4>
                                <span className="text-xs px-2 py-1 rounded bg-slate-200 text-slate-700">
                                  Affects: {finding.affectedParty?.replace('_', ' ') || 'both'}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 mb-1">{finding.finding}</p>
                              {finding.impact && (
                                <p className="text-xs text-slate-500"><strong>Impact:</strong> {finding.impact}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Recommendations */}
                  {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Structured Recommendations
                      </h3>
                      <div className="space-y-3">
                        {analysisResult.recommendations.map((rec, index) => (
                          <div key={index} className="border border-slate-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-slate-900">{rec.category}</h4>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                                  {rec.priority?.toUpperCase()}
                                </span>
                                <span className="text-xs px-2 py-1 rounded bg-slate-200 text-slate-700">
                                  {rec.targetParty?.replace('_', ' ') || 'both'}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-slate-700 mb-2">{rec.recommendation}</p>
                            {rec.implementation && (
                              <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                                <strong>Implementation:</strong> {rec.implementation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Next Steps */}
                  {analysisResult.nextSteps && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center">
                        <Clock className="h-5 w-5 mr-2" />
                        Implementation Timeline
                      </h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        {analysisResult.nextSteps.immediate && analysisResult.nextSteps.immediate.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h4 className="font-medium text-red-900 mb-2">Immediate Actions</h4>
                            <ul className="text-sm text-red-800 space-y-1">
                              {analysisResult.nextSteps.immediate.map((step, index) => (
                                <li key={index}>• {step}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {analysisResult.nextSteps.shortTerm && analysisResult.nextSteps.shortTerm.length > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h4 className="font-medium text-yellow-900 mb-2">Short-term (30 days)</h4>
                            <ul className="text-sm text-yellow-800 space-y-1">
                              {analysisResult.nextSteps.shortTerm.map((step, index) => (
                                <li key={index}>• {step}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {analysisResult.nextSteps.longTerm && analysisResult.nextSteps.longTerm.length > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-medium text-green-900 mb-2">Long-term</h4>
                            <ul className="text-sm text-green-800 space-y-1">
                              {analysisResult.nextSteps.longTerm.map((step, index) => (
                                <li key={index}>• {step}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Legal Citations */}
                  {analysisResult.legalCitations.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-slate-900 mb-3">Legal Citations</h3>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <ul className="space-y-1">
                          {analysisResult.legalCitations.map((citation, index) => (
                            <li key={index} className="text-sm text-blue-800">• {citation}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ) : batchResult ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-xl font-semibold text-slate-900 mb-6">Batch Analysis Results</h2>
                  
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Progress</span>
                      <span className="text-sm">{batchResult.completedFiles}/{batchResult.totalFiles} files</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${(batchResult.completedFiles / batchResult.totalFiles) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-blue-700 mt-2">Status: {batchResult.status}</p>
                  </div>

                  {batchResult.results.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-900">Analysis Results</h3>
                      {batchResult.results.map((result, index) => (
                        <div key={index} className="border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{result.documentInfo.fileName}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(result.riskAssessment.level)}`}>
                              {result.riskAssessment.level}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{result.summary}</p>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setAnalysisResult(result)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => handleExport('pdf', result)}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              Export PDF
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {batchResult.errors.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-red-900 mb-2">Errors</h3>
                      <div className="space-y-2">
                        {batchResult.errors.map((error, index) => (
                          <p key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded">{error}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-xl font-semibold text-slate-900 mb-4">Analysis Results</h2>
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 mb-2">
                      Upload documents to see enhanced analysis results with performance metrics and counterparty perspective
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Analysis History</h2>
            
            {loadingHistory ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-slate-500">Loading history...</p>
              </div>
            ) : analysisHistory.length > 0 ? (
              <div className="space-y-4">
                {analysisHistory.map((analysis) => (
                  <div key={analysis.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{analysis.documentInfo.fileName}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(analysis.riskAssessment.level)}`}>
                          {analysis.riskAssessment.level}
                        </span>
                        <button
                          onClick={() => handleDeleteAnalysis(analysis.id!)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{analysis.summary}</p>
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>{new Date(analysis.documentInfo.analysisDate).toLocaleDateString()}</span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setAnalysisResult(analysis)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleExport('pdf', analysis)}
                          className="text-green-600 hover:text-green-800"
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
                <History className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No analysis history found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}