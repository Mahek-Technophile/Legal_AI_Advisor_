import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Download, Trash2, Eye, Clock, Shield, AlertTriangle } from 'lucide-react';
import { useAuthGuard } from '../hooks/useAuthGuard';
import { documentAnalysisService, DocumentAnalysisResult } from '../services/documentAnalysis';
import { ReportExportService } from '../services/reportExport';

interface UploadedFile {
  id: string;
  file: File;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  result?: DocumentAnalysisResult;
  error?: string;
  progress?: number;
}

const DocumentAnalysisPage: React.FC = () => {
  const { user, loading: authLoading } = useAuthGuard();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('federal');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const jurisdictions = [
    { value: 'federal', label: 'Federal' },
    { value: 'california', label: 'California' },
    { value: 'new-york', label: 'New York' },
    { value: 'texas', label: 'Texas' },
    { value: 'florida', label: 'Florida' },
    { value: 'illinois', label: 'Illinois' }
  ];

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFiles(selectedFiles);
  }, []);

  const handleFiles = useCallback((newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      const validTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      return validTypes.includes(file.type) && file.size <= maxSize;
    });

    const uploadedFiles: UploadedFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...uploadedFiles]);
  }, []);

  const handleAnalyze = async (fileId: string) => {
    const fileIndex = files.findIndex(f => f.id === fileId);
    if (fileIndex === -1) return;

    const file = files[fileIndex];

    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'analyzing', progress: 0 } : f
    ));

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => 
          f.id === fileId && f.status === 'analyzing' 
            ? { ...f, progress: Math.min((f.progress || 0) + Math.random() * 20, 90) }
            : f
        ));
      }, 500);

      // Extract text content from the file
      const content = await documentAnalysisService.extractTextFromFile(file.file);
      
      // Construct the analysis request
      const analysisRequest = {
        content,
        fileName: file.file.name,
        fileType: file.file.type,
        fileSize: file.file.size,
        jurisdiction: selectedJurisdiction,
        userId: user?.id || ''
      };

      // Perform the analysis
      const result = await documentAnalysisService.analyzeDocument(analysisRequest);
      
      clearInterval(progressInterval);
      
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'completed', result, progress: 100 }
          : f
      ));
    } catch (error) {
      console.error('Analysis error:', error);
      
      // Check if this is the specific AI provider error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const isAIProviderError = errorMessage.includes('All configured AI providers failed') || 
                               errorMessage.includes('No AI providers configured') ||
                               errorMessage.includes('Rate limit exceeded') ||
                               errorMessage.includes('API error');
      
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { 
              ...f, 
              status: 'error', 
              error: isAIProviderError ? 'Analysis temporarily unavailable. Please try again.' : errorMessage,
              progress: 0 
            }
          : f
      ));
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleExportReport = async (file: UploadedFile) => {
    if (!file.result) return;
    
    try {
      await ReportExportService.exportToPDF(file.result);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return <CheckCircle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertCircle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Document Analysis
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Upload your legal documents for comprehensive AI-powered analysis. 
              Get insights on compliance, risks, and recommendations.
            </p>
          </div>

          {/* Jurisdiction Selection */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Jurisdiction</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {jurisdictions.map((jurisdiction) => (
                <button
                  key={jurisdiction.value}
                  onClick={() => setSelectedJurisdiction(jurisdiction.value)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    selectedJurisdiction === jurisdiction.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {jurisdiction.label}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Area */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors duration-200 ${
                dragActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Upload Documents
              </h3>
              <p className="text-gray-600 mb-6">
                Drag and drop files here, or click to select files
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Choose Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileInput}
                className="hidden"
              />
              <p className="text-sm text-gray-500 mt-4">
                Supported formats: PDF, TXT, DOC, DOCX (Max 10MB each)
              </p>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Documents</h2>
              <div className="space-y-4">
                {files.map((file) => (
                  <div key={file.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-8 h-8 text-blue-600" />
                        <div>
                          <h3 className="font-medium text-gray-900">{file.file.name}</h3>
                          <p className="text-sm text-gray-500">
                            {(file.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {file.status === 'pending' && (
                          <button
                            onClick={() => handleAnalyze(file.id)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                          >
                            Analyze
                          </button>
                        )}
                        {file.status === 'completed' && file.result && (
                          <>
                            <button
                              onClick={() => handleExportReport(file)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2"
                            >
                              <Download className="w-4 h-4" />
                              <span>Export</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleRemoveFile(file.id)}
                          className="text-red-600 hover:text-red-700 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="mb-3">
                      {file.status === 'analyzing' && (
                        <div className="flex items-center space-x-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm text-blue-600">Analyzing...</span>
                          {file.progress !== undefined && (
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${file.progress}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      )}
                      {file.status === 'completed' && (
                        <div className="flex items-center space-x-2 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Analysis completed</span>
                        </div>
                      )}
                      {file.status === 'error' && (
                        <div className="flex items-center space-x-2 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">{file.error}</span>
                        </div>
                      )}
                    </div>

                    {/* Analysis Results */}
                    {file.result && (
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <Shield className="w-5 h-5 text-blue-600" />
                              <span className="font-medium text-gray-900">Risk Level</span>
                            </div>
                            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(file.result.riskLevel)}`}>
                              {getRiskIcon(file.result.riskLevel)}
                              <span className="capitalize">{file.result.riskLevel}</span>
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <AlertTriangle className="w-5 h-5 text-orange-600" />
                              <span className="font-medium text-gray-900">Risk Score</span>
                            </div>
                            <span className="text-2xl font-bold text-gray-900">
                              {file.result.riskScore}/100
                            </span>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <Clock className="w-5 h-5 text-green-600" />
                              <span className="font-medium text-gray-900">Analyzed</span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {new Date().toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Key Findings */}
                        {file.result.keyFindings && file.result.keyFindings.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-900 mb-2">Key Findings</h4>
                            <ul className="space-y-1">
                              {file.result.keyFindings.map((finding, index) => (
                                <li key={index} className="text-sm text-gray-700 flex items-start space-x-2">
                                  <span className="text-blue-600 mt-1">•</span>
                                  <span>{finding}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommendations */}
                        {file.result.recommendations && file.result.recommendations.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                            <ul className="space-y-1">
                              {file.result.recommendations.map((recommendation, index) => (
                                <li key={index} className="text-sm text-gray-700 flex items-start space-x-2">
                                  <span className="text-green-600 mt-1">•</span>
                                  <span>{recommendation}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentAnalysisPage;