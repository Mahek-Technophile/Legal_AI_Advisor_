import React, { useState } from 'react';
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle, Loader2, Shield, AlertTriangle } from 'lucide-react';
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext';
import { ChatInterface } from '../components/chat/ChatInterface';
import { documentAnalysisService, DocumentAnalysisResult } from '../services/documentAnalysis';

interface DocumentAnalysisPageProps {
  onBack: () => void;
  country: string;
}

export function DocumentAnalysisPage({ onBack, country }: DocumentAnalysisPageProps) {
  const { user } = useFirebaseAuth();
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setUploadedFile(file);
        setError(null);
      }
    }
  };

  const validateFile = (file: File) => {
    const allowedTypes = ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a TXT, PDF, DOC, or DOCX file.');
      return false;
    }

    if (file.size > maxSize) {
      setError('File size must be less than 10MB.');
      return false;
    }

    return true;
  };

  const handleAnalyze = async () => {
    if (!uploadedFile) return;

    if (!documentAnalysisService.isConfigured()) {
      setError('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your environment variables.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Extract text from file
      const documentContent = await documentAnalysisService.extractTextFromFile(uploadedFile);
      
      // Analyze document
      const result = await documentAnalysisService.analyzeDocument({
        content: documentContent,
        jurisdiction: country,
        analysisType: 'comprehensive'
      });

      setAnalysisResult(result);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
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
                  <h1 className="text-lg font-semibold text-slate-900">Document Analysis</h1>
                  <p className="text-sm text-slate-500">AI-powered legal document review</p>
                </div>
              </div>
            </div>
            <div className="text-sm text-slate-500">
              Jurisdiction: {country}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Upload Document</h2>
              
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
                  {uploadedFile ? uploadedFile.name : 'Drop your legal document here'}
                </p>
                <p className="text-sm text-slate-500 mb-4">
                  Supports TXT, PDF, DOC, DOCX formats up to 10MB
                </p>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".txt,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Choose File
                </label>
              </div>

              {uploadedFile && (
                <div className="mt-6">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium text-green-900">{uploadedFile.name}</p>
                        <p className="text-sm text-green-700">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUploadedFile(null)}
                      className="text-green-600 hover:text-green-800 transition-colors"
                    >
                      Remove
                    </button>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center space-x-2"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Analyzing Document...</span>
                      </>
                    ) : (
                      <span>Analyze Document</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Analysis Features */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Analysis Features</h3>
              <div className="space-y-3">
                {[
                  'Comprehensive risk assessment',
                  'Ambiguous language identification',
                  'Missing protective clauses',
                  'Legal compliance check',
                  'Jurisdiction-specific analysis',
                  'Actionable recommendations'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-600">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {analysisResult ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Analysis Results</h2>
                
                {/* Risk Assessment */}
                <div className={`p-4 rounded-lg border mb-6 ${getRiskColor(analysisResult.riskAssessment.level)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Risk Assessment</h3>
                    <span className="font-bold">{analysisResult.riskAssessment.level}</span>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm">Risk Score:</span>
                    <div className="flex-1 bg-white rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-current" 
                        style={{ width: `${analysisResult.riskAssessment.score * 10}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{analysisResult.riskAssessment.score}/10</span>
                  </div>
                  <ul className="text-sm space-y-1">
                    {analysisResult.riskAssessment.factors.map((factor, index) => (
                      <li key={index}>• {factor}</li>
                    ))}
                  </ul>
                </div>

                {/* Summary */}
                <div className="mb-6">
                  <h3 className="font-semibold text-slate-900 mb-2">Summary</h3>
                  <p className="text-slate-700">{analysisResult.summary}</p>
                </div>

                {/* Key Findings */}
                {analysisResult.keyFindings.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-900 mb-3">Key Findings</h3>
                    <div className="space-y-3">
                      {analysisResult.keyFindings.map((finding, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                          {getSeverityIcon(finding.severity)}
                          <div>
                            <h4 className="font-medium text-slate-900">{finding.category}</h4>
                            <p className="text-sm text-slate-600">{finding.finding}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Problematic Clauses */}
                {analysisResult.problematicClauses.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-900 mb-3">Problematic Clauses</h3>
                    <div className="space-y-4">
                      {analysisResult.problematicClauses.map((clause, index) => (
                        <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                          <h4 className="font-medium text-red-900 mb-2">Issue Found</h4>
                          <p className="text-sm text-red-800 mb-2 italic">"{clause.clause}"</p>
                          <p className="text-sm text-red-700 mb-2"><strong>Problem:</strong> {clause.issue}</p>
                          <p className="text-sm text-red-700"><strong>Suggestion:</strong> {clause.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {analysisResult.recommendations.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-900 mb-3">Recommendations</h3>
                    <ul className="space-y-2">
                      {analysisResult.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-700 text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
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

                {/* Next Steps */}
                {analysisResult.nextSteps.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-900 mb-3">Next Steps</h3>
                    <ol className="space-y-2">
                      {analysisResult.nextSteps.map((step, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="bg-slate-900 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-slate-700 text-sm">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="flex space-x-3 pt-4 border-t border-slate-200">
                  <button className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                    Download Report
                  </button>
                  <button className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                    Share Results
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Analysis Results</h2>
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-2">
                    Upload a document to see detailed analysis results here
                  </p>
                  {!documentAnalysisService.isConfigured() && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 text-sm">
                        <strong>Setup Required:</strong> Add your OpenAI API key to enable document analysis.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chat Interface */}
            <ChatInterface
              context="document-analysis"
              placeholder="Ask questions about your document analysis..."
              systemPrompt={`You are a legal AI assistant specializing in document analysis for ${country} jurisdiction. Help users understand their document analysis results and provide additional legal guidance.`}
              country={country}
            />
          </div>
        </div>
      </div>
    </div>
  );
}