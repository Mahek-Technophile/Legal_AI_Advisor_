import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Shield, AlertTriangle, CheckCircle, Loader2, Download, History, Trash2, RefreshCw, Info, Eye, EyeOff, AlertCircle, Target, Globe, Book, Newspaper, Scale, Clock, TrendingUp } from 'lucide-react';
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext';
import { redactionAnalysisService, RedactionAnalysisResult } from '../services/redactionAnalysis';
import { ReportExportService } from '../services/reportExport';

interface RedactionReviewPageProps {
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

export function RedactionReviewPage({ onBack, country }: RedactionReviewPageProps) {
  const { user } = useFirebaseAuth();
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<RedactionAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [documentContent, setDocumentContent] = useState<string>('');
  
  // Analysis History State
  const [analysisHistory, setAnalysisHistory] = useState<RedactionAnalysisResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<RedactionAnalysisResult | null>(null);

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
        message: 'Failed to check redaction analysis configuration'
      });
    }
  };

  const loadAnalysisHistory = async () => {
    setLoadingHistory(true);
    try {
      const history = await redactionAnalysisService.getAnalysisHistory(20);
      setAnalysisHistory(history);
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
      const success = await redactionAnalysisService.deleteAnalysis(id);
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

  const handleViewHistoryItem = (item: RedactionAnalysisResult) => {
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
    } catch (err: any) {
      setError(err.message);
      setUploadedFile(null);
      setDocumentContent('');
    }
  };

  const handleAnalyze = async () => {
    if (!uploadedFile || !documentContent) return;

    if (!configStatus?.configured) {
      setError('Redaction analysis is not configured. Please check your AI provider API keys in the environment variables.');
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
      setSelectedHistoryItem(null); // Clear history selection when new analysis is done
    } catch (err: any) {
      console.error('Redaction analysis error:', err);
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExportPDF = async () => {
    if (!analysisResult) return;
    
    try {
      // Convert RedactionAnalysisResult to DocumentAnalysisResult format for export
      const exportData = {
        ...analysisResult,
        keyFindings: analysisResult.visibleContentAnalysis.identifiedClauses.map(clause => ({
          category: clause.clauseType,
          finding: clause.content,
          severity: clause.redactionImpact === 'SEVERE' ? 'critical' as const : 
                   clause.redactionImpact === 'MODERATE' ? 'warning' as const : 'info' as const,
          affectedParty: 'both' as const,
          impact: `Redaction impact: ${clause.redactionImpact}`
        })),
        problematicClauses: analysisResult.granularClauseImpact?.map(impact => ({
          clause: impact.visibleContent,
          issue: impact.enforceabilityImpact.description,
          suggestion: impact.recommendations.join('; '),
          affectedParty: 'both' as const,
          severity: impact.enforceabilityImpact.level === 'CRITICAL' ? 'critical' as const :
                   impact.enforceabilityImpact.level === 'SEVERE' ? 'major' as const :
                   impact.enforceabilityImpact.level === 'MODERATE' ? 'moderate' as const : 'minor' as const
        })) || [],
        missingClauses: [],
        performanceMetrics: undefined,
        counterpartyAnalysis: undefined,
        nextSteps: {
          immediate: analysisResult.nextSteps || [],
          shortTerm: [],
          longTerm: []
        }
      };
      
      await ReportExportService.exportToPDF(exportData as any);
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export PDF. Please try again.');
    }
  };

  const handleExportJSON = async () => {
    if (!analysisResult) return;
    
    try {
      await ReportExportService.exportToJSON(analysisResult as any);
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export JSON. Please try again.');
    }
  };

  const handleExportHTML = async () => {
    if (!analysisResult) return;
    
    try {
      // Convert RedactionAnalysisResult to DocumentAnalysisResult format for export
      const exportData = {
        ...analysisResult,
        keyFindings: analysisResult.visibleContentAnalysis.identifiedClauses.map(clause => ({
          category: clause.clauseType,
          finding: clause.content,
          severity: clause.redactionImpact === 'SEVERE' ? 'critical' as const : 
                   clause.redactionImpact === 'MODERATE' ? 'warning' as const : 'info' as const,
          affectedParty: 'both' as const,
          impact: `Redaction impact: ${clause.redactionImpact}`
        })),
        problematicClauses: analysisResult.granularClauseImpact?.map(impact => ({
          clause: impact.visibleContent,
          issue: impact.enforceabilityImpact.description,
          suggestion: impact.recommendations.join('; '),
          affectedParty: 'both' as const,
          severity: impact.enforceabilityImpact.level === 'CRITICAL' ? 'critical' as const :
                   impact.enforceabilityImpact.level === 'SEVERE' ? 'major' as const :
                   impact.enforceabilityImpact.level === 'MODERATE' ? 'moderate' as const : 'minor' as const
        })) || [],
        missingClauses: [],
        performanceMetrics: undefined,
        counterpartyAnalysis: undefined,
        nextSteps: {
          immediate: analysisResult.nextSteps || [],
          shortTerm: [],
          longTerm: []
        }
      };
      
      await ReportExportService.exportToHTML(exportData as any);
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

  const getRedactionImpactColor = (impact: string) => {
    switch (impact) {
      case 'NONE': return 'text-emerald border-emerald/30 bg-emerald/10';
      case 'MINOR': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
      case 'MODERATE': return 'text-deep-bronze border-deep-bronze/30 bg-deep-bronze/10';
      case 'SEVERE': return 'text-legal-red border-legal-red/30 bg-legal-red/10';
      default: return 'text-cool-gray border-cool-gray/30 bg-cool-gray/10';
    }
  };

  const getEnforceabilityColor = (level: string) => {
    switch (level) {
      case 'NONE': return 'text-emerald border-emerald/30 bg-emerald/10';
      case 'MINOR': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
      case 'MODERATE': return 'text-deep-bronze border-deep-bronze/30 bg-deep-bronze/10';
      case 'SEVERE': return 'text-legal-red border-legal-red/30 bg-legal-red/10';
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
                <div className="bg-orange-100/20 p-2 rounded-lg backdrop-blur-sm">
                  <Shield className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white text-enhanced-contrast">Redaction Review</h1>
                  <p className="text-sm text-gray-300 text-enhanced-contrast">Analyze redacted legal documents</p>
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
      <div className="bg-orange-500/10 backdrop-blur-sm border-b border-orange-200/20 px-4 py-3 content-layer">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-orange-200 text-enhanced-contrast">Enhanced Redaction Analysis</h3>
              <p className="text-sm text-orange-300 mt-1 text-enhanced-contrast">
                Upload documents with redacted content for comprehensive analysis of visible information, 
                impact assessment of missing data, and enforceability evaluation with granular clause-level insights.
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
                { id: 'upload', label: 'Redaction Analysis', icon: Upload },
                { id: 'history', label: 'Analysis History', icon: History }
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors text-enhanced-contrast ${
                      activeTab === tab.id
                        ? 'border-orange-400 text-orange-400'
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
              <h2 className="text-xl font-semibold text-white mb-4 text-enhanced-contrast">Upload Redacted Document</h2>
              
              {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-sm">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-300 text-sm text-enhanced-contrast">{error}</p>
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors backdrop-blur-sm ${
                  dragActive ? 'border-orange-400/50 bg-orange-500/10' : 'border-white/20 bg-white/5'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-white mb-2 text-enhanced-contrast">
                  {uploadedFile ? uploadedFile.name : 'Drop your redacted legal document here'}
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
                      className="flex items-center space-x-2 text-orange-400 hover:text-orange-300 transition-colors"
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

                  <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg mt-4 backdrop-blur-sm">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-orange-400" />
                      <div>
                        <p className="font-medium text-orange-200 text-enhanced-contrast">{uploadedFile.name}</p>
                        <p className="text-sm text-orange-300 text-enhanced-contrast">
                          Ready for redaction analysis • {Math.round(uploadedFile.size / 1024)} KB
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
                      className="text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={handleAnalyze}
                      disabled={analyzing || !configStatus?.configured}
                      className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Analyzing Redactions...</span>
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4" />
                          <span>Analyze Redacted Document</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Analysis Results */}
            {analysisResult && (
              <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-sm border border-white/10 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white text-enhanced-contrast">
                    Redaction Analysis Results
                    {selectedHistoryItem && (
                      <span className="text-sm text-orange-400 ml-2">(From History)</span>
                    )}
                  </h2>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-300 text-enhanced-contrast">Export:</span>
                      <button
                        onClick={handleExportPDF}
                        className="text-orange-400 hover:text-orange-300 transition-colors text-sm"
                      >
                        PDF
                      </button>
                      <button
                        onClick={handleExportJSON}
                        className="text-orange-400 hover:text-orange-300 transition-colors text-sm"
                      >
                        JSON
                      </button>
                      <button
                        onClick={handleExportHTML}
                        className="text-orange-400 hover:text-orange-300 transition-colors text-sm"
                      >
                        HTML
                      </button>
                    </div>
                  </div>
                </div>

                {/* Redaction Detection */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Redaction Detection</h3>
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
                            className="bg-orange-500 h-2 rounded-full transition-all duration-500"
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

                {/* Redaction Statistics */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Redaction Statistics</h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Shield className="h-5 w-5 text-orange-400" />
                        <h4 className="font-medium text-orange-200 text-enhanced-contrast">Redacted Sections</h4>
                      </div>
                      <p className="text-2xl font-bold text-orange-400">{analysisResult.redactionDetection.redactedSections}</p>
                      <p className="text-sm text-orange-300 mt-1 text-enhanced-contrast">
                        Detected redactions in document
                      </p>
                    </div>
                    
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Eye className="h-5 w-5 text-blue-400" />
                        <h4 className="font-medium text-blue-200 text-enhanced-contrast">Visible Content</h4>
                      </div>
                      <p className="text-2xl font-bold text-blue-400">{analysisResult.redactionDetection.visibleContentPercentage}%</p>
                      <p className="text-sm text-blue-300 mt-1 text-enhanced-contrast">
                        Estimated visible document content
                      </p>
                    </div>
                    
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                        <h4 className="font-medium text-red-200 text-enhanced-contrast">Integrity Score</h4>
                      </div>
                      <p className="text-2xl font-bold text-red-400">{analysisResult.redactionDetection.integrityCheck.consistencyScore}%</p>
                      <p className="text-sm text-red-300 mt-1 text-enhanced-contrast">
                        Redaction pattern consistency
                      </p>
                    </div>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Executive Summary</h3>
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-gray-300 leading-relaxed text-enhanced-contrast">{analysisResult.summary}</p>
                  </div>
                </div>

                {/* Redaction Types */}
                {analysisResult.redactionDetection.redactionTypes.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Redaction Classification</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      {analysisResult.redactionDetection.redactionTypes.map((type, index) => (
                        <div key={index} className={`border rounded-lg p-4 ${
                          type.riskLevel === 'CRITICAL' ? 'bg-red-500/10 border-red-500/20' :
                          type.riskLevel === 'HIGH' ? 'bg-orange-500/10 border-orange-500/20' :
                          type.riskLevel === 'MEDIUM' ? 'bg-yellow-500/10 border-yellow-500/20' :
                          'bg-blue-500/10 border-blue-500/20'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-white text-enhanced-contrast capitalize">{type.type} Redactions</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              type.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-300' :
                              type.riskLevel === 'HIGH' ? 'bg-orange-500/20 text-orange-300' :
                              type.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-blue-500/20 text-blue-300'
                            }`}>
                              {type.riskLevel}
                            </span>
                          </div>
                          <p className="text-gray-300 mb-2 text-sm text-enhanced-contrast">{type.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400 text-enhanced-contrast">Count: {type.count}</span>
                            {type.examples.length > 0 && (
                              <div className="text-sm text-gray-400 text-enhanced-contrast">
                                Examples: {type.examples.slice(0, 2).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Redaction Integrity Issues */}
                {analysisResult.redactionDetection.integrityCheck.suspiciousPatterns.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Redaction Integrity Issues</h3>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                      <div className="space-y-4">
                        {analysisResult.redactionDetection.integrityCheck.suspiciousPatterns.length > 0 && (
                          <div>
                            <h4 className="font-medium text-red-200 mb-2 text-enhanced-contrast">Suspicious Patterns</h4>
                            <ul className="space-y-1">
                              {analysisResult.redactionDetection.integrityCheck.suspiciousPatterns.map((pattern, index) => (
                                <li key={index} className="text-sm text-red-300 flex items-start space-x-2 text-enhanced-contrast">
                                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <span>{pattern}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {analysisResult.redactionDetection.integrityCheck.incompleteness.length > 0 && (
                          <div>
                            <h4 className="font-medium text-red-200 mb-2 text-enhanced-contrast">Incompleteness Issues</h4>
                            <ul className="space-y-1">
                              {analysisResult.redactionDetection.integrityCheck.incompleteness.map((issue, index) => (
                                <li key={index} className="text-sm text-red-300 flex items-start space-x-2 text-enhanced-contrast">
                                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <span>{issue}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {analysisResult.redactionDetection.integrityCheck.recommendations.length > 0 && (
                          <div>
                            <h4 className="font-medium text-red-200 mb-2 text-enhanced-contrast">Integrity Recommendations</h4>
                            <ul className="space-y-1">
                              {analysisResult.redactionDetection.integrityCheck.recommendations.map((rec, index) => (
                                <li key={index} className="text-sm text-red-300 flex items-start space-x-2 text-enhanced-contrast">
                                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Visible Content Analysis */}
                {analysisResult.visibleContentAnalysis.identifiedClauses.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Visible Content Analysis</h3>
                    <div className="space-y-4">
                      {analysisResult.visibleContentAnalysis.identifiedClauses.map((clause, index) => (
                        <div key={index} className="bg-white/5 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-white text-enhanced-contrast">{clause.clauseType}</h4>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                clause.isComplete ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                              }`}>
                                {clause.isComplete ? 'COMPLETE' : 'INCOMPLETE'}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${getRedactionImpactColor(clause.redactionImpact)}`}>
                                {clause.redactionImpact}
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-300 mb-2 text-enhanced-contrast">{clause.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Granular Clause Impact */}
                {analysisResult.granularClauseImpact && analysisResult.granularClauseImpact.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Granular Clause Impact Analysis</h3>
                    <div className="space-y-6">
                      {analysisResult.granularClauseImpact.map((impact, index) => (
                        <div key={index} className="bg-white/5 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-medium text-white text-enhanced-contrast">{impact.clauseType}</h4>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${getEnforceabilityColor(impact.enforceabilityImpact.level)}`}>
                                {impact.enforceabilityImpact.level}
                              </span>
                              {impact.jurisdictionalUncertainty && (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-300">
                                  JURISDICTION UNCERTAIN
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-400 mb-1 text-enhanced-contrast">Visible Content:</p>
                              <p className="text-gray-300 text-enhanced-contrast">{impact.visibleContent}</p>
                            </div>
                            
                            {impact.redactedElements.length > 0 && (
                              <div>
                                <p className="text-sm text-gray-400 mb-1 text-enhanced-contrast">Redacted Elements:</p>
                                <ul className="space-y-1">
                                  {impact.redactedElements.map((element, elemIndex) => (
                                    <li key={elemIndex} className="text-sm text-gray-300 flex items-start space-x-2 text-enhanced-contrast">
                                      <span className="text-red-400">•</span>
                                      <span>{element}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div>
                              <p className="text-sm text-gray-400 mb-1 text-enhanced-contrast">Enforceability Impact:</p>
                              <p className="text-gray-300 text-enhanced-contrast">{impact.enforceabilityImpact.description}</p>
                              
                              {impact.enforceabilityImpact.specificRisks.length > 0 && (
                                <ul className="space-y-1 mt-2">
                                  {impact.enforceabilityImpact.specificRisks.map((risk, riskIndex) => (
                                    <li key={riskIndex} className="text-sm text-gray-300 flex items-start space-x-2 text-enhanced-contrast">
                                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-400" />
                                      <span>{risk}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            
                            {impact.missingCriticalTerms.length > 0 && (
                              <div>
                                <p className="text-sm text-gray-400 mb-1 text-enhanced-contrast">Missing Critical Terms:</p>
                                <ul className="space-y-1">
                                  {impact.missingCriticalTerms.map((term, termIndex) => (
                                    <li key={termIndex} className="text-sm text-gray-300 flex items-start space-x-2 text-enhanced-contrast">
                                      <span className="text-red-400">•</span>
                                      <span>{term}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {impact.recommendations.length > 0 && (
                              <div>
                                <p className="text-sm text-gray-400 mb-1 text-enhanced-contrast">Recommendations:</p>
                                <ul className="space-y-1">
                                  {impact.recommendations.map((rec, recIndex) => (
                                    <li key={recIndex} className="text-sm text-gray-300 flex items-start space-x-2 text-enhanced-contrast">
                                      <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-400" />
                                      <span>{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Impact Assessment */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Impact Assessment</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {analysisResult.impactAssessment.criticalGaps.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <h4 className="font-medium text-red-200 mb-3 text-enhanced-contrast">Critical Information Gaps</h4>
                        <ul className="space-y-2">
                          {analysisResult.impactAssessment.criticalGaps.map((gap, index) => (
                            <li key={index} className="text-sm text-red-300 flex items-start space-x-2 text-enhanced-contrast">
                              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{gap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisResult.impactAssessment.operationalRisks.length > 0 && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                        <h4 className="font-medium text-yellow-200 mb-3 text-enhanced-contrast">Operational Risks</h4>
                        <ul className="space-y-2">
                          {analysisResult.impactAssessment.operationalRisks.map((risk, index) => (
                            <li key={index} className="text-sm text-yellow-300 flex items-start space-x-2 text-enhanced-contrast">
                              <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisResult.impactAssessment.legalExposure.length > 0 && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <h4 className="font-medium text-blue-200 mb-3 text-enhanced-contrast">Legal Exposure</h4>
                        <ul className="space-y-2">
                          {analysisResult.impactAssessment.legalExposure.map((exposure, index) => (
                            <li key={index} className="text-sm text-blue-300 flex items-start space-x-2 text-enhanced-contrast">
                              <Scale className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{exposure}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisResult.impactAssessment.complianceRisks.length > 0 && (
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                        <h4 className="font-medium text-purple-200 mb-3 text-enhanced-contrast">Compliance Risks</h4>
                        <ul className="space-y-2">
                          {analysisResult.impactAssessment.complianceRisks.map((risk, index) => (
                            <li key={index} className="text-sm text-purple-300 flex items-start space-x-2 text-enhanced-contrast">
                              <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommendations */}
                {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Recommendations</h3>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <ul className="space-y-2">
                        {analysisResult.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-green-300 flex items-start space-x-2 text-enhanced-contrast">
                            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                {analysisResult.nextSteps && analysisResult.nextSteps.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 text-enhanced-contrast">Next Steps</h3>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <ol className="space-y-2">
                        {analysisResult.nextSteps.map((step, index) => (
                          <li key={index} className="text-sm text-blue-300 flex items-start space-x-2 text-enhanced-contrast">
                            <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{index + 1}. {step}</span>
                          </li>
                        ))}
                      </ol>
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
                            <Scale className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-400" />
                            <span>{citation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Limitation Notice */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-red-200 mb-1 text-enhanced-contrast">Analysis Limitations</h4>
                      <p className="text-sm text-red-300 text-enhanced-contrast">
                        {analysisResult.riskAssessment.limitationNotice}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                  <p className="text-sm text-gray-400 text-enhanced-contrast">
                    <strong>Disclaimer:</strong> This analysis is for informational purposes only and does not constitute legal advice. 
                    Please consult with a qualified attorney for specific legal matters in your jurisdiction.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8">
            {/* Analysis History */}
            <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-sm border border-white/10 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white text-enhanced-contrast">Redaction Analysis History</h2>
                <button
                  onClick={loadAnalysisHistory}
                  disabled={loadingHistory}
                  className="flex items-center space-x-2 text-orange-400 hover:text-orange-300 transition-colors"
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
                            <span>Redactions: {item.redactionDetection.redactedSections}</span>
                            <span>Visible: {item.redactionDetection.visibleContentPercentage}%</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleViewHistoryItem(item)}
                            className="text-orange-400 hover:text-orange-300 transition-colors text-sm px-3 py-1 rounded border border-orange-400/30 hover:border-orange-300/50"
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
                  <p className="text-gray-400 text-enhanced-contrast">No redaction analysis history found</p>
                  <p className="text-sm text-gray-500 mt-2 text-enhanced-contrast">
                    Upload and analyze redacted documents to see them here
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}