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
      gradient: 'from-sapphire-blue/20 to-regal-purple/20'
    },
    {
      id: 'legal-questions',
      title: 'Legal Questions',
      description: 'Get expert guidance on specific legal situations with statutory references and next steps',
      icon: MessageSquare,
      features: ['Statutory References', 'Case Law Examples', 'Action Plans', 'Time-Sensitive Alerts'],
      number: '02',
      gradient: 'from-emerald/20 to-sapphire-blue/20'
    },
    {
      id: 'deepsearch',
      title: 'DeepSearch',
      description: 'AI-powered legal research that finds relevant case law, statutes, and articles for your documents',
      icon: Search,
      features: ['Case Law References', 'Legal Statutes', 'Recent Articles', 'Jurisdiction-Specific Results'],
      number: '03',
      gradient: 'from-regal-purple/20 to-deep-bronze/20'
    },
    {
      id: 'redaction-review',
      title: 'Redaction Review',
      description: 'Analyze documents with redacted sections and assess impact of missing information',
      icon: Shield,
      features: ['Visible Content Analysis', 'Impact Assessment', 'Limitation Notices', 'Risk Evaluation'],
      number: '04',
      gradient: 'from-deep-bronze/20 to-legal-red/20'
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
    <div className="min-h-screen bg-midnight-navy text-off-white relative">
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
                onClick={handleBackToHome}
                className="flex items-center space-x-2 text-off-white hover:text-cool-gray transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Home</span>
              </button>
              <div className="h-6 w-px bg-sapphire-blue/30" />
              <div className="flex items-center space-x-3">
                <div className="bg-sapphire-blue/20 p-2 rounded-lg backdrop-blur-sm">
                  <Scale className="h-5 w-5 text-sapphire-blue" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-off-white">Legal Advisory Services</h1>
                  <p className="text-sm text-cool-gray">Professional legal analysis and guidance</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {selectedCountry && (
                <div className="flex items-center space-x-2 bg-charcoal-gray/50 backdrop-blur-sm px-3 py-1 rounded-full border border-sapphire-blue/20">
                  <Globe className="h-4 w-4 text-off-white" />
                  <span className="text-sm font-medium text-off-white">
                    {selectedCountryName}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-charcoal-gray/50 backdrop-blur-sm px-3 py-1 rounded-full border border-sapphire-blue/20">
                  <User className="h-4 w-4 text-off-white" />
                  <span className="text-sm font-medium text-off-white">
                    {profile?.displayName || user?.email?.split('@')[0] || 'User'}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 text-cool-gray hover:text-off-white px-3 py-2 rounded-lg hover:bg-charcoal-gray/50 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Legal Advisory
            <br />
            <span className="bg-gradient-to-r from-sapphire-blue to-regal-purple bg-clip-text text-transparent">Services</span>
          </h1>
          <p className="text-xl text-cool-gray max-w-2xl mx-auto">
            Specialized legal analysis based on {selectedCountryName} legal framework. 
            Choose the service that best fits your needs.
          </p>
          
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleChangeJurisdiction}
              className="bg-charcoal-gray/50 backdrop-blur-sm text-off-white px-6 py-2 rounded-lg hover:bg-charcoal-gray/70 transition-all font-medium border border-sapphire-blue/20"
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
                <div className={`bg-charcoal-gray/70 backdrop-blur-xl border border-sapphire-blue/20 rounded-xl p-8 hover:border-sapphire-blue/40 transition-all duration-500 bg-gradient-to-br ${service.gradient} relative overflow-hidden hover:bg-charcoal-gray/50`}>
                  <div className="flex items-start justify-between mb-6 relative z-10">
                    <div className="flex items-center space-x-4">
                      <span className="text-6xl font-bold text-sapphire-blue/20">{service.number}</span>
                      <div className="bg-sapphire-blue/20 p-3 rounded-lg">
                        <IconComponent className="h-6 w-6 text-sapphire-blue" />
                      </div>
                    </div>
                    <ChevronRight className="h-6 w-6 text-cool-gray group-hover:text-off-white group-hover:translate-x-1 transition-all" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-off-white mb-4">{service.title}</h3>
                  <p className="text-cool-gray mb-6 leading-relaxed">{service.description}</p>
                  
                  <div className="space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center text-sm text-cool-gray">
                        <CheckCircle className="h-4 w-4 text-sapphire-blue mr-3 flex-shrink-0" />
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
          <div className="bg-charcoal-gray/70 backdrop-blur-xl rounded-xl shadow-sm border border-sapphire-blue/20 p-8">
            <h3 className="text-2xl font-bold text-off-white mb-4">Need Help Choosing?</h3>
            <p className="text-cool-gray mb-6 max-w-2xl mx-auto">
              Not sure which service is right for your legal matter? Our AI can help guide you to the most 
              appropriate service based on your specific needs and jurisdiction.
            </p>
            <button
              onClick={() => handleServiceSelect('legal-questions')}
              className="bg-sapphire-blue text-off-white px-8 py-3 rounded-lg hover:bg-sapphire-blue/90 transition-all font-semibold"
            >
              Ask a Legal Question
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}