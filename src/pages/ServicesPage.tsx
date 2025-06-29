import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, FileText, MessageSquare, Shield, Search, ChevronRight, CheckCircle, ArrowLeft, Globe, User, LogOut } from 'lucide-react';
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext';
import { DocumentAnalysisPage } from './DocumentAnalysisPage';
import { LegalQuestionsPage } from './LegalQuestionsPage';
import { RedactionReviewPage } from './RedactionReviewPage';
import { DeepSearchPage } from './DeepSearchPage';

export function ServicesPage() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useFirebaseAuth();
  const [selectedCountry, setSelectedCountry] = useState('');
  const [currentService, setCurrentService] = useState<string | null>(null);

  const countries = [
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
  ];

  const services = [
    {
      id: 'document-analysis',
      title: 'Document Analysis',
      description: 'Upload contracts and legal documents for comprehensive risk assessment and clause analysis',
      icon: FileText,
      features: ['Risk Assessment', 'Clause Analysis', 'Missing Protections', 'Ambiguous Language'],
      number: '01',
      gradient: 'from-blue-500/20 to-purple-500/20'
    },
    {
      id: 'legal-questions',
      title: 'Legal Questions',
      description: 'Get expert guidance on specific legal situations with statutory references and next steps',
      icon: MessageSquare,
      features: ['Statutory References', 'Case Law Examples', 'Action Plans', 'Time-Sensitive Alerts'],
      number: '02',
      gradient: 'from-green-500/20 to-blue-500/20'
    },
    {
      id: 'deepsearch',
      title: 'DeepSearch',
      description: 'AI-powered legal research that finds relevant case law, statutes, and articles for your documents',
      icon: Search,
      features: ['Case Law References', 'Legal Statutes', 'Recent Articles', 'Jurisdiction-Specific Results'],
      number: '03',
      gradient: 'from-purple-500/20 to-pink-500/20'
    },
    {
      id: 'redaction-review',
      title: 'Redaction Review',
      description: 'Analyze documents with redacted sections and assess impact of missing information',
      icon: Shield,
      features: ['Visible Content Analysis', 'Impact Assessment', 'Limitation Notices', 'Risk Evaluation'],
      number: '04',
      gradient: 'from-orange-500/20 to-red-500/20'
    }
  ];

  // Load selected country from localStorage
  useEffect(() => {
    const savedCountry = localStorage.getItem('selectedCountry');
    if (savedCountry) {
      setSelectedCountry(savedCountry);
    } else {
      // Redirect to jurisdiction selection if no country is selected
      navigate('/jurisdiction-selection');
    }
  }, [navigate]);

  const handleServiceSelect = (serviceId: string) => {
    setCurrentService(serviceId);
  };

  const handleBackToServices = () => {
    setCurrentService(null);
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      localStorage.removeItem('selectedCountry');
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleChangeJurisdiction = () => {
    localStorage.removeItem('selectedCountry');
    navigate('/jurisdiction-selection');
  };

  const selectedCountryName = countries.find(c => c.code === selectedCountry)?.name || selectedCountry;

  // Render specific service page
  if (currentService) {
    switch (currentService) {
      case 'document-analysis':
        return <DocumentAnalysisPage onBack={handleBackToServices} country={selectedCountryName} />;
      case 'legal-questions':
        return <LegalQuestionsPage onBack={handleBackToServices} country={selectedCountryName} />;
      case 'deepsearch':
        return <DeepSearchPage onBack={handleBackToServices} country={selectedCountryName} />;
      case 'redaction-review':
        return <RedactionReviewPage onBack={handleBackToServices} country={selectedCountryName} />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-gray-800 text-white relative">
      {/* Header */}
      <div className="bg-gray-900/90 backdrop-blur-xl border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToHome}
                className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Home</span>
              </button>
              <div className="h-6 w-px bg-gray-600" />
              <div className="flex items-center space-x-3">
                <div className="bg-purple-600/20 p-2 rounded-lg backdrop-blur-sm">
                  <Scale className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">Legal Advisory Services</h1>
                  <p className="text-sm text-gray-300">Professional legal analysis and guidance</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {selectedCountry && (
                <div className="flex items-center space-x-2 bg-gray-700/50 backdrop-blur-sm px-3 py-1 rounded-full border border-gray-600">
                  <Globe className="h-4 w-4 text-white" />
                  <span className="text-sm font-medium text-white">
                    {selectedCountryName}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-gray-700/50 backdrop-blur-sm px-3 py-1 rounded-full border border-gray-600">
                  <User className="h-4 w-4 text-white" />
                  <span className="text-sm font-medium text-white">
                    {profile?.displayName || user?.email?.split('@')[0] || 'User'}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 text-gray-300 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-700/50 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Legal Advisory
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Services</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Specialized legal analysis based on {selectedCountryName} legal framework. 
            Choose the service that best fits your needs.
          </p>
          
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleChangeJurisdiction}
              className="bg-gray-700/50 backdrop-blur-sm text-white px-6 py-2 rounded-lg hover:bg-gray-600/50 transition-all font-medium border border-gray-600"
            >
              Change Jurisdiction
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <div
                key={service.id}
                className="group cursor-pointer"
                onClick={() => handleServiceSelect(service.id)}
              >
                <div className={`bg-gray-700/30 backdrop-blur-xl border border-gray-600 rounded-xl p-8 hover:border-gray-500 transition-all duration-500 bg-gradient-to-br ${service.gradient} relative overflow-hidden hover:bg-gray-600/30`}>
                  <div className="flex items-start justify-between mb-6 relative z-10">
                    <div className="flex items-center space-x-4">
                      <span className="text-6xl font-bold text-gray-500">{service.number}</span>
                      <div className="bg-gray-600/50 backdrop-blur-sm p-3 rounded-lg">
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4">{service.title}</h3>
                  <p className="text-gray-300 mb-6 leading-relaxed">{service.description}</p>
                  
                  <div className="space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center text-sm text-gray-300">
                        <CheckCircle className="h-4 w-4 text-white mr-3 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <div className="bg-gray-700/30 backdrop-blur-xl rounded-xl shadow-sm border border-gray-600 p-8">
            <h3 className="text-2xl font-bold text-white mb-4">Need Help Choosing?</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Not sure which service is right for your legal matter? Our AI can help guide you to the most 
              appropriate service based on your specific needs and jurisdiction.
            </p>
            <button
              onClick={() => handleServiceSelect('legal-questions')}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-all font-semibold"
            >
              Ask a Legal Question
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}