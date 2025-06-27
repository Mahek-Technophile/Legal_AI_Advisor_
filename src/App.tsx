import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Scale, Upload, MessageSquare, FileText, Shield, BookOpen, ChevronRight, Globe, Clock, CheckCircle, User, LogOut, AlertCircle, Menu, X, ArrowRight, Star, Zap, Target, Sparkles } from 'lucide-react';
import { FirebaseAuthProvider, useFirebaseAuth } from './contexts/FirebaseAuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { AIAuthModal } from './components/auth/AIAuthModal';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { UserProfile } from './components/profile/UserProfile';
import { useAuthGuard } from './hooks/useAuthGuard';
import { useSmoothScroll } from './hooks/useScrollPosition';
import { DocumentAnalysisPage } from './pages/DocumentAnalysisPage';
import { LegalQuestionsPage } from './pages/LegalQuestionsPage';
import { GeneralGuidancePage } from './pages/GeneralGuidancePage';
import { RedactionReviewPage } from './pages/RedactionReviewPage';

// Purple blob background component
function PurpleBlobBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Base dark background */}
      <div className="absolute inset-0 bg-gray-900"></div>
      
      {/* Animated purple blobs */}
      <div className="absolute inset-0">
        {/* Large blob 1 */}
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-purple-500 rounded-full opacity-80 blur-3xl animate-blob"></div>
        
        {/* Large blob 2 */}
        <div className="absolute top-[20%] right-[-10%] w-80 h-80 bg-purple-600 rounded-full opacity-70 blur-3xl animate-blob animation-delay-2000"></div>
        
        {/* Medium blob 3 */}
        <div className="absolute bottom-[10%] left-[20%] w-64 h-64 bg-purple-400 rounded-full opacity-60 blur-3xl animate-blob animation-delay-4000"></div>
        
        {/* Medium blob 4 */}
        <div className="absolute top-[60%] right-[30%] w-72 h-72 bg-purple-700 rounded-full opacity-50 blur-3xl animate-blob animation-delay-6000"></div>
        
        {/* Small blob 5 */}
        <div className="absolute bottom-[30%] right-[10%] w-48 h-48 bg-purple-500 rounded-full opacity-40 blur-2xl animate-blob animation-delay-8000"></div>
        
        {/* Small blob 6 */}
        <div className="absolute top-[40%] left-[10%] w-56 h-56 bg-purple-600 rounded-full opacity-45 blur-2xl animate-blob animation-delay-10000"></div>
        
        {/* Tiny floating blobs */}
        <div className="absolute top-[15%] left-[60%] w-24 h-24 bg-purple-400 rounded-full opacity-30 blur-xl animate-float"></div>
        <div className="absolute bottom-[50%] left-[80%] w-32 h-32 bg-purple-500 rounded-full opacity-25 blur-xl animate-float animation-delay-3000"></div>
        <div className="absolute top-[80%] left-[40%] w-20 h-20 bg-purple-600 rounded-full opacity-35 blur-xl animate-float animation-delay-5000"></div>
      </div>
      
      {/* Overlay gradient for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 via-transparent to-gray-900/30"></div>
    </div>
  );
}

// Auth callback component
function AuthCallback() {
  const navigate = useNavigate();
  const { user, loading } = useFirebaseAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/', { replace: true });
      } else {
        navigate('/?auth=failed', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <PurpleBlobBackground />
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full mb-4 animate-pulse">
            <Scale className="h-8 w-8 text-white" />
          </div>
          <p className="text-white">Completing authentication...</p>
        </div>
      </div>
    );
  }

  return null;
}

function AppContent() {
  const { user, profile, signOut, loading, isConfigured } = useFirebaseAuth();
  const { requireAuth, showAuthModal, authFeature, closeAuthModal } = useAuthGuard();
  const [selectedCountry, setSelectedCountry] = useState('');
  const [currentPage, setCurrentPage] = useState<'main' | 'document-analysis' | 'legal-questions' | 'general-guidance' | 'redaction-review'>('main');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showRegularAuthModal, setShowRegularAuthModal] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  const { scrollToTop } = useSmoothScroll();

  // Handle auth failure from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('auth') === 'failed') {
      setShowRegularAuthModal(true);
      setAuthMode('login');
      navigate('/', { replace: true });
    }
  }, [location, navigate]);

  // Restore user state from session
  useEffect(() => {
    const savedCountry = localStorage.getItem('selectedCountry');
    if (savedCountry && user) {
      setSelectedCountry(savedCountry);
    }
  }, [user]);

  // Save country selection
  useEffect(() => {
    if (selectedCountry && user) {
      localStorage.setItem('selectedCountry', selectedCountry);
    }
  }, [selectedCountry, user]);

  // Handle page transitions
  useEffect(() => {
    if (currentPage !== 'main') {
      scrollToTop(false);
    }
  }, [currentPage, scrollToTop]);

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
      id: 'general-guidance',
      title: 'General Guidance',
      description: 'Comprehensive legal advice for broader inquiries with jurisdiction-specific answers',
      icon: BookOpen,
      features: ['Plain Language', 'Step-by-Step Plans', 'Resource Links', 'Compliance Checklists'],
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

  const handleSignOut = async () => {
    try {
      await signOut();
      setSelectedCountry('');
      setCurrentPage('main');
      localStorage.removeItem('selectedCountry');
      navigate('/', { replace: true });
      scrollToTop(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const openAuthModal = (mode: 'login' | 'signup') => {
    if (!isConfigured) {
      alert('Please configure Firebase first by adding your Firebase credentials to the .env file.');
      return;
    }
    setAuthMode(mode);
    setShowRegularAuthModal(true);
  };

  const handleServiceSelect = async (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    const canAccess = await requireAuth(service?.title || 'AI analysis');
    
    if (canAccess) {
      setCurrentPage(serviceId as any);
    }
  };

  const handleCountrySelect = async () => {
    const canAccess = await requireAuth('jurisdiction selection');
    
    if (canAccess) {
      setShowCountryModal(true);
    }
  };

  const handleBackToMain = () => {
    setCurrentPage('main');
  };

  const closeRegularAuthModal = () => {
    setShowRegularAuthModal(false);
  };

  // Handle logo click to go to home page
  const handleLogoClick = () => {
    setCurrentPage('main');
    scrollToTop(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <PurpleBlobBackground />
        <div className="relative z-10 text-center animate-scale-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full mb-4 animate-glow">
            <Scale className="h-8 w-8 text-white animate-pulse" />
          </div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Render specific service pages
  if (currentPage !== 'main' && user && selectedCountry) {
    const selectedCountryName = countries.find(c => c.code === selectedCountry)?.name || selectedCountry;
    
    switch (currentPage) {
      case 'document-analysis':
        return <DocumentAnalysisPage onBack={handleBackToMain} country={selectedCountryName} />;
      case 'legal-questions':
        return <LegalQuestionsPage onBack={handleBackToMain} country={selectedCountryName} />;
      case 'general-guidance':
        return <GeneralGuidancePage onBack={handleBackToMain} country={selectedCountryName} />;
      case 'redaction-review':
        return <RedactionReviewPage onBack={handleBackToMain} country={selectedCountryName} />;
    }
  }

  return (
    <div className="min-h-screen relative text-white overflow-hidden">
      <PurpleBlobBackground />
      
      {/* Firebase Configuration Notice */}
      {!isConfigured && (
        <div className="relative z-20 bg-white/10 backdrop-blur-sm border-b border-white/20 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-white animate-pulse" />
              <p className="text-white text-sm">
                <strong>Demo Mode:</strong> Configure Firebase to enable user authentication with email, phone, and Google sign-in.
              </p>
            </div>
            <button
              onClick={() => window.open('https://console.firebase.google.com/', '_blank')}
              className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all text-sm font-medium"
            >
              Configure Firebase
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative z-20 bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Clickable Logo */}
            <button 
              onClick={handleLogoClick}
              className="flex items-center space-x-3 animate-slide-in-left hover:opacity-80 transition-opacity"
            >
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <Scale className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Legal AI Advisor</h1>
                <p className="text-xs text-white/70">Professional Legal Advisory</p>
              </div>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8 animate-fade-in">
              <a href="#services" className="text-white/80 hover:text-white transition-all text-sm font-medium">Services</a>
              <a href="#about" className="text-white/80 hover:text-white transition-all text-sm font-medium">About</a>
              <a href="#contact" className="text-white/80 hover:text-white transition-all text-sm font-medium">Contact</a>
            </nav>

            <div className="flex items-center space-x-4 animate-slide-in-right">
              {selectedCountry && user && (
                <div className="hidden md:flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                  <Globe className="h-4 w-4 text-white" />
                  <span className="text-sm font-medium text-white">
                    {countries.find(c => c.code === selectedCountry)?.name}
                  </span>
                </div>
              )}
              
              {user && isConfigured ? (
                <div className="hidden md:flex items-center space-x-3">
                  <button
                    onClick={() => setShowUserProfile(true)}
                    className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 px-3 py-2 rounded-lg transition-all border border-white/20"
                  >
                    <User className="h-4 w-4 text-white" />
                    <span className="text-sm font-medium text-white">
                      {profile?.displayName || user.email?.split('@')[0] || 'User'}
                    </span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center space-x-3">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-all font-medium"
                    disabled={!isConfigured}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all font-medium"
                    disabled={!isConfigured}
                  >
                    Sign Up
                  </button>
                </div>
              )}
              
              <button
                onClick={handleCountrySelect}
                className="bg-purple-500/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-purple-600/80 transition-all font-medium"
              >
                {selectedCountry ? 'Change Jurisdiction' : 'Select Country'}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-white hover:text-white/80 transition-all"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/10 backdrop-blur-xl border-t border-white/10">
            <div className="px-6 py-4 space-y-4">
              <a href="#services" className="block text-white/80 hover:text-white transition-all text-sm font-medium">Services</a>
              <a href="#about" className="block text-white/80 hover:text-white transition-all text-sm font-medium">About</a>
              <a href="#contact" className="block text-white/80 hover:text-white transition-all text-sm font-medium">Contact</a>
              
              {user && isConfigured ? (
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <button
                    onClick={() => setShowUserProfile(true)}
                    className="block w-full text-left text-white/80 hover:text-white transition-all text-sm"
                  >
                    Profile
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left text-white/80 hover:text-white transition-all text-sm"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="block w-full text-left text-white/80 hover:text-white transition-all text-sm"
                    disabled={!isConfigured}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="block w-full text-left text-white/80 hover:text-white transition-all text-sm"
                    disabled={!isConfigured}
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Country Selection Modal */}
      {showCountryModal && user && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-xl text-white rounded-xl border border-white/20 max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-4">Select Legal Jurisdiction</h2>
            <p className="text-white/70 mb-6">Choose your country to receive jurisdiction-specific legal guidance and analysis.</p>
            <div className="grid grid-cols-1 gap-3">
              {countries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => {
                    setSelectedCountry(country.code);
                    setShowCountryModal(false);
                  }}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-white/20 hover:border-white/40 hover:bg-white/10 transition-all text-left group"
                >
                  <span className="text-2xl">{country.flag}</span>
                  <span className="font-medium text-white">{country.name}</span>
                  <ChevronRight className="h-4 w-4 text-white/60 ml-auto group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCountryModal(false)}
              className="mt-4 w-full py-2 text-white/60 hover:text-white transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <main className="relative z-10 pt-20">
        {!selectedCountry || !user ? (
          <>
            {/* Hero Section */}
            <section className="min-h-screen flex items-center justify-center px-6 lg:px-8 relative">
              <div className="max-w-4xl mx-auto text-center animate-fade-in-up">
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8 animate-glow">
                    <Scale className="h-10 w-10 text-white" />
                  </div>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                  Professional
                  <br />
                  <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Legal AI</span>
                  <br />
                  Advisory
                </h1>
                
                <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
                  Advanced AI-powered legal analysis calibrated to your jurisdiction's legal framework. 
                  Get comprehensive document reviews, expert guidance, and statutory citations.
                </p>
                
                {!user && isConfigured && (
                  <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12">
                    <button
                      onClick={() => openAuthModal('signup')}
                      className="bg-purple-500/80 backdrop-blur-sm text-white px-8 py-4 rounded-lg hover:bg-purple-600/80 transition-all font-semibold group"
                    >
                      Get Started Free
                      <ArrowRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                      onClick={() => openAuthModal('login')}
                      className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-lg hover:bg-white/20 transition-all font-semibold border border-white/20"
                    >
                      Sign In
                    </button>
                  </div>
                )}
                
                <button
                  onClick={handleCountrySelect}
                  className="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-lg hover:bg-white/30 transition-all font-semibold group border border-white/20"
                >
                  Select Your Jurisdiction
                  <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </section>

            {/* Services Section */}
            <section id="services" className="py-32 px-6 lg:px-8 relative">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-20">
                  <h2 className="text-4xl md:text-6xl font-bold mb-6">
                    Legal Advisory
                    <br />
                    <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Services</span>
                  </h2>
                  <p className="text-xl text-white/80 max-w-2xl mx-auto">
                    Specialized legal analysis based on your jurisdiction's legal framework. 
                    Choose the service that best fits your needs.
                  </p>
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
                        <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 hover:border-white/30 transition-all duration-500 bg-gradient-to-br ${service.gradient} relative overflow-hidden hover:bg-white/10`}>
                          <div className="flex items-start justify-between mb-6 relative z-10">
                            <div className="flex items-center space-x-4">
                              <span className="text-6xl font-bold text-white/20">{service.number}</span>
                              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg">
                                <IconComponent className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <ChevronRight className="h-6 w-6 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
                          </div>
                          
                          <h3 className="text-2xl font-bold text-white mb-4">{service.title}</h3>
                          <p className="text-white/70 mb-6 leading-relaxed">{service.description}</p>
                          
                          <div className="space-y-2">
                            {service.features.map((feature, featureIndex) => (
                              <div key={featureIndex} className="flex items-center text-sm text-white/80">
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
              </div>
            </section>

            {/* Features Section */}
            <section id="about" className="py-32 px-6 lg:px-8 border-t border-white/10 relative">
              <div className="max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                  <div>
                    <h2 className="text-4xl md:text-6xl font-bold mb-8">
                      Why Choose
                      <br />
                      <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">LegalAI Pro</span>
                    </h2>
                    <p className="text-xl text-white/80 mb-12 leading-relaxed">
                      Our advanced AI platform provides comprehensive legal analysis with 
                      jurisdiction-specific insights, ensuring accuracy and relevance for your legal matters.
                    </p>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="flex items-start space-x-4 bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                      <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg flex-shrink-0">
                        <Shield className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">Secure & Confidential</h3>
                        <p className="text-white/70">End-to-end encryption with automatic document purging after analysis.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4 bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                      <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg flex-shrink-0">
                        <Zap className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">Instant Analysis</h3>
                        <p className="text-white/70">AI-powered review delivers comprehensive results in seconds, not hours.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4 bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                      <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg flex-shrink-0">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">Expert Knowledge</h3>
                        <p className="text-white/70">Trained on comprehensive legal databases with current statutory references.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-32 px-6 lg:px-8 border-t border-white/10 relative">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-4xl md:text-6xl font-bold mb-8">
                  Ready to Get
                  <br />
                  <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Started?</span>
                </h2>
                <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
                  Join thousands of legal professionals who trust LegalAI Pro for their document analysis and legal guidance needs.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                  {!user && isConfigured && (
                    <button
                      onClick={() => openAuthModal('signup')}
                      className="bg-purple-500/80 backdrop-blur-sm text-white px-8 py-4 rounded-lg hover:bg-purple-600/80 transition-all font-semibold group"
                    >
                      Start Free Trial
                      <ArrowRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      <Sparkles className="inline-block ml-1 h-4 w-4 animate-pulse" />
                    </button>
                  )}
                  
                  <button
                    onClick={handleCountrySelect}
                    className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-lg hover:bg-white/20 transition-all font-semibold border border-white/20"
                  >
                    Select Jurisdiction
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : (
          /* Services Dashboard */
          <section className="min-h-screen py-32 px-6 lg:px-8 relative">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-20">
                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                  Legal Advisory
                  <br />
                  <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Services</span>
                </h1>
                <p className="text-xl text-white/80 max-w-2xl mx-auto">
                  Specialized legal analysis based on {countries.find(c => c.code === selectedCountry)?.name} legal framework. 
                  Choose the service that best fits your needs.
                </p>
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
                      <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 hover:border-white/30 transition-all duration-500 bg-gradient-to-br ${service.gradient} relative overflow-hidden hover:bg-white/10`}>
                        <div className="flex items-start justify-between mb-6 relative z-10">
                          <div className="flex items-center space-x-4">
                            <span className="text-6xl font-bold text-white/20">{service.number}</span>
                            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg">
                              <IconComponent className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <ChevronRight className="h-6 w-6 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-white mb-4">{service.title}</h3>
                        <p className="text-white/70 mb-6 leading-relaxed">{service.description}</p>
                        
                        <div className="space-y-2">
                          {service.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex items-center text-sm text-white/80">
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
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Scale className="h-6 w-6 text-white" />
              <span className="text-xl font-bold text-white">Legal AI Advisor</span>
            </div>
            <p className="text-white/70 mb-8 max-w-2xl mx-auto">
              Professional legal advisory powered by advanced AI. This platform provides general legal information 
              and should not be considered as legal advice. Always consult with a qualified attorney for specific legal matters.
            </p>
            <div className="flex flex-wrap justify-center items-center space-x-6 text-sm text-white/60">
              <span>© 2025 LegalAI Pro</span>
              <span>•</span>
              <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-white transition-colors cursor-pointer">Contact Support</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Hidden reCAPTCHA container for phone auth */}
      <div id="recaptcha-container"></div>

      {/* Modals */}
      {isConfigured && (
        <>
          <AuthModal
            isOpen={showRegularAuthModal}
            onClose={closeRegularAuthModal}
            initialMode={authMode}
          />
          
          <AIAuthModal
            isOpen={showAuthModal}
            onClose={closeAuthModal}
            feature={authFeature}
          />
          
          <UserProfile
            isOpen={showUserProfile}
            onClose={() => setShowUserProfile(false)}
          />
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <FirebaseAuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </Router>
    </FirebaseAuthProvider>
  );
}