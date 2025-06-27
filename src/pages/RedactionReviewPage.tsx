import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Upload, FileText, AlertTriangle, CheckCircle, Loader2, Download, History, Trash2, Info, Eye, EyeOff, AlertCircle, RefreshCw, Target, Scale, Clock, MapPin } from 'lucide-react';
import { redactionAnalysisService, RedactionAnalysisResult, RedactionTypeClassification, ClauseImpactAnalysis } from '../services/redactionAnalysis';
import { ReportExportService } from '../services/reportExport';

interface RedactionReviewPageProps {
  onBack: () => void;
  country: string;
}

export function RedactionReviewPage({ onBack, country }: RedactionReviewPageProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<RedactionAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [analysisHistory, setAnalysisHistory] = useState<RedactionAnalysisResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [showRedactionPreview, setShowRedactionPreview] = useState(false);
  const [documentContent, setDocumentContent] = useState<string>('');

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
      const status = await redactionAnalysisService.getConfigurationStatus();
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
      const analyses = await redactionAnalysisService.getAnalysisHistory(20);
      setAnalysisHistory(analyses);
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
      const content = await redactionAnalysisService.extractTextFromFile(file);
      setDocumentContent(content);
      
      // Check for redactions
      const redactionDetection = redactionAnalysisService.detectRedactions(content);
      if (!redactionDetection.hasRedactions) {
        setError('No redactions detected in this document. This service is specifically for analyzing documents with redacted content marked as [REDACTED] or similar patterns.');
        setUploadedFile(null);
        setDocumentContent('');
      }
    } catch (err: any) {
      setError(err.message);
      setUploadedFile(null);
      setDocumentContent('');
    }
  };

  const handleAnalyze = async () => {
    if (!uploadedFile || !documentContent) return;

    if (!configStatus?.configured) {
      setError('AI services are not configured. Please check your API keys in the environment variables.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await redactionAnalysisService.analyzeRedactedDocument({
        content: documentContent,
        jurisdiction: country,
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        fileType: uploadedFile.type
      });

      setAnalysisResult(result);
    } catch (err: any) {
      console.error('Redaction analysis error:', err);
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'json' | 'html', analysis: RedactionAnalysisResult) => {
    setExporting(true);
    try {
      // Convert RedactionAnalysisResult to DocumentAnalysisResult format for export
      const exportData = {
        ...analysis,
        keyFindings: analysis.visibleContentAnalysis.potentialIssues.map(issue => ({
          category: 'Visible Content Issue',
          finding: issue,
          severity: 'warning' as const
        })),
        problematicClauses: analysis.visibleContentAnalysis.vagueClauses.map(clause => ({
          clause,
          issue: 'Vague or ambiguous terms in visible content',
          suggestion: 'Clarify terms and obtain unredacted version for complete analysis'
        })),
        missingClauses: analysis.visibleContentAnalysis.missingStandardClauses
      };

      switch (format) {
        case 'pdf':
          await ReportExportService.exportToPDF(exportData as any);
          break;
        case 'json':
          await ReportExportService.exportToJSON(exportData as any);
          break;
        case 'html':
          await ReportExportService.exportToHTML(exportData as any);
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
      const success = await redactionAnalysisService.deleteAnalysis(id);
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

  const getRedactionTypeColor = (type: string) => {
    switch (type) {
      case 'financial': return 'bg-red-100 text-red-800 border-red-200';
      case 'legal': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'personal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'business': return 'bg-green-100 text-green-800 border-green-200';
      case 'location': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'temporal': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'technical': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEnforceabilityColor = (level: string) => {
    switch (level) {
      case 'NONE': return 'text-green-600 bg-green-50';
      case 'MINOR': return 'text-blue-600 bg-blue-50';
      case 'MODERATE': return 'text-yellow-600 bg-yellow-50';
      case 'SEVERE': return 'text-orange-600 bg-orange-50';
      case 'CRITICAL': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const highlightRedactions = (text: string) => {
    const redactionPatterns = [
      /\[REDACTED\]/gi,
      /\*\*\*REDACTED\*\*\*/gi,
      /█+/g,
      /\[CONFIDENTIAL\]/gi,
      /\[CLASSIFIED\]/gi,
      /\[REMOVED\]/gi,
      /\[WITHHELD\]/gi,
      /\[PROTECTED\]/gi
    ];

    let highlightedText = text;
    redactionPatterns.forEach(pattern => {
      highlightedText = highlightedText.replace(pattern, '<span class="bg-red-200 text-red-800 px-1 rounded font-mono text-sm">$&</span>');
    });

    return highlightedText;
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
                <div className="bg-amber-600/20 p-2 rounded-lg backdrop-blur-sm">
                  <Shield className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">Enhanced Redaction Review</h1>
                  <p className="text-sm text-gray-300">Granular AI analysis of redacted documents</p>
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

      {/* Enhanced Warning Banner */}
      <div className="bg-amber-600/10 backdrop-blur-sm border-b border-amber-600/20 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-amber-200">Enhanced Redacted Document Analysis</h3>
              <p className="text-sm text-amber-300 mt-1">
                Advanced granular analysis including clause-level impact assessment, redaction type classification, 
                and integrity checking. Results include specific enforceability implications and detailed recommendations.
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
                { id: 'history', label: 'Analysis History', icon: History }
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-amber-400 text-amber-400'
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
                <h2 className="text-xl font-semibold text-white mb-4">Upload Redacted Document</h2>
                
                {error && (
                  <div className="mb-4 bg-red-600/10 border border-red-600/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
                    <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors backdrop-blur-sm ${
                    dragActive ? 'border-amber-400/50 bg-amber-600/10' : 'border-gray-600 bg-gray-700/20'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-white mb-2">
                    {uploadedFile ? uploadedFile.name : 'Drop your redacted document here'}
                  </p>
                  <p className="text-sm text-gray-400 mb-4">
                    Supports TXT, DOC, DOCX formats with [REDACTED] markers
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
                      <h3 className="font-medium text-white">Document Preview</h3>
                      <button
                        onClick={() => setShowRedactionPreview(!showRedactionPreview)}
                        className="flex items-center space-x-2 text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        {showRedactionPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="text-sm">{showRedactionPreview ? 'Hide' : 'Show'} Preview</span>
                      </button>
                    </div>

                    {showRedactionPreview && (
                      <div className="bg-gray-700/20 border border-gray-600 rounded-lg p-4 max-h-64 overflow-y-auto custom-scrollbar backdrop-blur-sm">
                        <div 
                          className="text-sm text-gray-300 whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: highlightRedactions(documentContent.substring(0, 2000) + (documentContent.length > 2000 ? '...' : '')) }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-amber-600/10 border border-amber-600/20 rounded-lg mt-3 backdrop-blur-sm">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-amber-400" />
                        <div>
                          <p className="font-medium text-amber-200">{uploadedFile.name}</p>
                          <p className="text-sm text-amber-300">
                            Redactions detected - Ready for enhanced analysis
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setUploadedFile(null);
                          setDocumentContent('');
                        }}
                        className="text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      onClick={handleAnalyze}
                      disabled={analyzing || !configStatus?.configured}
                      className="w-full mt-4 bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center space-x-2"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Performing Enhanced Analysis...</span>
                        </>
                      ) : (
                        <span>Analyze with Enhanced AI</span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Enhanced Analysis Features */}
              <div className="bg-gray-700/30 backdrop-blur-xl rounded-xl shadow-sm border border-gray-600 p-6">
                <h3 className="font-semibold text-white mb-4">Enhanced Analysis Features</h3>
                <div className="space-y-3">
                  {[
                    'Granular clause-level impact assessment',
                    'Redaction type classification and risk triage',
                    'Enforceability impact analysis per clause',
                    'Redaction integrity and consistency checking',
                    'Jurisdictional uncertainty detection',
                    'Structured formatting with subheadings',
                    'Specific recommendations per clause type',
                    'Critical information gap identification',
                    'Professional legal citations and next steps'
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <Target className="h-4 w-4 text-amber-400 mr-3 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Enhanced Results Section */}
            <div>
              {analysisResult ? (
                <div className="bg-gray-700/30 backdrop-blur-xl rounded-xl shadow-sm border border-gray-600 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Enhanced Redaction Analysis</h2>
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

                  {/* Enhanced Redaction Detection */}
                  <div className="mb-6 p-4 bg-red-600/10 border border-red-600/20 rounded-lg backdrop-blur-sm">
                    <h3 className="font-semibold text-red-200 mb-3 flex items-center">
                      <Shield className="h-5 w-5 mr-2" />
                      Redaction Detection & Classification
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-red-300">Redacted Sections:</span>
                        <span className="ml-2 font-medium text-red-200">{analysisResult.redactionDetection.redactedSections}</span>
                      </div>
                      <div>
                        <span className="text-red-300">Visible Content:</span>
                        <span className="ml-2 font-medium text-red-200">{analysisResult.redactionDetection.visibleContentPercentage}%</span>
                      </div>
                    </div>

                    {/* Continue with rest of the analysis results... */}
                  </div>

                  {/* Summary */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-white mb-2">Analysis Summary</h3>
                    <p className="text-gray-300">{analysisResult.summary}</p>
                  </div>

                  {/* Continue with rest of the component... */}
                </div>
              ) : (
                <div className="bg-gray-700/30 backdrop-blur-xl rounded-xl shadow-sm border border-gray-600 p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">Enhanced Analysis Results</h2>
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">
                      Upload a redacted document to see enhanced granular analysis results
                    </p>
                    <div className="mt-4 p-4 bg-amber-600/10 border border-amber-600/20 rounded-lg backdrop-blur-sm">
                      <div className="flex items-center space-x-2 justify-center mb-2">
                        <Info className="h-5 w-5 text-amber-400" />
                        <p className="text-amber-200 text-sm font-medium">
                          Enhanced Redaction Analysis Features
                        </p>
                      </div>
                      <p className="text-amber-300 text-sm">
                        Documents must contain redaction markers for granular clause-level impact analysis, 
                        redaction type classification, and integrity checking.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-gray-700/30 backdrop-blur-xl rounded-xl shadow-sm border border-gray-600 p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Enhanced Redaction Analysis History</h2>
            
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
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                          {analysis.redactionDetection.redactedSections} redactions
                        </span>
                        {analysis.redactionDetection.integrityCheck && (
                          <span className={`px-2 py-1 rounded text-xs ${analysis.redactionDetection.integrityCheck.consistencyScore >= 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {analysis.redactionDetection.integrityCheck.consistencyScore}% integrity
                          </span>
                        )}
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
                <p className="text-gray-400">No enhanced redaction analysis history found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}